"use client";
import { useState, useMemo } from "react";
import { Plus, Loader2, Trash2, Calendar } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, T_SURFACE, T_SURFACE2, T_SHADOW } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Exam":             { bg: "rgba(220,38,38,0.08)",   text: "#dc2626", border: "rgba(220,38,38,0.25)" },
  "Parents Evening":  { bg: "rgba(124,58,237,0.08)",  text: "#7c3aed", border: "rgba(124,58,237,0.25)" },
  "INSET Day":        { bg: "rgba(37,99,235,0.08)",   text: "#2563eb", border: "rgba(37,99,235,0.25)" },
  "Assembly":         { bg: "rgba(22,163,74,0.08)",   text: "#16a34a", border: "rgba(22,163,74,0.25)" },
  "Trip":             { bg: "rgba(234,88,12,0.08)",   text: "#ea580c", border: "rgba(234,88,12,0.25)" },
  "Deadline":         { bg: "rgba(220,38,38,0.08)",   text: "#dc2626", border: "rgba(220,38,38,0.25)" },
  "Meeting":          { bg: "rgba(100,116,139,0.08)", text: "#64748b", border: "rgba(100,116,139,0.25)" },
  "Other":            { bg: "rgba(100,116,139,0.05)", text: "#64748b", border: "rgba(100,116,139,0.20)" },
};

