"use client";
import { useState, useMemo } from "react";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "High":   { bg: "rgba(220,38,38,0.08)",  text: "#dc2626", border: "rgba(220,38,38,0.25)" },
  "Medium": { bg: "rgba(202,138,4,0.08)",  text: "#b45309", border: "rgba(202,138,4,0.25)" },
  "Low":    { bg: "rgba(100,116,139,0.08)", text: "#64748b", border: "rgba(100,116,139,0.25)" },
};

const SUBJECTS = ["", "English", "Maths", "Science", "History", "Geography", "Art", "PE", "Music", "Computing", "Languages", "PSHE", "Admin", "Other"];
const PRIORITIES = ["High", "Medium", "Low"];

function asText(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "boolean") return val ? "true" : "false";
  if (Array.isArray(val)) return val.map((v) =>
    typeof v === "object" && v !== null && "plain_text" in v
      ? String((v as { plain_text: string }).plain_text) : String(v)
  ).join("");
  return String(val);
}

function asBool(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (val === "true") return true;
  return false;
}

export function TeacherTasks({
  db,
  onRowAdded,
  onRowUpdated,
  onRowDeleted,
}: {
  db: WorkspaceDatabase | null;
  onRowAdded:   (row: WorkspaceRow) => void;
  onRowUpdated: (pageId: string, name: string, val: string | number | boolean | null) => void;
  onRowDeleted: (pageId: string) => void;
}) {
  const [filterSubject,  setFilterSubject]  = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showDone,       setShowDone]       = useState(false);

  // Add form
  const [adding,    setAdding]    = useState(false);
  const [newTitle,  setNewTitle]  = useState("");
  const [newSubject,setNewSubject]= useState("");
  const [newPrio,   setNewPrio]   = useState("Medium");
  const [newDue,    setNewDue]    = useState("");
  const [saving,    setSaving]    = useState(false);

  // Toggling done
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const rows = db?.rows ?? [];

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const done = asBool(r.properties["Done"]);
      if (!showDone && done) return false;
      if (filterSubject  && asText(r.properties["Subject"])  !== filterSubject)  return false;
      if (filterPriority && asText(r.properties["Priority"]) !== filterPriority) return false;
      return true;
    });
  }, [rows, filterSubject, filterPriority, showDone]);

  // Sort: incomplete first, then by priority, then by due date
  const sorted = useMemo(() => {
    const prioOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    return [...filtered].sort((a, b) => {
      const aDone = asBool(a.properties["Done"]) ? 1 : 0;
      const bDone = asBool(b.properties["Done"]) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const ap = prioOrder[asText(a.properties["Priority"])] ?? 1;
      const bp = prioOrder[asText(b.properties["Priority"])] ?? 1;
      if (ap !== bp) return ap - bp;
      const ad = asText(a.properties["Due Date"]);
      const bd = asText(b.properties["Due Date"]);
      if (ad && bd) return ad.localeCompare(bd);
      return 0;
    });
  }, [filtered]);

  async function addTask() {
    if (!db || !newTitle.trim()) return;
    setSaving(true);
    try {
      const properties    = { Title: newTitle.trim(), Subject: newSubject, Priority: newPrio, "Due Date": newDue, Done: false };
      const propertyTypes = { Title: "title", Subject: "select", Priority: "select", "Due Date": "date", Done: "checkbox" };
      const res = await fetch("/api/members/workspace", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: db.notionId, properties, propertyTypes }),
      });
      const data = await res.json() as { pageId?: string };
      if (data.pageId) {
        onRowAdded({ pageId: data.pageId, properties });
        setNewTitle(""); setNewDue(""); setAdding(false);
      }
    } finally { setSaving(false); }
  }

  async function toggleDone(row: WorkspaceRow) {
    const current = asBool(row.properties["Done"]);
    setToggling((p) => new Set([...p, row.pageId]));
    try {
      await fetch(`/api/members/workspace/${row.pageId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ properties: { Done: !current }, propertyTypes: { Done: "checkbox" } }),
      });
      onRowUpdated(row.pageId, "Done", !current);
    } finally { setToggling((p) => { const n = new Set(p); n.delete(row.pageId); return n; }); }
  }

  async function deleteTask(row: WorkspaceRow) {
    setDeleting((p) => new Set([...p, row.pageId]));
    try {
      await fetch(`/api/members/workspace/${row.pageId}`, { method: "DELETE" });
      onRowDeleted(row.pageId);
    } finally { setDeleting((p) => { const n = new Set(p); n.delete(row.pageId); return n; }); }
  }

  const doneCount   = rows.filter((r) => asBool(r.properties["Done"])).length;
  const activeCount = rows.length - doneCount;

  if (!db) return <div style={{ padding: "32px", textAlign: "center", fontFamily: N_FONT, color: N_MUTED, fontSize: "14px" }}>Tasks database not found. Re-open workspace to provision it.</div>;

  return (
    <div style={{ fontFamily: N_FONT, display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>Tasks</h2>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
            {activeCount} active · {doneCount} done
          </p>
        </div>
        <button onClick={() => setAdding((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", background: adding ? "white" : ACCENT_LIGHT, border: `1px solid ${adding ? N_BORDER_MED : ACCENT_BORDER}`, color: adding ? N_MUTED : ACCENT_TEXT, fontWeight: 600, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT }}>
          <Plus size={14} /> Add Task
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ padding: "16px", borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTask(); if (e.key === "Escape") setAdding(false); }}
                placeholder="Task name…" autoFocus
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, boxSizing: "border-box" }} />
            </div>
            <select value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, background: "white" }}>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s || "Subject…"}</option>)}
            </select>
            <select value={newPrio} onChange={(e) => setNewPrio(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, background: "white" }}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }} />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={addTask} disabled={saving || !newTitle.trim()}
                style={{ flex: 1, padding: "8px", borderRadius: "8px", background: ACCENT, border: "none", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT, opacity: saving || !newTitle.trim() ? 0.6 : 1 }}>
                {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "Add"}
              </button>
              <button onClick={() => setAdding(false)}
                style={{ padding: "8px 12px", borderRadius: "8px", background: "white", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT, color: N_MUTED }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "12px", fontFamily: N_FONT, background: "white" }}>
          <option value="">All subjects</option>
          {SUBJECTS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "12px", fontFamily: N_FONT, background: "white" }}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: N_MUTED, cursor: "pointer" }}>
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          Show completed
        </label>
        <span style={{ marginLeft: "auto", fontSize: "12px", color: N_MUTED }}>{sorted.length} task{sorted.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Task list */}
      {sorted.length === 0 ? (
        <div style={{ padding: "32px", textAlign: "center", borderRadius: "12px", border: `1px dashed ${N_BORDER_MED}` }}>
          <p style={{ margin: 0, fontSize: "14px", color: N_MUTED }}>
            {rows.length === 0 ? "No tasks yet — add one above." : "No tasks match your filters."}
          </p>
        </div>
      ) : (
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          {sorted.map((row, i) => {
            const done     = asBool(row.properties["Done"]);
            const title    = asText(row.properties["Title"]);
            const subject  = asText(row.properties["Subject"]);
            const priority = asText(row.properties["Priority"]);
            const due      = asText(row.properties["Due Date"]);
            const prioStyle = PRIORITY_COLORS[priority];
            const isOverdue = due && !done && new Date(due) < new Date();

            return (
              <div key={row.pageId} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: i < sorted.length - 1 ? `1px solid ${N_BORDER}` : "none", opacity: done ? 0.55 : 1, transition: "opacity 0.2s" }}>
                {/* Checkbox */}
                <button type="button" onClick={() => toggleDone(row)} disabled={toggling.has(row.pageId)}
                  style={{ flexShrink: 0, width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${done ? ACCENT : N_BORDER_MED}`, background: done ? ACCENT : "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                  {toggling.has(row.pageId)
                    ? <Loader2 size={10} style={{ animation: "spin 1s linear infinite", color: ACCENT }} />
                    : done ? <span style={{ color: "white", fontSize: "11px", fontWeight: 900 }}>✓</span> : null}
                </button>

                {/* Title + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: N_FG, textDecoration: done ? "line-through" : "none" }}>{title}</span>
                  <div style={{ display: "flex", gap: "8px", marginTop: "3px", flexWrap: "wrap" }}>
                    {subject && <span style={{ fontSize: "11px", color: N_MUTED }}>{subject}</span>}
                    {due && (
                      <span style={{ fontSize: "11px", color: isOverdue ? "#dc2626" : N_MUTED, fontWeight: isOverdue ? 700 : 400 }}>
                        {isOverdue ? "⚠ " : ""}Due {due}
                      </span>
                    )}
                  </div>
                </div>

                {/* Priority badge */}
                {priority && prioStyle && (
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", background: prioStyle.bg, color: prioStyle.text, border: `1px solid ${prioStyle.border}`, flexShrink: 0 }}>
                    {priority}
                  </span>
                )}

                {/* Delete */}
                <button type="button" onClick={() => deleteTask(row)} disabled={deleting.has(row.pageId)}
                  style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: N_MUTED, padding: "4px", borderRadius: "4px", display: "flex", alignItems: "center" }}>
                  {deleting.has(row.pageId) ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
