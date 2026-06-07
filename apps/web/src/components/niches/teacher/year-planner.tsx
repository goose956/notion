"use client";

import { useState, useCallback, useRef } from "react";
import { Sparkles, Loader2, Plus, X, ChevronDown } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT, N_BG } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

// ── Term structure ─────────────────────────────────────────────────────────────
const TERMS = [
  { name: "Autumn 1", weeks: [1,2,3,4,5,6,7],           color: "#ea580c" },
  { name: "Autumn 2", weeks: [8,9,10,11,12,13,14,15],    color: "#dc2626" },
  { name: "Spring 1", weeks: [16,17,18,19,20],           color: "#16a34a" },
  { name: "Spring 2", weeks: [21,22,23,24,25,26],        color: "#0284c7" },
  { name: "Summer 1", weeks: [27,28,29,30,31,32],        color: "#ca8a04" },
  { name: "Summer 2", weeks: [33,34,35,36,37,38],        color: "#9333ea" },
] as const;

type TermName = typeof TERMS[number]["name"];

const DEFAULT_SUBJECTS = ["English", "Maths", "Science"];

interface PlanEntry {
  subject: string;
  week: number;
  term: string;
  topic: string;
}

function asText(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map((v) =>
    typeof v === "object" && v !== null && "plain_text" in v
      ? String((v as { plain_text: string }).plain_text) : String(v)
  ).join("");
  return String(val);
}

type CellKey = `${string}__${number}`;
function cellKey(subject: string, week: number): CellKey {
  return `${subject}__${week}` as CellKey;
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  "Planned":     "#94a3b8",
  "In Progress": "#2563eb",
  "Done":        "#16a34a",
};