const EVENT_TYPES = ["Exam", "Parents Evening", "INSET Day", "Assembly", "Trip", "Deadline", "Meeting", "Other"];
const YEAR_GROUPS = ["All", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13"];

function asText(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map((v) =>
    typeof v === "object" && v !== null && "plain_text" in v
      ? String((v as { plain_text: string }).plain_text) : String(v)
  ).join("");
  return String(val);
}

function daysUntil(dateStr: string): number {
  const now  = new Date(); now.setHours(0, 0, 0, 0);
  const then = new Date(dateStr);
  return Math.round((then.getTime() - now.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function TeacherKeyDates({
  db,
  onRowAdded,
  onRowDeleted,
}: {
  db: WorkspaceDatabase | null;
  onRowAdded:   (row: WorkspaceRow) => void;
  onRowDeleted: (pageId: string) => void;
}) {
  const [filterType,   setFilterType]   = useState("");
  const [showPast,     setShowPast]     = useState(false);

  const [adding,       setAdding]       = useState(false);
  const [newTitle,     setNewTitle]     = useState("");
  const [newDate,      setNewDate]      = useState("");
  const [newType,      setNewType]      = useState("Exam");
  const [newYearGroup, setNewYearGroup] = useState("All");
  const [newNotes,     setNewNotes]     = useState("");
  const [saving,       setSaving]       = useState(false);

  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const rows = db?.rows ?? [];

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const d = asText(r.properties["Date"]);
      if (!showPast && d && daysUntil(d) < 0) return false;
      if (filterType && asText(r.properties["Type"]) !== filterType) return false;
      return true;
    });
  }, [rows, filterType, showPast]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ad = asText(a.properties["Date"]);
      const bd = asText(b.properties["Date"]);
      if (!ad && !bd) return 0;
      if (!ad) return 1;
      if (!bd) return -1;
      return ad.localeCompare(bd);
    });
  }, [filtered]);

  // Group by "Upcoming (next 14 days)", "This term", "Future", "Past"
  const { upcoming, later, past } = useMemo(() => {
    const upcoming: WorkspaceRow[] = [];
    const later:    WorkspaceRow[] = [];
    const past:     WorkspaceRow[] = [];
    for (const r of sorted) {
      const d = asText(r.properties["Date"]);
      if (!d) { later.push(r); continue; }
      const days = daysUntil(d);
      if (days < 0)    past.push(r);
      else if (days <= 14) upcoming.push(r);
      else             later.push(r);
    }
    return { upcoming, later, past };
  }, [sorted]);

  async function addDate() {
    if (!db || !newTitle.trim() || !newDate) return;
    setSaving(true);
    try {
      const properties    = { Title: newTitle.trim(), Date: newDate, Type: newType, "Year Group": newYearGroup, Notes: newNotes.trim() };
      const propertyTypes = { Title: "title", Date: "date", Type: "select", "Year Group": "select", Notes: "rich_text" };
      const res = await fetch("/api/members/workspace", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: db.notionId, properties, propertyTypes }),
      });
      const data = await res.json() as { pageId?: string };
      if (data.pageId) {
        onRowAdded({ pageId: data.pageId, properties });
        setNewTitle(""); setNewDate(""); setNewNotes(""); setAdding(false);
      }
    } finally { setSaving(false); }
  }

  async function deleteDate(row: WorkspaceRow) {
    setDeleting((p) => new Set([...p, row.pageId]));
    try {
      await fetch(`/api/members/workspace/${row.pageId}`, { method: "DELETE" });
      onRowDeleted(row.pageId);
    } finally { setDeleting((p) => { const n = new Set(p); n.delete(row.pageId); return n; }); }
  }

  function DateRow({ row, isPast }: { row: WorkspaceRow; isPast?: boolean }) {
    const title     = asText(row.properties["Title"]);
    const date      = asText(row.properties["Date"]);
    const type      = asText(row.properties["Type"]);
    const yearGroup = asText(row.properties["Year Group"]);
    const typeStyle = TYPE_COLORS[type] ?? TYPE_COLORS["Other"]!;
    const days      = date ? daysUntil(date) : null;
    const isToday   = days === 0;
    const isSoon    = days !== null && days > 0 && days <= 3;

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: `1px solid ${N_BORDER}`, opacity: isPast ? 0.5 : 1 }}>
        {/* Date badge */}
        <div style={{ flexShrink: 0, width: "52px", textAlign: "center", padding: "6px 4px", borderRadius: "8px", background: isToday ? ACCENT_LIGHT : T_SURFACE2, border: `1px solid ${isToday ? ACCENT_BORDER : N_BORDER}` }}>
          {date ? <>
            <div style={{ fontSize: "18px", fontWeight: 800, color: isToday ? ACCENT_TEXT : N_FG, lineHeight: 1 }}>
              {new Date(date).getDate()}
            </div>
            <div style={{ fontSize: "10px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {new Date(date).toLocaleDateString("en-GB", { month: "short" })}
            </div>
          </> : <Calendar size={18} color={N_MUTED} />}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: N_FG }}>{title}</span>
            {isToday && <span style={{ fontSize: "10px", fontWeight: 800, color: ACCENT_TEXT, background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, padding: "1px 6px", borderRadius: "99px" }}>TODAY</span>}
            {isSoon && !isToday && <span style={{ fontSize: "10px", fontWeight: 700, color: "#b45309", background: "rgba(202,138,4,0.08)", border: "1px solid rgba(202,138,4,0.25)", padding: "1px 6px", borderRadius: "99px" }}>IN {days} DAYS</span>}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "3px", flexWrap: "wrap", alignItems: "center" }}>
            {date && <span style={{ fontSize: "11px", color: N_MUTED }}>{formatDate(date)}</span>}
            {yearGroup && yearGroup !== "All" && <span style={{ fontSize: "11px", color: N_MUTED }}>{yearGroup}</span>}
          </div>
        </div>

        {/* Type badge */}
        {type && (
          <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", background: typeStyle.bg, color: typeStyle.text, border: `1px solid ${typeStyle.border}`, flexShrink: 0 }}>
            {type}
          </span>
        )}

        {/* Delete */}
        <button type="button" onClick={() => deleteDate(row)} disabled={deleting.has(row.pageId)}
          style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: N_MUTED, padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center" }}>
          {deleting.has(row.pageId) ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
        </button>
      </div>
    );
  }

  if (!db) return <div style={{ padding: "32px", textAlign: "center", fontFamily: N_FONT, color: N_MUTED, fontSize: "14px" }}>Key dates database not found. Re-open workspace to provision it.</div>;

  return (
    <div style={{ fontFamily: N_FONT, display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>Key Dates</h2>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
            {upcoming.length} upcoming · {rows.length} total
          </p>
        </div>
        <button onClick={() => setAdding((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", background: adding ? T_SURFACE2 : ACCENT_LIGHT, border: `1px solid ${adding ? N_BORDER_MED : ACCENT_BORDER}`, color: adding ? N_MUTED : ACCENT_TEXT, fontWeight: 600, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT }}>
          <Plus size={14} /> Add Date
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ padding: "16px", borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px" }}>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addDate(); if (e.key === "Escape") setAdding(false); }}
              placeholder="Event title…" autoFocus
              style={{ padding: "9px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }} />
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <select value={newType} onChange={(e) => setNewType(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, background: T_SURFACE2 }}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={newYearGroup} onChange={(e) => setNewYearGroup(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, background: T_SURFACE2 }}>
              {YEAR_GROUPS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Notes (optional)"
              style={{ padding: "8px 10px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }} />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={addDate} disabled={saving || !newTitle.trim() || !newDate}
              style={{ padding: "8px 20px", borderRadius: "8px", background: ACCENT, border: "none", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT, opacity: saving || !newTitle.trim() || !newDate ? 0.6 : 1 }}>
              {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "Add"}
            </button>
            <button onClick={() => setAdding(false)}
              style={{ padding: "8px 12px", borderRadius: "8px", background: T_SURFACE2, border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT, color: N_MUTED }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "12px", fontFamily: N_FONT, background: T_SURFACE2 }}>
          <option value="">All types</option>
          {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: N_MUTED, cursor: "pointer" }}>
          <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
          Show past dates
        </label>
      </div>

      {/* Date list */}
      {rows.length === 0 ? (
        <div style={{ padding: "32px", textAlign: "center", borderRadius: "12px", border: `1px dashed ${N_BORDER_MED}` }}>
          <p style={{ margin: 0, fontSize: "14px", color: N_MUTED }}>No key dates yet — add one above.</p>
        </div>
      ) : (
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: T_SURFACE, overflow: "hidden", boxShadow: T_SHADOW }}>
          {upcoming.length > 0 && (
            <>
              <div style={{ padding: "8px 16px", background: ACCENT_LIGHT, borderBottom: `1px solid ${ACCENT_BORDER}` }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: ACCENT_TEXT, textTransform: "uppercase", letterSpacing: "0.08em" }}>Next 14 days</span>
              </div>
              {upcoming.map((r) => <DateRow key={r.pageId} row={r} />)}
            </>
          )}
          {later.length > 0 && (
            <>
              <div style={{ padding: "8px 16px", background: T_SURFACE2, borderBottom: `1px solid ${N_BORDER_MED}` }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>Upcoming</span>
              </div>
              {later.map((r) => <DateRow key={r.pageId} row={r} />)}
            </>
          )}
          {showPast && past.length > 0 && (
            <>
              <div style={{ padding: "8px 16px", background: T_SURFACE2, borderBottom: `1px solid ${N_BORDER_MED}` }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>Past</span>
              </div>
              {past.map((r) => <DateRow key={r.pageId} row={r} isPast />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
