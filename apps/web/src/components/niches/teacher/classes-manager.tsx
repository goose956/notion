"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, BookOpen, Users } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, T_SURFACE, T_SURFACE2 } from "./utils";
import type { TeacherClass } from "./class-selector";

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

const BLANK = { name: "", yearGroup: "", subject: "" };

function ClassForm({
  form,
  onChange,
  onCommit,
  onCancel,
  label,
}: {
  form: { name: string; yearGroup: string; subject: string };
  onChange: (f: { name: string; yearGroup: string; subject: string }) => void;
  onCommit: () => void;
  onCancel: () => void;
  label: string;
}) {
  return (
    <div style={{
      padding: "16px", borderRadius: "12px",
      border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT,
      display: "flex", flexDirection: "column", gap: "10px",
    }}>
      <div>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: N_MUTED, marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Class Name
        </label>
        <input
          value={form.name}
          autoFocus
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter") onCommit(); if (e.key === "Escape") onCancel(); }}
          placeholder="e.g. 7A Maths, 10B English, Sixth Form Biology"
          style={{
            width: "100%", padding: "9px 12px", borderRadius: "8px",
            border: `1px solid ${N_BORDER_MED}`, fontSize: "13px",
            fontFamily: N_FONT, boxSizing: "border-box",
          }}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: N_MUTED, marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Year Group
          </label>
          <input
            value={form.yearGroup}
            onChange={(e) => onChange({ ...form, yearGroup: e.target.value })}
            placeholder="e.g. Year 7, Sixth Form"
            style={{
              width: "100%", padding: "9px 12px", borderRadius: "8px",
              border: `1px solid ${N_BORDER_MED}`, fontSize: "13px",
              fontFamily: N_FONT, boxSizing: "border-box",
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: N_MUTED, marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Subject
          </label>
          <input
            value={form.subject}
            onChange={(e) => onChange({ ...form, subject: e.target.value })}
            placeholder="e.g. Maths, English, Biology"
            style={{
              width: "100%", padding: "9px 12px", borderRadius: "8px",
              border: `1px solid ${N_BORDER_MED}`, fontSize: "13px",
              fontFamily: N_FONT, boxSizing: "border-box",
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={onCommit}
          disabled={!form.name.trim()}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "8px 20px", borderRadius: "8px",
            background: ACCENT, border: "none", color: "white",
            fontWeight: 700, fontSize: "13px", cursor: "pointer",
            fontFamily: N_FONT, opacity: !form.name.trim() ? 0.5 : 1,
          }}
        >
          <Check size={14} /> {label}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "8px 14px", borderRadius: "8px",
            background: T_SURFACE2, border: `1px solid ${N_BORDER_MED}`,
            color: N_MUTED, fontSize: "13px", cursor: "pointer",
            fontFamily: N_FONT,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function TeacherClassesManager({
  classes,
  activeClassId,
  onClassesChange,
  onSelectClass,
}: {
  classes:         TeacherClass[];
  activeClassId:   string | null;
  onClassesChange: (next: TeacherClass[]) => void;
  onSelectClass:   (id: string) => void;
}) {
  const [adding,  setAdding]  = useState(false);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [form,    setForm]    = useState(BLANK);
  const [confirm, setConfirm] = useState<string | null>(null);

  function startAdd() { setForm(BLANK); setAdding(true); setEditId(null); }

  function commitAdd() {
    if (!form.name.trim()) return;
    const next: TeacherClass = {
      id: uid(),
      name: form.name.trim(),
      yearGroup: form.yearGroup.trim(),
      subject: form.subject.trim(),
    };
    const updated = [...classes, next];
    onClassesChange(updated);
    onSelectClass(next.id);
    setAdding(false);
  }

  function startEdit(c: TeacherClass) {
    setForm({ name: c.name, yearGroup: c.yearGroup, subject: c.subject });
    setEditId(c.id);
    setAdding(false);
  }

  function commitEdit() {
    if (!editId || !form.name.trim()) return;
    onClassesChange(
      classes.map((c) => c.id === editId
        ? { ...c, name: form.name.trim(), yearGroup: form.yearGroup.trim(), subject: form.subject.trim() }
        : c
      )
    );
    setEditId(null);
  }

  function deleteClass(id: string) {
    const next = classes.filter((c) => c.id !== id);
    onClassesChange(next);
    if (activeClassId === id) {
      onSelectClass(next[0]?.id ?? "");
    }
    setConfirm(null);
  }

  // Group classes by year group for the display
  const yearGroups = Array.from(new Set(classes.map((c) => c.yearGroup || "Other"))).sort();

  return (
    <div style={{ fontFamily: N_FONT, display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>My Classes</h2>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
            {classes.length === 0
              ? "Add your classes once — they'll be available across all tools."
              : `${classes.length} class${classes.length !== 1 ? "es" : ""} registered`
            }
          </p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={startAdd}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 16px", borderRadius: "8px",
              background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`,
              color: ACCENT_TEXT, fontWeight: 600, fontSize: "13px",
              cursor: "pointer", fontFamily: N_FONT,
            }}
          >
            <Plus size={14} /> Add Class
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <ClassForm
          form={form}
          onChange={setForm}
          onCommit={commitAdd}
          onCancel={() => setAdding(false)}
          label="Add Class"
        />
      )}

      {/* Empty state */}
      {classes.length === 0 && !adding && (
        <div style={{
          padding: "48px 32px", textAlign: "center",
          borderRadius: "16px", border: `2px dashed ${N_BORDER_MED}`,
          background: T_SURFACE,
        }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "50%",
            background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
          }}>
            <Users size={24} style={{ color: ACCENT_TEXT }} />
          </div>
          <p style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 700, color: N_FG }}>No classes yet</p>
          <p style={{ margin: "0 0 18px", fontSize: "13px", color: N_MUTED, maxWidth: "320px", marginLeft: "auto", marginRight: "auto" }}>
            Add your classes here — they'll appear as a selector bar inside Lesson Planner, Reports, Assessments, and Year Planner.
          </p>
          <button
            type="button"
            onClick={startAdd}
            style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "10px 20px", borderRadius: "8px",
              background: ACCENT, border: "none", color: "white",
              fontWeight: 700, fontSize: "13px", cursor: "pointer",
              fontFamily: N_FONT,
            }}
          >
            <Plus size={14} /> Add your first class
          </button>
        </div>
      )}

      {/* Class cards — grouped by year group */}
      {classes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {yearGroups.map((yg) => {
            const group = classes.filter((c) => (c.yearGroup || "Other") === yg);
            return (
              <div key={yg}>
                <p style={{
                  margin: "0 0 10px", fontSize: "11px", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.09em", color: N_MUTED,
                }}>
                  {yg}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
                  {group.map((c) => {
                    const idx = classes.indexOf(c);
                    const color = colorForIndex(idx);
                    const isActive = c.id === activeClassId;

                    if (editId === c.id) {
                      return (
                        <div key={c.id} style={{ gridColumn: "1 / -1" }}>
                          <ClassForm
                            form={form}
                            onChange={setForm}
                            onCommit={commitEdit}
                            onCancel={() => setEditId(null)}
                            label="Save Changes"
                          />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={c.id}
                        style={{
                          borderRadius: "12px",
                          border: `1px solid ${isActive ? ACCENT_BORDER : N_BORDER_MED}`,
                          background: isActive ? ACCENT_LIGHT : T_SURFACE,
                          padding: "14px 16px",
                          boxShadow: isActive ? `0 0 0 3px ${ACCENT_BORDER}` : "0 1px 3px rgba(0,0,0,0.06)",
                          transition: "all 0.15s",
                          position: "relative",
                        }}
                      >
                        {/* Colour bar on left */}
                        <div style={{
                          position: "absolute", left: 0, top: "12px", bottom: "12px",
                          width: "4px", borderRadius: "0 4px 4px 0",
                          background: color,
                        }} />

                        <div style={{ paddingLeft: "12px" }}>
                          {/* Name + active badge */}
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <BookOpen size={14} style={{ color, flexShrink: 0 }} />
                            <span style={{ fontSize: "14px", fontWeight: 700, color: N_FG, flex: 1 }}>{c.name}</span>
                            {isActive && (
                              <span style={{
                                fontSize: "10px", fontWeight: 700,
                                padding: "2px 8px", borderRadius: "99px",
                                background: ACCENT, color: "white",
                              }}>
                                Active
                              </span>
                            )}
                          </div>

                          {/* Year + subject chips */}
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                            {c.yearGroup && (
                              <span style={{
                                fontSize: "11px", padding: "2px 8px",
                                borderRadius: "99px", background: `${color}18`,
                                color, border: `1px solid ${color}30`, fontWeight: 600,
                              }}>
                                {c.yearGroup}
                              </span>
                            )}
                            {c.subject && (
                              <span style={{
                                fontSize: "11px", padding: "2px 8px",
                                borderRadius: "99px", background: N_BORDER,
                                color: N_MUTED, border: `1px solid ${N_BORDER_MED}`,
                              }}>
                                {c.subject}
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          {confirm === c.id ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "12px", color: "#dc2626", flex: 1 }}>Delete this class?</span>
                              <button
                                type="button"
                                onClick={() => deleteClass(c.id)}
                                style={{
                                  padding: "4px 12px", borderRadius: "6px",
                                  background: "#dc2626", border: "none",
                                  color: "white", fontWeight: 700, fontSize: "12px",
                                  cursor: "pointer", fontFamily: N_FONT,
                                }}
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirm(null)}
                                style={{
                                  padding: "4px 10px", borderRadius: "6px",
                                  background: T_SURFACE2, border: `1px solid ${N_BORDER_MED}`,
                                  color: N_MUTED, fontSize: "12px",
                                  cursor: "pointer", fontFamily: N_FONT,
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {!isActive && (
                                <button
                                  type="button"
                                  onClick={() => onSelectClass(c.id)}
                                  style={{
                                    flex: 1, padding: "6px 12px", borderRadius: "7px",
                                    background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`,
                                    color: ACCENT_TEXT, fontWeight: 600, fontSize: "12px",
                                    cursor: "pointer", fontFamily: N_FONT,
                                  }}
                                >
                                  Set Active
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => startEdit(c)}
                                style={{
                                  display: "flex", alignItems: "center", gap: "4px",
                                  padding: "6px 12px", borderRadius: "7px",
                                  background: T_SURFACE2, border: `1px solid ${N_BORDER_MED}`,
                                  color: N_MUTED, fontSize: "12px",
                                  cursor: "pointer", fontFamily: N_FONT,
                                }}
                              >
                                <Pencil size={12} /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirm(c.id)}
                                style={{
                                  display: "flex", alignItems: "center",
                                  padding: "6px 8px", borderRadius: "7px",
                                  background: T_SURFACE2, border: `1px solid ${N_BORDER_MED}`,
                                  color: "#dc2626", fontSize: "12px",
                                  cursor: "pointer", fontFamily: N_FONT,
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info strip */}
      {classes.length > 0 && (
        <div style={{
          padding: "12px 16px", borderRadius: "10px",
          background: "rgba(37,99,235,0.04)", border: `1px solid rgba(37,99,235,0.12)`,
          fontSize: "12px", color: N_MUTED,
        }}>
          <strong style={{ color: ACCENT_TEXT }}>Tip:</strong> The active class auto-fills year group and subject in Lesson Planner, Reports, Assessments, and Year Planner. Switch quickly using the class selector bar at the top of those tabs.
        </div>
      )}
    </div>
  );
}
