"use client";
import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";

const ACCENT = "#4f46e5";

function asText(v: unknown): string { return v == null ? "" : String(v); }

function isOverdue(dueDate: unknown): boolean {
  if (!dueDate) return false;
  return new Date(asText(dueDate)) < new Date(new Date().toDateString());
}

interface FocusResult {
  topPick: string;
  reason: string;
  suggestions: Array<{ task: string; project: string; why: string }>;
  advice: string;
}

export function PMFocusMode({
  projectsDb,
  tasksDb,
  criteria,
}: {
  projectsDb: WorkspaceDatabase | null;
  tasksDb: WorkspaceDatabase | null;
  criteria: Record<string, unknown> | null;
}) {
  const taskRows    = tasksDb?.rows ?? [];
  const projectRows = projectsDb?.rows ?? [];

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<FocusResult | null>(null);

  const openTasks = taskRows.filter((t) => asText(t.properties["Status"]) !== "Done");
  const overdueTasks = openTasks.filter((t) => isOverdue(t.properties["Due Date"]));

  // Summary by project for display
  const byProject = projectRows
    .filter((p) => asText(p.properties["Status"]) !== "Done")
    .map((p) => {
      const name = asText(p.properties["Name"]);
      const tasks = openTasks.filter((t) => asText(t.properties["Project"]).toLowerCase() === name.toLowerCase());
      return { name, count: tasks.length, priority: asText(p.properties["Priority"]) };
    })
    .filter((p) => p.count > 0);

  async function getFocusRecommendation() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/members/pm-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: openTasks.map((t) => ({
            task:     asText(t.properties["Task"]),
            project:  asText(t.properties["Project"]),
            priority: asText(t.properties["Priority"]),
            status:   asText(t.properties["Status"]),
            dueDate:  asText(t.properties["Due Date"]),
            type:     asText(t.properties["Type"]),
          })),
          projects: projectRows
            .filter((p) => asText(p.properties["Status"]) !== "Done")
            .map((p) => ({
              name:     asText(p.properties["Name"]),
              priority: asText(p.properties["Priority"]),
              goal:     asText(p.properties["Goal"]),
              status:   asText(p.properties["Status"]),
            })),
          criteria: {
            activeProjects: asText(criteria?.["active-projects"]),
            goodWeek:       asText(criteria?.["good-week"]),
            workAreas:      criteria?.["work-areas"],
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as FocusResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "680px", fontFamily: N_FONT }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800, color: N_FG }}>Focus Mode</h1>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          Tell the AI what&apos;s on your plate and it will tell you exactly what to work on next.
        </p>
      </div>

      {/* Task summary */}
      <div style={{ borderRadius: "10px", border: `1px solid ${N_BORDER}`, padding: "16px", marginBottom: "20px", background: "white" }}>
        <p style={{ margin: "0 0 10px", fontSize: "12px", fontWeight: 700, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Your current workload
        </p>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: byProject.length > 0 ? "12px" : 0 }}>
          <div>
            <span style={{ fontSize: "20px", fontWeight: 800, color: ACCENT }}>{openTasks.length}</span>
            <span style={{ fontSize: "12px", color: N_MUTED, marginLeft: "5px" }}>open tasks</span>
          </div>
          {overdueTasks.length > 0 && (
            <div>
              <span style={{ fontSize: "20px", fontWeight: 800, color: "#dc2626" }}>{overdueTasks.length}</span>
              <span style={{ fontSize: "12px", color: N_MUTED, marginLeft: "5px" }}>overdue</span>
            </div>
          )}
        </div>
        {byProject.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {byProject.map((p) => (
              <span key={p.name} style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "99px", background: "rgba(79,70,229,0.07)", color: ACCENT, fontWeight: 500 }}>
                {p.name} · {p.count}
              </span>
            ))}
          </div>
        )}
        {openTasks.length === 0 && (
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>No open tasks — add some tasks first.</p>
        )}
      </div>

      <button
        onClick={() => void getFocusRecommendation()}
        disabled={loading || openTasks.length === 0}
        style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "11px 26px", borderRadius: "6px", border: "none",
          background: loading || openTasks.length === 0 ? "rgba(55,53,47,0.12)" : ACCENT,
          color: loading || openTasks.length === 0 ? N_MUTED : "white",
          fontSize: "14px", fontWeight: 600,
          cursor: loading || openTasks.length === 0 ? "default" : "pointer",
          fontFamily: N_FONT, marginBottom: "24px",
        }}
      >
        {loading
          ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Thinking…</>
          : <><Zap size={15} /> What should I work on?</>
        }
      </button>

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: "6px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", fontSize: "13px", color: "#b91c1c", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Top pick */}
          <div style={{ borderRadius: "12px", background: "linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)", padding: "20px 22px", boxShadow: "0 6px 20px rgba(79,70,229,0.2)" }}>
            <p style={{ margin: "0 0 6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
              ⚡ Top priority right now
            </p>
            <p style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800, color: "white", lineHeight: 1.3 }}>{result.topPick}</p>
            <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>{result.reason}</p>
          </div>

          {/* Next suggestions */}
          {result.suggestions?.length > 0 && (
            <div style={{ borderRadius: "10px", border: `1px solid ${N_BORDER}`, background: "white", overflow: "hidden" }}>
              <p style={{ margin: 0, padding: "10px 14px", fontSize: "11px", fontWeight: 700, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${N_BORDER}` }}>
                Also worth tackling this week
              </p>
              {result.suggestions.map((s, i) => (
                <div key={i} style={{ padding: "12px 14px", borderBottom: i < result.suggestions.length - 1 ? `1px solid ${N_BORDER}` : "none" }}>
                  <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: N_FG }}>{s.task}</p>
                  {s.project && <p style={{ margin: "0 0 2px", fontSize: "11px", color: N_SUBTLE }}>{s.project}</p>}
                  <p style={{ margin: 0, fontSize: "12px", color: N_MUTED, lineHeight: 1.5 }}>{s.why}</p>
                </div>
              ))}
            </div>
          )}

          {/* Advice */}
          {result.advice && (
            <div style={{ borderRadius: "8px", background: "rgba(79,70,229,0.05)", border: "1px solid rgba(79,70,229,0.12)", padding: "12px 14px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: N_FG, lineHeight: 1.6, fontStyle: "italic" }}>{result.advice}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
