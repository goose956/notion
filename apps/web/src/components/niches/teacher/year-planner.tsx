"use client";

import { useState, useCallback, useRef } from "react";
import { Sparkles, Loader2, Plus, X, ChevronDown, Settings } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import type { TeacherClass } from "./class-selector";

// ── Default term config ───────────────────────────────────────────────────────
const TERM_NAMES = ["Autumn 1", "Autumn 2", "Spring 1", "Spring 2", "Summer 1", "Summer 2"] as const;
type TermName = typeof TERM_NAMES[number];

const TERM_COLORS: Record<TermName, string> = {
  "Autumn 1": "#ea580c",
  "Autumn 2": "#dc2626",
  "Spring 1": "#16a34a",
  "Spring 2": "#0284c7",
  "Summer 1": "#ca8a04",
  "Summer 2": "#9333ea",
};

const DEFAULT_TERM_WEEKS: Record<TermName, number> = {
  "Autumn 1": 7,
  "Autumn 2": 8,
  "Spring 1": 5,
  "Spring 2": 6,
  "Summer 1": 6,
  "Summer 2": 6,
};

const DEFAULT_SUBJECTS = ["English", "Maths", "Science"];
const DEFAULT_YEAR_GROUPS = ["Year 7"];

const STATUS_COLORS: Record<string, string> = {
  "Planned":     "#94a3b8",
  "In Progress": "#2563eb",
  "Done":        "#16a34a",
};

interface PlanEntry { subject: string; week: number; term: string; topic: string; }

function asText(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map((v) =>
    typeof v === "object" && v !== null && "plain_text" in v
      ? String((v as { plain_text: string }).plain_text) : String(v)
  ).join("");
  return String(val);
}

type CellKey = string;
function cellKey(yearGroup: string, subject: string, week: number): CellKey {
  return `${yearGroup}||${subject}||${week}`;
}

