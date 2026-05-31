"use client";
import { useState } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const ACCENT = "#4f46e5";

function asText(v: unknown): string { return v == null ? "" : String(v); }

interface BreakdownTask {
  task: string;
  priority: "High" | "Medium" | "Low";
  type: string;
  notes: string;
}

interface BreakdownResult {
  tasks: BreakdownTask[];
  summary: string;
}

export function PMTaskBreakdown({
  tasksDb,
  projectsDb,
  onRowAdded,
}: {
  tasksDb: WorkspaceDatabase | null;
  projectsDb: WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const projects = projectsDb?.rows ?? [];

  const [goal, setGoal] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BreakdownResult | null>(null);
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  async function breakdown() {
    if (!goal.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAddResult(null);
    setChecked(new Set());
    try {
      const res = await fetch("/api/members/pm-breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: goal.trim(),
          project: selectedProject,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as BreakdownResult;
      setResult(data);
      setChecked(new Set(data.tasks.map((_, i) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  async function addToTasks() {
    if (!result || !tasksDb || checked.size === 0) return;
    setAdding(true);
    setAddResult(null);
    let added = 0;
    try {
      for (const i of checked) {
        const t = result.tasks[i];
        if (!t) continue;
        const res = await fetch("/api/members/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId: tasksDb.notionId,
            properties: {
              "Task":     t.task,
              "Project":  selectedProject,
              "Status":   "To Do",
              "Priority": t.priority,
              "Type":     t.type,
              "Notes":    t.notes,
            },
            propertyTypes: {
              "Task": "title", "Project": "rich_text", "Status": "select",
              "Priority": "select", "Type": "select", "Notes": "rich_text",
            },
          }),
        });
        if (res.ok) {
          const data = await res.json() as { pageId?: string };
          if (data.pageId) {
            onRowAdded(tasksDb.notionId, {
              pageId: data.pageId,
              properties: {
                "Task":     t.task,
                "Project":  selectedProject,
                "Status":   "To Do",
                "Priority": t.priority,
                "Type":     t.type,
                "Notes":    t.notes,
              },
            });
            added++;
          }
        }
      }
      setAddResult(`✓ Added ${added} task${added !== 1 ? "s" : ""}${selectedProject ? ` to "${selectedProject}"` : ""}`);
      setChecked(new Set());
    } catch {
      setAddResult("Something went wrong — please try again.");
    } finally {
      setAdding(false);
    }
  }

  const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
    High:   { bg: "rgba(239,68,68,0.1)",   color: "#dc2626" },
    Medium: { bg: "rgba(245,158,11,0.1)",  color: "#d97706" },
    Low:    { bg: "rgba(59,130,246,0.1)",  color: "#2563eb" },
  };

  return (
    <div style={{ maxWidth: "680px", fontFamily: N_FONT }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800, color: N_FG }}>Task Breakdown</h1>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          Describe a goal or deliverable and the AI will break it into actionable tasks you can add straight to your board.
        </p>
      </div>

      {/* Goal input */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: N_FG, marginBottom: "6px" }}>
          What do you want to achieve?
        </label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Launch a landing page for my new product by end of the month"
          rows={3}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "10px 12px", borderRadius: "6px",
            border: `1px solid ${N_BORDER}`, fontSize: "13px",
            color: N_FG, fontFamily: N_FONT, resize: "vertical",
            lineHeight: 1.6, outline: "none",
          }}
        />
      </div>

      {/* Project selector */}
      {projects.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: N_FG, marginBottom: "6px" }}>
            Assign to project <span style={{ fontWeight: 400, color: N_SUBTLE }}>(optional)</span>
          </label>
          <div style={{ position: "relative", display: "inline-block", width: "100%", maxWidth: "320px" }}>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{
                width: "100%", padding: "8px 32px 8px 10px",
                borderRadius: "6px", border: `1px solid ${N_BORDER}`,
                fontSize: "13px", color: N_FG, fontFamily: N_FONT,
                background: "white", appearance: "none",
              }}
            >
              <option value="">— No project —</option>
              {projects.map((p) => (
                <option key={p.pageId} value={asText(p.properties["Name"])}>{asText(p.properties["Name"])}</option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: N_SUBTLE, pointerEvents: "none" }} />
          </div>
        </div>
      )}

      <button
        onClick={() => void breakdown()}
        disabled={loading || !goal.trim()}
        style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "11px 26px", borderRadius: "6px", border: "none",
          background: loading || !goal.trim() ? "rgba(55,53,47,0.12)" : ACCENT,
          color: loading || !goal.trim() ? N_MUTED : "white",
          fontSize: "14px", fontWeight: 600,
          cursor: loading || !goal.trim() ? "default" : "pointer",
          fontFamily: N_FONT, marginBottom: "28px",
        }}
      >
        {loading
          ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Breaking it down…</>
          : "Break it down"
        }
      </button>

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: "6px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", fontSize: "13px", color: "#b91c1c", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {result && (
        <div>
          {result.summary && (
            <div style={{ marginBottom: "16px", padding: "12px 14px", borderRadius: "8px", background: "rgba(79,70,229,0.05)", border: "1px solid rgba(79,70,229,0.12)" }}>
              <p style={{ margin: 0, fontSize: "13px", color: N_FG, lineHeight: 1.6 }}>{result.summary}</p>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: N_FG }}>
              {result.tasks.length} tasks generated — {checked.size} selected
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setChecked(new Set(result.tasks.map((_, i) => i)))} style={{ fontSize: "11px", color: ACCENT, background: "none", border: "none", cursor: "pointer", fontFamily: N_FONT }}>Select all</button>
              <button onClick={() => setChecked(new Set())} style={{ fontSize: "11px", color: N_SUBTLE, background: "none", border: "none", cursor: "pointer", fontFamily: N_FONT }}>Clear</button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
            {result.tasks.map((t, i) => {
              const isChecked = checked.has(i);
              const ps = PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE["Medium"]!
              return (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "10px",
                    padding: "10px 14px", borderRadius: "8px",
                    border: `1px solid ${isChecked ? "rgba(79,70,229,0.25)" : N_BORDER}`,
                    background: isChecked ? "rgba(79,70,229,0.04)" : "white",
                    cursor: "pointer", fontFamily: N_FONT, textAlign: "left",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "3px", flexShrink: 0, marginTop: "1px",
                    border: `2px solid ${isChecked ? ACCENT : N_BORDER}`,
                    background: isChecked ? ACCENT : "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isChecked && <span style={{ color: "white", fontSize: "10px", lineHeight: 1 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 3px", fontSize: "13px", fontWeight: isChecked ? 600 : 400, color: N_FG, lineHeight: 1.4 }}>{t.task}</p>
                    {t.notes && (
                      <p style={{ margin: 0, fontSize: "11px", color: N_MUTED, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.notes}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0, alignItems: "center" }}>
                    {t.type && (
                      <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "99px", background: "rgba(79,70,229,0.08)", color: ACCENT, fontWeight: 500 }}>{t.type}</span>
                    )}
                    <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "99px", background: ps.bg, color: ps.color }}>{t.priority}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {addResult && (
            <div style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "6px", background: addResult.startsWith("✓") ? "rgba(22,163,74,0.07)" : "rgba(220,38,38,0.07)", border: `1px solid ${addResult.startsWith("✓") ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`, fontSize: "13px", color: addResult.startsWith("✓") ? "#15803d" : "#b91c1c" }}>
              {addResult}
            </div>
          )}

          <button
            onClick={() => void addToTasks()}
            disabled={adding || checked.size === 0 || !tasksDb}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "10px 24px", borderRadius: "6px", border: "none",
              background: (adding || checked.size === 0 || !tasksDb) ? "rgba(55,53,47,0.12)" : ACCENT,
              color: (adding || checked.size === 0 || !tasksDb) ? N_MUTED : "white",
              fontSize: "14px", fontWeight: 600,
              cursor: (adding || checked.size === 0 || !tasksDb) ? "default" : "pointer",
              fontFamily: N_FONT,
            }}
          >
            {adding
              ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Adding…</>
              : `Add ${checked.size} task${checked.size !== 1 ? "s" : ""} to board`
            }
          </button>
        </div>
      )}
    </div>
  );
}