// ── Single editable cell ──────────────────────────────────────────────────────
function PlanCell({
  topic, status, saving, onSave, onStatusChange,
}: {
  topic: string;
  status: string;
  saving: boolean;
  onSave: (val: string) => void;
  onStatusChange: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(topic);
  const [showStatus, setShowStatus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function open() { setDraft(topic); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }
  function commit() { setEditing(false); if (draft !== topic) onSave(draft); }

  const dot = STATUS_COLORS[status] ?? "#94a3b8";

  return (
    <div
      style={{
        position: "relative",
        minHeight: "48px",
        padding: "6px 8px",
        cursor: editing ? "default" : "pointer",
        background: topic ? "rgba(37,99,235,0.04)" : "transparent",
        borderRadius: "4px",
        transition: "background 0.15s",
      }}
      onClick={!editing ? open : undefined}
    >
      {/* Status dot */}
      {topic && (
        <div style={{ position: "absolute", top: "4px", right: "4px" }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowStatus((v) => !v); }}
            style={{ width: "8px", height: "8px", borderRadius: "50%", background: dot, border: "none", cursor: "pointer", padding: 0 }}
            title={status || "Planned"}
          />
          {showStatus && (
            <div style={{
              position: "absolute", right: 0, top: "12px", zIndex: 20,
              background: "white", border: `1px solid ${N_BORDER_MED}`, borderRadius: "8px",
              padding: "4px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: "110px",
            }}>
              {["Planned", "In Progress", "Done"].map((s) => (
                <button key={s} type="button"
                  onClick={(e) => { e.stopPropagation(); onStatusChange(s); setShowStatus(false); }}
                  style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%", padding: "5px 8px", background: "none", border: "none", cursor: "pointer", fontSize: "11px", fontFamily: N_FONT, color: N_FG, borderRadius: "4px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: STATUS_COLORS[s], flexShrink: 0 }} />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(topic); } }}
          style={{ width: "100%", border: `1px solid ${ACCENT}`, borderRadius: "4px", padding: "3px 6px", fontSize: "11px", fontFamily: N_FONT, outline: "none", boxSizing: "border-box" }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span style={{ fontSize: "11px", color: topic ? N_FG : N_MUTED, lineHeight: 1.4, display: "block", paddingRight: topic ? "14px" : "0" }}>
          {saving ? <Loader2 size={10} style={{ display: "inline", animation: "spin 1s linear infinite" }} /> : (topic || <span style={{ opacity: 0.3 }}>+</span>)}
        </span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function TeacherYearPlanner({
  db,
  apiCriteria,
  onRowAdded,
  onRowUpdated,
}: {
  db: WorkspaceDatabase | null;
  apiCriteria: Record<string, unknown> | null;
  onRowAdded: (row: WorkspaceRow) => void;
  onRowUpdated: (pageId: string, name: string, val: string | number | boolean | null) => void;
}) {
  const [activeTerm, setActiveTerm] = useState<TermName>("Autumn 1");
  const [subjects, setSubjects] = useState<string[]>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("teacher-year-planner-subjects") : null;
    if (saved) { try { return JSON.parse(saved) as string[]; } catch { /* */ } }
    return DEFAULT_SUBJECTS;
  });
  const [newSubject, setNewSubject] = useState("");
  const [generating, setGenerating] = useState(false);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showAddSubject, setShowAddSubject] = useState(false);

  const rows = db?.rows ?? [];

  // Build lookup: cellKey → row
  const rowMap = useCallback(() => {
    const map = new Map<string, WorkspaceRow>();
    for (const r of rows) {
      const s = asText(r.properties["Subject"]);
      const w = Number(r.properties["Week"]);
      if (s && w) map.set(cellKey(s, w), r);
    }
    return map;
  }, [rows])();

  function saveSubjects(next: string[]) {
    setSubjects(next);
    try { localStorage.setItem("teacher-year-planner-subjects", JSON.stringify(next)); } catch { /* */ }
  }

  function addSubject() {
    const s = newSubject.trim();
    if (!s || subjects.includes(s)) return;
    saveSubjects([...subjects, s]);
    setNewSubject("");
    setShowAddSubject(false);
  }

  function removeSubject(s: string) {
    saveSubjects(subjects.filter((x) => x !== s));
  }

  async function saveCell(subject: string, week: number, term: string, topic: string) {
    if (!db) return;
    const key = cellKey(subject, week);
    const existing = rowMap.get(key);
    setSavingCells((p) => new Set([...p, key]));
    try {
      if (existing) {
        // PATCH
        await fetch(`/api/members/workspace/${existing.pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            properties: { Title: topic, Subject: subject, Week: String(week), Term: term, Status: asText(existing.properties["Status"]) || "Planned" },
            propertyTypes: { Title: "title", Subject: "select", Week: "number", Term: "select", Status: "select" },
          }),
        });
        onRowUpdated(existing.pageId, "Title", topic);
      } else {
        // POST new row
        const res = await fetch("/api/members/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dbNotionId: db.notionId,
            properties: { Title: topic, Subject: subject, Week: week, Term: term, Status: "Planned" },
            propertyTypes: { Title: "title", Subject: "select", Week: "number", Term: "select", Status: "select" },
          }),
        });
        const data = await res.json() as { row?: WorkspaceRow };
        if (data.row) onRowAdded(data.row);
      }
    } catch { /* silent */ } finally {
      setSavingCells((p) => { const n = new Set(p); n.delete(key); return n; });
    }
  }

  async function saveStatus(subject: string, week: number, status: string) {
    const key = cellKey(subject, week);
    const existing = rowMap.get(key);
    if (!existing) return;
    await fetch(`/api/members/workspace/${existing.pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: { Status: status },
        propertyTypes: { Status: "select" },
      }),
    });
    onRowUpdated(existing.pageId, "Status", status);
  }

  async function handleAiFill() {
    if (!db) return;
    setGenerating(true);
    setError(null);
    try {
      const yearGroup  = String(apiCriteria?.["year-groups"] ?? "Year 7");
      const curriculum = String(apiCriteria?.["curriculum"] ?? "England (National Curriculum)");
      const res = await fetch("/api/members/teacher-year-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects, yearGroup, curriculum }),
      });
      const data = await res.json() as { plan?: PlanEntry[]; error?: string };
      if (!res.ok || !data.plan) { setError(data.error ?? "AI fill failed"); return; }

      // Save each entry that doesn't already have a topic
      for (const entry of data.plan) {
        if (!subjects.includes(entry.subject)) continue;
        const key = cellKey(entry.subject, entry.week);
        const existing = rowMap.get(key);
        if (existing && asText(existing.properties["Title"])) continue; // don't overwrite
        await saveCell(entry.subject, entry.week, entry.term, entry.topic);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI fill failed");
    } finally {
      setGenerating(false);
    }
  }

  const term = TERMS.find((t) => t.name === activeTerm)!;

  if (!db) {
    return (
      <div style={{ padding: "32px", textAlign: "center", fontFamily: N_FONT }}>
        <p style={{ color: N_MUTED, fontSize: "14px" }}>Year Planner database not found. Re-open the workspace to provision it.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: N_FONT, display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>Year Planner</h2>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Map your curriculum week by week across all 6 terms. Click any cell to edit.</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={handleAiFill}
            disabled={generating}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_TEXT, fontWeight: 600, fontSize: "13px", cursor: generating ? "default" : "pointer", opacity: generating ? 0.7 : 1, fontFamily: N_FONT }}
          >
            {generating ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
            {generating ? "Filling…" : "AI Fill Year"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* Subject management */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED }}>Subjects:</span>
        {subjects.map((s) => (
          <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px 3px 10px", borderRadius: "99px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, fontSize: "12px", color: ACCENT_TEXT, fontWeight: 600 }}>
            {s}
            <button type="button" onClick={() => removeSubject(s)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: ACCENT_TEXT, opacity: 0.6, display: "flex", alignItems: "center" }}>
              <X size={11} />
            </button>
          </span>
        ))}
        {showAddSubject ? (
          <span style={{ display: "inline-flex", gap: "4px" }}>
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addSubject(); if (e.key === "Escape") setShowAddSubject(false); }}
              placeholder="Subject name…"
              autoFocus
              style={{ padding: "3px 8px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "12px", fontFamily: N_FONT, width: "130px" }}
            />
            <button type="button" onClick={addSubject} style={{ padding: "3px 8px", borderRadius: "6px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_TEXT, fontSize: "12px", cursor: "pointer", fontFamily: N_FONT, fontWeight: 600 }}>Add</button>
            <button type="button" onClick={() => setShowAddSubject(false)} style={{ padding: "3px 6px", borderRadius: "6px", border: `1px solid ${N_BORDER}`, background: "none", fontSize: "12px", cursor: "pointer", fontFamily: N_FONT, color: N_MUTED }}>Cancel</button>
          </span>
        ) : (
          <button type="button" onClick={() => setShowAddSubject(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "99px", background: N_BG, border: `1px dashed ${N_BORDER_MED}`, fontSize: "12px", color: N_MUTED, cursor: "pointer", fontFamily: N_FONT }}>
            <Plus size={11} /> Add subject
          </button>
        )}
      </div>

      {/* Term tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${N_BORDER_MED}`, overflowX: "auto", gap: "0" }}>
        {TERMS.map((t) => {
          const active = t.name === activeTerm;
          const filled = rows.filter((r) => asText(r.properties["Term"]) === t.name).length;
          return (
            <button key={t.name} type="button" onClick={() => setActiveTerm(t.name as TermName)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", border: "none", background: "none", borderBottom: active ? `2px solid ${t.color}` : "2px solid transparent", color: active ? t.color : N_MUTED, fontWeight: active ? 700 : 400, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT, whiteSpace: "nowrap", flexShrink: 0 }}>
              {t.name}
              {filled > 0 && (
                <span style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "99px", background: active ? `${t.color}18` : "rgba(148,163,184,0.15)", color: active ? t.color : N_MUTED, fontWeight: 700 }}>
                  {filled}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ overflowX: "auto", borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: `${120 + term.weeks.length * 100}px` }}>
          <thead>
            <tr>
              {/* Term header spanning all weeks */}
              <th style={{ width: "120px" }} />
              <th
                colSpan={term.weeks.length}
                style={{ padding: "8px 12px", textAlign: "center", fontSize: "12px", fontWeight: 700, color: term.color, background: `${term.color}10`, borderBottom: `2px solid ${term.color}30`, fontFamily: N_FONT }}
              >
                {term.name} · Weeks {term.weeks[0]}–{term.weeks[term.weeks.length - 1]}
              </th>
            </tr>
            <tr style={{ borderBottom: `1px solid ${N_BORDER_MED}` }}>
              <th style={{ padding: "6px 12px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: N_MUTED, background: N_BG, fontFamily: N_FONT, whiteSpace: "nowrap" }}>
                Subject
              </th>
              {term.weeks.map((w) => (
                <th key={w} style={{ padding: "6px 4px", textAlign: "center", fontSize: "11px", fontWeight: 600, color: N_MUTED, background: N_BG, fontFamily: N_FONT, minWidth: "90px" }}>
                  Wk {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject, si) => (
              <tr key={subject} style={{ borderBottom: si < subjects.length - 1 ? `1px solid ${N_BORDER}` : "none" }}>
                <td style={{ padding: "8px 12px", fontSize: "12px", fontWeight: 700, color: N_FG, background: N_BG, borderRight: `1px solid ${N_BORDER_MED}`, whiteSpace: "nowrap", fontFamily: N_FONT }}>
                  {subject}
                </td>
                {term.weeks.map((week) => {
                  const key = cellKey(subject, week);
                  const row = rowMap.get(key);
                  const topic = row ? asText(row.properties["Title"]) : "";
                  const status = row ? asText(row.properties["Status"]) : "";
                  return (
                    <td key={week} style={{ padding: "2px", borderRight: `1px solid ${N_BORDER}`, verticalAlign: "top" }}>
                      <PlanCell
                        topic={topic}
                        status={status}
                        saving={savingCells.has(key)}
                        onSave={(val) => saveCell(subject, week, term.name, val)}
                        onStatusChange={(val) => saveStatus(subject, week, val)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", color: N_MUTED }}>Status:</span>
        {Object.entries(STATUS_COLORS).map(([s, c]) => (
          <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", color: N_MUTED }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: c, display: "inline-block" }} />
            {s}
          </span>
        ))}
        <span style={{ fontSize: "11px", color: N_MUTED, marginLeft: "auto" }}>Click any cell to edit · Click the dot to update status</span>
      </div>

      {/* Term summary stats */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {(["Planned", "In Progress", "Done"] as const).map((s) => {
          const count = rows.filter((r) => asText(r.properties["Term"]) === activeTerm && asText(r.properties["Status"]) === s).length;
          return count > 0 ? (
            <span key={s} style={{ padding: "4px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: 600, background: `${STATUS_COLORS[s]}15`, color: STATUS_COLORS[s] }}>
              {count} {s}
            </span>
          ) : null;
        })}
        {(() => {
          const total = subjects.length * term.weeks.length;
          const filled = rows.filter((r) => asText(r.properties["Term"]) === activeTerm).length;
          return <span style={{ fontSize: "11px", color: N_MUTED }}>{filled}/{total} cells filled this term</span>;
        })()}
      </div>
    </div>
  );
}
