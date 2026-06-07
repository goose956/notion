"use client";
import { useState, useRef, useEffect } from "react";
import { Plus, X, ChevronDown, Pencil, Check, BookOpen } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";

export interface TeacherClass {
  id:        string;
  name:      string;   // e.g. "7A Maths", "10B English"
  yearGroup: string;   // e.g. "Year 7"
  subject:   string;   // e.g. "Maths"
}

const CLASS_COLORS = [
  "#2563eb", "#16a34a", "#ea580c", "#9333ea",
  "#0891b2", "#dc2626", "#ca8a04", "#0d9488",
];

function colorForIndex(i: number) {
  return CLASS_COLORS[i % CLASS_COLORS.length]!;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Blank form state ──────────────────────────────────────────────────────────
const BLANK = { name: "", yearGroup: "", subject: "" };

export function ClassSelectorBar({
  classes,
  activeClassId,
  onSelect,
  onClassesChange,
}: {
  classes:         TeacherClass[];
  activeClassId:   string | null;
  onSelect:        (id: string) => void;
  onClassesChange: (next: TeacherClass[]) => void;
}) {
  const [open,       setOpen]       = useState(false);
  const [addMode,    setAddMode]    = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [form,       setForm]       = useState(BLANK);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false); setAddMode(false); setEditId(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = classes.find((c) => c.id === activeClassId) ?? null;

  function startAdd() { setForm(BLANK); setAddMode(true); setEditId(null); }
  function startEdit(c: TeacherClass) { setForm({ name: c.name, yearGroup: c.yearGroup, subject: c.subject }); setEditId(c.id); setAddMode(false); }

  function commitAdd() {
    if (!form.name.trim()) return;
    const next: TeacherClass = { id: uid(), name: form.name.trim(), yearGroup: form.yearGroup.trim(), subject: form.subject.trim() };
    onClassesChange([...classes, next]);
    onSelect(next.id);
    setAddMode(false); setOpen(false);
  }

  function commitEdit() {
    if (!editId || !form.name.trim()) return;
    onClassesChange(classes.map((c) => c.id === editId ? { ...c, name: form.name.trim(), yearGroup: form.yearGroup.trim(), subject: form.subject.trim() } : c));
    setEditId(null);
  }

  function deleteClass(id: string) {
    const next = classes.filter((c) => c.id !== id);
    onClassesChange(next);
    if (activeClassId === id) onSelect(next[0]?.id ?? "");
  }

  return (
    <div ref={panelRef} style={{ position: "relative", fontFamily: N_FONT }}>
      {/* Trigger bar */}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setAddMode(false); setEditId(null); }}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "7px 14px 7px 10px",
          borderRadius: "10px",
          border: `1px solid ${active ? ACCENT_BORDER : N_BORDER_MED}`,
          background: active ? ACCENT_LIGHT : "white",
          cursor: "pointer", fontFamily: N_FONT,
          boxShadow: active ? `0 0 0 3px ${ACCENT_BORDER}` : "none",
          transition: "all 0.15s",
        }}
      >
        {/* Colour dot */}
        <span style={{
          width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
          background: active ? colorForIndex(classes.indexOf(active)) : N_MUTED,
        }} />
        <BookOpen size={13} style={{ color: active ? ACCENT_TEXT : N_MUTED, flexShrink: 0 }} />
        <span style={{ fontSize: "13px", fontWeight: 700, color: active ? ACCENT_TEXT : N_MUTED }}>
          {active ? active.name : "Select class"}
        </span>
        {active && (active.yearGroup || active.subject) && (
          <span style={{ fontSize: "11px", color: active ? ACCENT_TEXT : N_MUTED, opacity: 0.7 }}>
            {[active.yearGroup, active.subject].filter(Boolean).join(" · ")}
          </span>
        )}
        <ChevronDown size={12} style={{ color: active ? ACCENT_TEXT : N_MUTED, marginLeft: "2px", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
          background: "white", borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.14)", padding: "10px",
          border: `1px solid ${N_BORDER_MED}`, minWidth: "300px",
        }}>
          <p style={{ margin: "0 0 8px", padding: "0 6px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: N_MUTED }}>
            Your Classes
          </p>

          {/* Class list */}
          {classes.length === 0 && !addMode && (
            <p style={{ margin: "0 0 8px", padding: "6px", fontSize: "13px", color: N_MUTED }}>No classes yet — add one below.</p>
          )}

          {classes.map((c, i) => (
            <div key={c.id}>
              {editId === c.id ? (
                <ClassForm form={form} onChange={setForm} onCommit={commitEdit} onCancel={() => setEditId(null)} label="Save" />
              ) : (
                <div
                  onClick={() => { onSelect(c.id); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 8px", borderRadius: "8px", cursor: "pointer",
                    background: c.id === activeClassId ? ACCENT_LIGHT : "transparent",
                    marginBottom: "2px",
                  }}
                >
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: colorForIndex(i), flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>{c.name}</p>
                    {(c.yearGroup || c.subject) && (
                      <p style={{ margin: 0, fontSize: "11px", color: N_MUTED }}>{[c.yearGroup, c.subject].filter(Boolean).join(" · ")}</p>
                    )}
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); startEdit(c); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: N_MUTED, padding: "3px", borderRadius: "4px", display: "flex", alignItems: "center" }}>
                    <Pencil size={12} />
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); deleteClass(c.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: N_MUTED, padding: "3px", borderRadius: "4px", display: "flex", alignItems: "center" }}>
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add form */}
          {addMode ? (
            <ClassForm form={form} onChange={setForm} onCommit={commitAdd} onCancel={() => setAddMode(false)} label="Add Class" />
          ) : (
            <button type="button" onClick={startAdd}
              style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%", marginTop: "4px", padding: "7px 8px", borderRadius: "8px", border: `1px dashed ${N_BORDER_MED}`, background: "none", cursor: "pointer", fontSize: "12px", color: N_MUTED, fontFamily: N_FONT }}>
              <Plus size={13} /> Add a class
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ClassForm({ form, onChange, onCommit, onCancel, label }: {
  form: { name: string; yearGroup: string; subject: string };
  onChange: (f: { name: string; yearGroup: string; subject: string }) => void;
  onCommit: () => void;
  onCancel: () => void;
  label: string;
}) {
  return (
    <div style={{ padding: "10px", borderRadius: "8px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, marginBottom: "6px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <input
        value={form.name} autoFocus
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter") onCommit(); if (e.key === "Escape") onCancel(); }}
        placeholder="Class name  e.g. 7A Maths, 10B English"
        style={{ padding: "7px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, width: "100%", boxSizing: "border-box" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        <input
          value={form.yearGroup}
          onChange={(e) => onChange({ ...form, yearGroup: e.target.value })}
          placeholder="Year group  e.g. Year 7"
          style={{ padding: "6px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER_MED}`, fontSize: "12px", fontFamily: N_FONT }} />
        <input
          value={form.subject}
          onChange={(e) => onChange({ ...form, subject: e.target.value })}
          placeholder="Subject  e.g. Maths"
          style={{ padding: "6px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER_MED}`, fontSize: "12px", fontFamily: N_FONT }} />
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        <button type="button" onClick={onCommit}
          style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 14px", borderRadius: "7px", background: ACCENT, border: "none", color: "white", fontWeight: 700, fontSize: "12px", cursor: "pointer", fontFamily: N_FONT }}>
          <Check size={12} /> {label}
        </button>
        <button type="button" onClick={onCancel}
          style={{ padding: "6px 10px", borderRadius: "7px", background: "white", border: `1px solid ${N_BORDER_MED}`, color: N_MUTED, fontSize: "12px", cursor: "pointer", fontFamily: N_FONT }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