// ── Single editable cell ──────────────────────────────────────────────────────
function PlanCell({ topic, status, saving, onSave, onStatusChange }: {
  topic: string; status: string; saving: boolean;
  onSave: (val: string) => void;
  onStatusChange: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(topic);
  const [showStatus, setShowStatus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function open() { setDraft(topic); setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }
  function commit() { setEditing(false); if (draft.trim() !== topic) onSave(draft.trim()); }

  const dot = STATUS_COLORS[status] ?? "#94a3b8";

  return (
    <div
      style={{ position: "relative", minHeight: "48px", padding: "6px 8px", cursor: editing ? "default" : "pointer", background: topic ? "rgba(37,99,235,0.04)" : "transparent", borderRadius: "4px", transition: "background 0.15s" }}
      onClick={!editing ? open : undefined}
    >
      {topic && (
        <div style={{ position: "absolute", top: "4px", right: "4px" }}>
          <button type="button" onClick={(e) => { e.stopPropagation(); setShowStatus((v) => !v); }}
            style={{ width: "8px", height: "8px", borderRadius: "50%", background: dot, border: "none", cursor: "pointer", padding: 0 }}
            title={status || "Planned"} />
          {showStatus && (
            <div style={{ position: "absolute", right: 0, top: "12px", zIndex: 20, background: "white", border: `1px solid ${N_BORDER_MED}`, borderRadius: "8px", padding: "4px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: "110px" }}>
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
        <input ref={inputRef} value={draft} onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(topic); } }}
          style={{ width: "100%", border: `1px solid ${ACCENT}`, borderRadius: "4px", padding: "3px 6px", fontSize: "11px", fontFamily: N_FONT, outline: "none", boxSizing: "border-box" }}
          onClick={(e) => e.stopPropagation()} />
      ) : (
        <span style={{ fontSize: "11px", color: topic ? N_FG : N_MUTED, lineHeight: 1.4, display: "block", paddingRight: topic ? "14px" : "0" }}>
          {saving ? <Loader2 size={10} style={{ display: "inline", animation: "spin 1s linear infinite" }} /> : (topic || <span style={{ opacity: 0.3 }}>+</span>)}
        </span>
      )}
    </div>
  );
}

// ── Term weeks editor ─────────────────────────────────────────────────────────
function TermWeeksEditor({ termWeeks, onChange, onClose }: {
  termWeeks: Record<TermName, number>;
  onChange: (t: TermName, n: number) => void;
  onClose: () => void;
}) {
  return (
    <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, background: "white", borderRadius: "12px", boxShadow: "0 8px 28px rgba(0,0,0,0.15)", padding: "16px", border: `1px solid ${N_BORDER_MED}`, minWidth: "260px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG }}>Weeks per term</span>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: N_MUTED, padding: "2px" }}><X size={14} /></button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {TERM_NAMES.map((t) => (
          <div key={t} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <span style={{ fontSize: "12px", color: N_FG, fontWeight: 600, minWidth: "80px" }}>{t}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button type="button" onClick={() => onChange(t, Math.max(1, termWeeks[t] - 1))}
                style={{ width: "24px", height: "24px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: N_FG }}>−</button>
              <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG, minWidth: "24px", textAlign: "center" }}>{termWeeks[t]}</span>
              <button type="button" onClick={() => onChange(t, Math.min(20, termWeeks[t] + 1))}
                style={{ width: "24px", height: "24px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: N_FG }}>+</button>
            </div>
          </div>
        ))}
      </div>
      <p style={{ margin: "12px 0 0", fontSize: "11px", color: N_MUTED }}>Changes save automatically and persist across sessions.</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function TeacherYearPlanner({
  db,
  apiCriteria,
  classes = [],
  activeClass = null,
  onRowAdded,
  onRowUpdated,
}: {
  db: WorkspaceDatabase | null;
  apiCriteria: Record<string, unknown> | null;
  classes?: TeacherClass[];
  activeClass?: TeacherClass | null;
  onRowAdded: (row: WorkspaceRow) => void;
  onRowUpdated: (pageId: string, name: string, val: string | number | boolean | null) => void;
}) {
  // ── Persisted config ────────────────────────────────────────────────────────
  const [termWeeks, setTermWeeks] = useState<Record<TermName, number>>(() => {
    if (typeof window === "undefined") return { ...DEFAULT_TERM_WEEKS };
    try {
      const saved = localStorage.getItem("teacher-year-planner-term-weeks");
      if (saved) return { ...DEFAULT_TERM_WEEKS, ...(JSON.parse(saved) as Partial<Record<TermName, number>>) };
    } catch { /* */ }
    return { ...DEFAULT_TERM_WEEKS };
  });

  // Year groups — derive from class registry first, then criteria, then defaults
  // De-duplicate year groups across classes so each appears once as a tab
  const classYearGroups = Array.from(new Set(classes.map((c) => c.yearGroup).filter(Boolean)));
  const criteriaYearGroups = String(apiCriteria?.["year-groups"] ?? "")
    .split(/[,\/\-–]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.match(/\d+/) ? `Year ${s.match(/\d+/)?.[0]}` : s);

  // Fallback list (only used when no classes registered)
  const fallbackYearGroups = criteriaYearGroups.length ? criteriaYearGroups : DEFAULT_YEAR_GROUPS;

  // If classes are registered, use their year groups — don't persist separately
  const derivedYearGroups = classYearGroups.length ? classYearGroups : null;

  const [yearGroupsLocal, setYearGroupsLocal] = useState<string[]>(() => {
    if (typeof window === "undefined") return fallbackYearGroups;
    try {
      const saved = localStorage.getItem("teacher-year-planner-year-groups");
      if (saved) return JSON.parse(saved) as string[];
    } catch { /* */ }
    return fallbackYearGroups;
  });

  // Effective year groups: from classes if available, else from local state
  const yearGroups = derivedYearGroups ?? yearGroupsLocal;
  const setYearGroups = (next: string[]) => setYearGroupsLocal(next);

  const [subjects, setSubjects] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_SUBJECTS;
    try {
      const saved = localStorage.getItem("teacher-year-planner-subjects");
      if (saved) return JSON.parse(saved) as string[];
    } catch { /* */ }
    return DEFAULT_SUBJECTS;
  });

  const [activeYearGroup, setActiveYearGroup] = useState<string>(
    () => (activeClass?.yearGroup && yearGroups.includes(activeClass.yearGroup))
      ? activeClass.yearGroup
      : (yearGroups[0] ?? DEFAULT_YEAR_GROUPS[0]!)
  );

  // When active class changes externally, switch to that year group
  const prevActiveClassRef = useRef<string | null>(null);
  if (activeClass?.yearGroup && activeClass.yearGroup !== prevActiveClassRef.current) {
    prevActiveClassRef.current = activeClass.yearGroup ?? null;
    if (activeClass.yearGroup && yearGroups.includes(activeClass.yearGroup) && activeYearGroup !== activeClass.yearGroup) {
      // Use a ref trick to avoid setState during render — schedule it
      setTimeout(() => setActiveYearGroup(activeClass.yearGroup), 0);
    }
  }
  const [activeTerm, setActiveTerm]           = useState<TermName>("Autumn 1");
  const [showTermEditor, setShowTermEditor]   = useState(false);
  const [showAddYearGroup, setShowAddYearGroup] = useState(false);
  const [newYearGroup, setNewYearGroup]         = useState("");
  const [showAddSubject, setShowAddSubject]     = useState(false);
  const [newSubject, setNewSubject]             = useState("");
  const [generating, setGenerating]             = useState(false);
  const [savingCells, setSavingCells]           = useState<Set<string>>(new Set());
  const [error, setError]                       = useState<string | null>(null);

  function saveTermWeeks(next: Record<TermName, number>) {
    setTermWeeks(next);
    try { localStorage.setItem("teacher-year-planner-term-weeks", JSON.stringify(next)); } catch { /* */ }
  }

  function updateTermWeek(t: TermName, n: number) {
    saveTermWeeks({ ...termWeeks, [t]: n });
  }

  function saveYearGroups(next: string[]) {
    setYearGroups(next);
    try { localStorage.setItem("teacher-year-planner-year-groups", JSON.stringify(next)); } catch { /* */ }
  }

  function addYearGroup() {
    const yg = newYearGroup.trim();
    if (!yg || yearGroups.includes(yg)) return;
    const next = [...yearGroups, yg];
    saveYearGroups(next);
    setActiveYearGroup(yg);
    setNewYearGroup("");
    setShowAddYearGroup(false);
  }

  function removeYearGroup(yg: string) {
    const next = yearGroups.filter((x) => x !== yg);
    saveYearGroups(next);
    if (activeYearGroup === yg) setActiveYearGroup(next[0] ?? "");
  }

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

  const rows = db?.rows ?? [];

  // Build lookup: cellKey(yearGroup, subject, week) → row
  const rowMap = useCallback(() => {
    const map = new Map<string, WorkspaceRow>();
    for (const r of rows) {
      const yg = asText(r.properties["Year Group"]);
      const s  = asText(r.properties["Subject"]);
      const w  = Number(r.properties["Week"]);
      if (yg && s && w) map.set(cellKey(yg, s, w), r);
    }
    return map;
  }, [rows])();

  // Compute week numbers for the active term (sequential across year)
  const termWeekOffsets = useCallback(() => {
    let offset = 1;
    const offsets: Record<TermName, number> = {} as Record<TermName, number>;
    for (const t of TERM_NAMES) {
      offsets[t] = offset;
      offset += termWeeks[t];
    }
    return offsets;
  }, [termWeeks])();

  const activeTermOffset = termWeekOffsets[activeTerm];
  const activeTermWeekCount = termWeeks[activeTerm];
  const activeTermWeeks = Array.from({ length: activeTermWeekCount }, (_, i) => activeTermOffset + i);

  async function saveCell(yearGroup: string, subject: string, week: number, term: string, topic: string) {
    if (!db) return;
    const key = cellKey(yearGroup, subject, week);
    const existing = rowMap.get(key);
    setSavingCells((p) => new Set([...p, key]));
    try {
      if (existing) {
        await fetch(`/api/members/workspace/${existing.pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            properties: { Title: topic, Subject: subject, Week: week, Term: term, "Year Group": yearGroup, Status: asText(existing.properties["Status"]) || "Planned" },
            propertyTypes: { Title: "title", Subject: "select", Week: "number", Term: "select", "Year Group": "select", Status: "select" },
          }),
        });
        onRowUpdated(existing.pageId, "Title", topic);
      } else {
        const res = await fetch("/api/members/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId: db.notionId,
            properties: { Title: topic, Subject: subject, Week: week, Term: term, "Year Group": yearGroup, Status: "Planned" },
            propertyTypes: { Title: "title", Subject: "select", Week: "number", Term: "select", "Year Group": "select", Status: "select" },
          }),
        });
        const data = await res.json() as { pageId?: string };
        if (data.pageId) {
          onRowAdded({ pageId: data.pageId, properties: { Title: topic, Subject: subject, Week: week, Term: term, "Year Group": yearGroup, Status: "Planned" } });
        }
      }
    } catch { /* silent */ } finally {
      setSavingCells((p) => { const n = new Set(p); n.delete(key); return n; });
    }
  }

  async function saveStatus(yearGroup: string, subject: string, week: number, status: string) {
    const key = cellKey(yearGroup, subject, week);
    const existing = rowMap.get(key);
    if (!existing) return;
    await fetch(`/api/members/workspace/${existing.pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { Status: status }, propertyTypes: { Status: "select" } }),
    });
    onRowUpdated(existing.pageId, "Status", status);
  }

  async function handleAiFill() {
    if (!db || !activeYearGroup) return;
    setGenerating(true); setError(null);
    try {
      const curriculum = String(apiCriteria?.["curriculum"] ?? "England (National Curriculum)");
      const res = await fetch("/api/members/teacher-year-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects, yearGroup: activeYearGroup, curriculum }),
      });
      const data = await res.json() as { plan?: PlanEntry[]; error?: string };
      if (!res.ok || !data.plan) { setError(data.error ?? "AI fill failed"); return; }
      for (const entry of data.plan) {
        if (!subjects.includes(entry.subject)) continue;
        const key = cellKey(activeYearGroup, entry.subject, entry.week);
        const existing = rowMap.get(key);
        if (existing && asText(existing.properties["Title"])) continue;
        await saveCell(activeYearGroup, entry.subject, entry.week, entry.term, entry.topic);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI fill failed");
    } finally {
      setGenerating(false);
    }
  }

  // Stats for current year group + term
  const termRows = rows.filter((r) =>
    asText(r.properties["Year Group"]) === activeYearGroup &&
    asText(r.properties["Term"]) === activeTerm
  );
  const totalCells = subjects.length * activeTermWeekCount;

  if (!db) return (
    <div style={{ padding: "32px", textAlign: "center", fontFamily: N_FONT }}>
      <p style={{ color: N_MUTED, fontSize: "14px" }}>Year Planner database not found. Re-open the workspace to provision it.</p>
    </div>
  );

  return (
    <div style={{ fontFamily: N_FONT, display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>Year Planner</h2>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
            {classes.length > 0
              ? `Showing plan for ${activeYearGroup}${classes.filter(c => c.yearGroup === activeYearGroup).map(c => ` · ${c.name}`).join("")}. Switch year group below.`
              : "Map your curriculum week by week — separate plans per year group, configurable term lengths."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", position: "relative" }}>
          {/* Term length config button */}
          <div style={{ position: "relative" }}>
            <button type="button" onClick={() => setShowTermEditor((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", background: "white", border: `1px solid ${N_BORDER_MED}`, color: N_MUTED, fontWeight: 600, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT }}>
              <Settings size={13} /> Term Lengths
            </button>
            {showTermEditor && (
              <TermWeeksEditor termWeeks={termWeeks} onChange={updateTermWeek} onClose={() => setShowTermEditor(false)} />
            )}
          </div>
          {/* AI fill */}
          <button onClick={handleAiFill} disabled={generating || !activeYearGroup}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_TEXT, fontWeight: 600, fontSize: "13px", cursor: generating ? "default" : "pointer", opacity: generating ? 0.7 : 1, fontFamily: N_FONT }}>
            {generating ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
            {generating ? "Filling…" : "AI Fill"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {/* ── Year group tabs ─────────────────────────────────────────── */}
      <div>
        <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>Year Group</p>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          {yearGroups.map((yg) => {
            const active = yg === activeYearGroup;
            const ygRows = rows.filter((r) => asText(r.properties["Year Group"]) === yg).length;
            return (
              <div key={yg} style={{ display: "flex", alignItems: "center", gap: "0" }}>
                <button type="button" onClick={() => setActiveYearGroup(yg)}
                  style={{ padding: "6px 14px", borderRadius: yearGroups.length > 1 ? "8px 0 0 8px" : "8px", border: `1px solid ${active ? ACCENT : N_BORDER_MED}`, borderRight: yearGroups.length > 1 ? "none" : `1px solid ${active ? ACCENT : N_BORDER_MED}`, background: active ? ACCENT : "white", color: active ? "white" : N_MUTED, fontWeight: 700, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT }}>
                  {yg}
                  {ygRows > 0 && <span style={{ marginLeft: "5px", fontSize: "10px", opacity: 0.75 }}>({ygRows})</span>}
                </button>
                {yearGroups.length > 1 && (
                  <button type="button" onClick={() => removeYearGroup(yg)}
                    style={{ padding: "6px 7px", borderRadius: "0 8px 8px 0", border: `1px solid ${active ? ACCENT : N_BORDER_MED}`, background: active ? ACCENT : "white", color: active ? "rgba(255,255,255,0.8)" : N_MUTED, cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <X size={11} />
                  </button>
                )}
              </div>
            );
          })}
          {/* Only show manual add when no class registry */}
          {!derivedYearGroups && showAddYearGroup ? (
            <span style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
              <input value={newYearGroup} onChange={(e) => setNewYearGroup(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addYearGroup(); if (e.key === "Escape") setShowAddYearGroup(false); }}
                placeholder="e.g. Year 10" autoFocus
                style={{ padding: "5px 10px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, width: "120px" }} />
              <button type="button" onClick={addYearGroup} style={{ padding: "5px 10px", borderRadius: "8px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_TEXT, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT, fontWeight: 600 }}>Add</button>
              <button type="button" onClick={() => setShowAddYearGroup(false)} style={{ padding: "5px 8px", borderRadius: "8px", border: `1px solid ${N_BORDER}`, background: "none", fontSize: "13px", cursor: "pointer", fontFamily: N_FONT, color: N_MUTED }}>Cancel</button>
            </span>
          ) : !derivedYearGroups ? (
            <button type="button" onClick={() => setShowAddYearGroup(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 12px", borderRadius: "8px", background: "#f8f9fb", border: `1px dashed ${N_BORDER_MED}`, fontSize: "13px", color: N_MUTED, cursor: "pointer", fontFamily: N_FONT }}>
              <Plus size={12} /> Add year group
            </button>
          ) : (
            <span style={{ fontSize: "11px", color: N_MUTED, fontStyle: "italic" }}>Year groups come from your class list</span>
          )}
        </div>
      </div>

      {/* ── Subject management ──────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED }}>Subjects:</span>
        {subjects.map((s) => (
          <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "99px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, fontSize: "12px", color: ACCENT_TEXT, fontWeight: 600 }}>
            {s}
            {subjects.length > 1 && (
              <button type="button" onClick={() => saveSubjects(subjects.filter((x) => x !== s))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: ACCENT_TEXT, opacity: 0.6, display: "flex", alignItems: "center" }}>
                <X size={11} />
              </button>
            )}
          </span>
        ))}
        {showAddSubject ? (
          <span style={{ display: "inline-flex", gap: "4px" }}>
            <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addSubject(); if (e.key === "Escape") setShowAddSubject(false); }}
              placeholder="Subject name…" autoFocus
              style={{ padding: "3px 8px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "12px", fontFamily: N_FONT, width: "130px" }} />
            <button type="button" onClick={addSubject} style={{ padding: "3px 8px", borderRadius: "6px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_TEXT, fontSize: "12px", cursor: "pointer", fontFamily: N_FONT, fontWeight: 600 }}>Add</button>
            <button type="button" onClick={() => setShowAddSubject(false)} style={{ padding: "3px 6px", borderRadius: "6px", border: `1px solid ${N_BORDER}`, background: "none", fontSize: "12px", cursor: "pointer", fontFamily: N_FONT, color: N_MUTED }}>Cancel</button>
          </span>
        ) : (
          <button type="button" onClick={() => setShowAddSubject(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 10px", borderRadius: "99px", background: "#f8f9fb", border: `1px dashed ${N_BORDER_MED}`, fontSize: "12px", color: N_MUTED, cursor: "pointer", fontFamily: N_FONT }}>
            <Plus size={11} /> Add subject
          </button>
        )}
      </div>

      {/* ── Term tabs ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", borderBottom: `1px solid ${N_BORDER_MED}`, overflowX: "auto" }}>
        {TERM_NAMES.map((t) => {
          const active = t === activeTerm;
          const color  = TERM_COLORS[t];
          const filled = rows.filter((r) => asText(r.properties["Year Group"]) === activeYearGroup && asText(r.properties["Term"]) === t).length;
          const weeks  = termWeeks[t];
          return (
            <button key={t} type="button" onClick={() => setActiveTerm(t)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", border: "none", background: "none", borderBottom: active ? `2px solid ${color}` : "2px solid transparent", color: active ? color : N_MUTED, fontWeight: active ? 700 : 400, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT, whiteSpace: "nowrap", flexShrink: 0 }}>
              {t}
              <span style={{ fontSize: "10px", color: active ? color : N_MUTED, opacity: 0.75 }}>({weeks}wk{weeks !== 1 ? "s" : ""})</span>
              {filled > 0 && (
                <span style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "99px", background: active ? `${color}18` : "rgba(148,163,184,0.15)", color: active ? color : N_MUTED, fontWeight: 700 }}>
                  {filled}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Grid ────────────────────────────────────────────────────── */}
      {!activeYearGroup ? (
        <div style={{ padding: "32px", textAlign: "center", borderRadius: "12px", border: `1px dashed ${N_BORDER_MED}` }}>
          <p style={{ margin: 0, fontSize: "14px", color: N_MUTED }}>Add a year group above to start planning.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: `${140 + activeTermWeekCount * 95}px` }}>
            <thead>
              <tr>
                <th style={{ width: "140px" }} />
                <th
                  colSpan={activeTermWeekCount}
                  style={{ padding: "8px 12px", textAlign: "center", fontSize: "12px", fontWeight: 700, color: TERM_COLORS[activeTerm], background: `${TERM_COLORS[activeTerm]}10`, borderBottom: `2px solid ${TERM_COLORS[activeTerm]}30`, fontFamily: N_FONT }}
                >
                  {activeTerm} · {activeYearGroup} · Weeks {activeTermWeeks[0]}–{activeTermWeeks[activeTermWeeks.length - 1]} ({activeTermWeekCount} weeks)
                </th>
              </tr>
              <tr style={{ borderBottom: `1px solid ${N_BORDER_MED}` }}>
                <th style={{ padding: "6px 12px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: N_MUTED, background: "#f8f9fb", fontFamily: N_FONT, whiteSpace: "nowrap" }}>
                  Subject
                </th>
                {activeTermWeeks.map((w) => (
                  <th key={w} style={{ padding: "6px 4px", textAlign: "center", fontSize: "11px", fontWeight: 600, color: N_MUTED, background: "#f8f9fb", fontFamily: N_FONT, minWidth: "90px" }}>
                    Wk {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, si) => (
                <tr key={subject} style={{ borderBottom: si < subjects.length - 1 ? `1px solid ${N_BORDER}` : "none" }}>
                  <td style={{ padding: "8px 12px", fontSize: "12px", fontWeight: 700, color: N_FG, background: "#f8f9fb", borderRight: `1px solid ${N_BORDER_MED}`, whiteSpace: "nowrap", fontFamily: N_FONT }}>
                    {subject}
                  </td>
                  {activeTermWeeks.map((week) => {
                    const key   = cellKey(activeYearGroup, subject, week);
                    const row   = rowMap.get(key);
                    const topic  = row ? asText(row.properties["Title"]) : "";
                    const status = row ? asText(row.properties["Status"]) : "";
                    return (
                      <td key={week} style={{ padding: "2px", borderRight: `1px solid ${N_BORDER}`, verticalAlign: "top" }}>
                        <PlanCell
                          topic={topic}
                          status={status}
                          saving={savingCells.has(key)}
                          onSave={(val) => saveCell(activeYearGroup, subject, week, activeTerm, val)}
                          onStatusChange={(val) => saveStatus(activeYearGroup, subject, week, val)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Legend + stats ──────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", color: N_MUTED }}>Status:</span>
        {Object.entries(STATUS_COLORS).map(([s, c]) => (
          <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", color: N_MUTED }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: c, display: "inline-block" }} />
            {s}
          </span>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {(["Planned", "In Progress", "Done"] as const).map((s) => {
            const count = termRows.filter((r) => asText(r.properties["Status"]) === s).length;
            return count > 0 ? (
              <span key={s} style={{ padding: "3px 9px", borderRadius: "99px", fontSize: "11px", fontWeight: 600, background: `${STATUS_COLORS[s]}15`, color: STATUS_COLORS[s] }}>
                {count} {s}
              </span>
            ) : null;
          })}
          <span style={{ fontSize: "11px", color: N_MUTED }}>{termRows.length}/{totalCells} filled this term</span>
        </div>
      </div>
    </div>
  );
}
