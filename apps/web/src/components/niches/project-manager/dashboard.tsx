"use client";
import { useMemo } from "react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";

const ACCENT = "#4f46e5";

function asText(v: unknown): string {
  return v == null ? "" : String(v);
}

function isOverdue(dueDate: unknown): boolean {
  if (!dueDate) return false;
  return new Date(asText(dueDate)) < new Date(new Date().toDateString());
}

function isDueThisWeek(dueDate: unknown): boolean {
  if (!dueDate) return false;
  const d = new Date(asText(dueDate));
  const now = new Date();
  const weekOut = new Date(now);
  weekOut.setDate(weekOut.getDate() + 7);
  return d >= new Date(now.toDateString()) && d <= weekOut;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    Active:     { bg: "rgba(22,163,74,0.1)",   text: "#15803d" },
    Paused:     { bg: "rgba(234,179,8,0.1)",    text: "#a16207" },
    Done:       { bg: "rgba(107,114,128,0.1)",  text: "#6b7280" },
    Blocked:    { bg: "rgba(220,38,38,0.1)",    text: "#b91c1c" },
  };
  const c = colors[status] ?? { bg: "rgba(79,70,229,0.1)", text: ACCENT };
  return (
    <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "99px", background: c.bg, color: c.text, fontFamily: N_FONT }}>
      {status}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = { High: "#ef4444", Medium: "#f59e0b", Low: "#3b82f6" };
  return (
    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: colors[priority] ?? "#9ca3af", display: "inline-block", flexShrink: 0 }} />
  );
}

export function PMDashboard({
  projectsDb,
  tasksDb,
  reviewsDb,
  criteria,
}: {
  projectsDb: WorkspaceDatabase | null;
  tasksDb: WorkspaceDatabase | null;
  reviewsDb: WorkspaceDatabase | null;
  criteria: Record<string, unknown> | null;
}) {
  const projectRows  = projectsDb?.rows ?? [];
  const taskRows     = tasksDb?.rows ?? [];

  const stats = useMemo(() => {
    const activeProjects = projectRows.filter((r) => asText(r.properties["Status"]) === "Active").length;
    const openTasks   = taskRows.filter((r) => asText(r.properties["Status"]) !== "Done").length;
    const overdueTasks = taskRows.filter((r) => asText(r.properties["Status"]) !== "Done" && isOverdue(r.properties["Due Date"])).length;
    const today = new Date().toDateString();
    const doneToday = taskRows.filter((r) => {
      // "done this week" — tasks marked Done with a due date this week
      return asText(r.properties["Status"]) === "Done" && isDueThisWeek(r.properties["Due Date"]);
    }).length;
    return { activeProjects, openTasks, overdueTasks, doneToday };
  }, [projectRows, taskRows]);

  const projectStats = useMemo(() => {
    return projectRows
      .filter((r) => asText(r.properties["Status"]) !== "Done")
      .map((project) => {
        const name = asText(project.properties["Name"]);
        const projectTasks = taskRows.filter((t) =>
          asText(t.properties["Project"]).toLowerCase() === name.toLowerCase()
        );
        const done = projectTasks.filter((t) => asText(t.properties["Status"]) === "Done").length;
        const overdue = projectTasks.filter((t) =>
          asText(t.properties["Status"]) !== "Done" && isOverdue(t.properties["Due Date"])
        ).length;
        const pct = projectTasks.length > 0 ? Math.round((done / projectTasks.length) * 100) : 0;
        return {
          pageId: project.pageId,
          name,
          status: asText(project.properties["Status"]) || "Active",
          priority: asText(project.properties["Priority"]) || "Medium",
          goal: asText(project.properties["Goal"]),
          total: projectTasks.length,
          done,
          overdue,
          pct,
        };
      })
      .sort((a, b) => {
        const pri: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
        return (pri[a.priority] ?? 1) - (pri[b.priority] ?? 1);
      });
  }, [projectRows, taskRows]);

  const upcomingTasks = useMemo(() => {
    return taskRows
      .filter((t) => asText(t.properties["Status"]) !== "Done" && isDueThisWeek(t.properties["Due Date"]))
      .sort((a, b) => {
        const da = new Date(asText(a.properties["Due Date"]));
        const db = new Date(asText(b.properties["Due Date"]));
        return da.getTime() - db.getTime();
      })
      .slice(0, 10);
  }, [taskRows]);

  const statItems = [
    { label: "Active Projects", value: stats.activeProjects, color: ACCENT },
    { label: "Open Tasks",      value: stats.openTasks,      color: "#0891b2" },
    { label: "Overdue",         value: stats.overdueTasks,   color: stats.overdueTasks > 0 ? "#dc2626" : "#6b7280" },
    { label: "Done This Week",  value: stats.doneToday,      color: "#16a34a" },
  ];

  return (
    <div style={{ maxWidth: "860px", fontFamily: N_FONT }}>
      {/* Header */}
      <div style={{
        borderRadius: "14px",
        background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 45%, #4f46e5 75%, #818cf8 100%)",
        padding: "22px 28px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 8px 28px rgba(79,70,229,0.25)",
      }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
            🗂️ Project HQ
          </p>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "white" }}>
            {criteria?.["active-projects"] ? String(criteria["active-projects"]) : "Your Projects"}
          </h1>
          {criteria?.["good-week"] ? (
            <p style={{ margin: "6px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
              Goal: {String(criteria["good-week"])}
            </p>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <span style={{ fontSize: "36px", fontWeight: 800, color: "white", lineHeight: 1 }}>{stats.activeProjects}</span>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>active projects</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "24px" }}>
        {statItems.map((s) => (
          <div key={s.label} style={{ borderRadius: "10px", border: `1px solid ${N_BORDER}`, background: "white", padding: "14px 16px" }}>
            <p style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: s.color }}>{s.value}</p>
            <p style={{ margin: 0, fontSize: "11px", color: N_SUBTLE, fontWeight: 500 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Projects */}
      {projectStats.length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700, color: N_FG, letterSpacing: "0.01em" }}>Active Projects</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {projectStats.map((p) => (
              <div key={p.pageId} style={{ borderRadius: "10px", border: `1px solid ${N_BORDER}`, background: "white", padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <PriorityDot priority={p.priority} />
                  <span style={{ fontSize: "14px", fontWeight: 700, color: N_FG, flex: 1 }}>{p.name}</span>
                  <StatusBadge status={p.status} />
                  {p.overdue > 0 && (
                    <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: 600 }}>⚠ {p.overdue} overdue</span>
                  )}
                </div>
                {p.goal && (
                  <p style={{ margin: "0 0 8px", fontSize: "12px", color: N_MUTED, lineHeight: 1.4 }}>{p.goal}</p>
                )}
                {p.total > 0 ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", color: N_SUBTLE }}>{p.done}/{p.total} tasks done</span>
                      <span style={{ fontSize: "11px", color: N_SUBTLE }}>{p.pct}%</span>
                    </div>
                    <div style={{ height: "5px", borderRadius: "99px", background: N_BORDER, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${p.pct}%`, background: ACCENT, borderRadius: "99px", transition: "width 0.3s" }} />
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: "11px", color: N_SUBTLE }}>No tasks yet — use Apply Templates to get started</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {projectStats.length === 0 && projectRows.length === 0 && (
        <div style={{ borderRadius: "10px", border: `1px dashed ${N_BORDER_MED}`, padding: "24px", textAlign: "center", marginBottom: "28px" }}>
          <p style={{ fontSize: "14px", color: N_MUTED, margin: "0 0 6px" }}>No projects yet</p>
          <p style={{ fontSize: "12px", color: N_SUBTLE, margin: 0 }}>Add your first project in the Projects database, then use Apply Templates to populate its tasks.</p>
        </div>
      )}

      {/* Upcoming tasks */}
      {upcomingTasks.length > 0 && (
        <div>
          <h2 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700, color: N_FG, letterSpacing: "0.01em" }}>Due This Week</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {upcomingTasks.map((t) => {
              const overdue = isOverdue(t.properties["Due Date"]);
              const dueStr = t.properties["Due Date"]
                ? new Date(asText(t.properties["Due Date"])).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
                : "";
              return (
                <div key={t.pageId} style={{
                  borderRadius: "8px",
                  border: `1px solid ${overdue ? "rgba(220,38,38,0.25)" : N_BORDER}`,
                  background: overdue ? "rgba(220,38,38,0.03)" : "white",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}>
                  <PriorityDot priority={asText(t.properties["Priority"])} />
                  <span style={{ flex: 1, fontSize: "13px", color: N_FG, fontWeight: 500 }}>{asText(t.properties["Task"])}</span>
                  {asText(t.properties["Project"]) && (
                    <span style={{ fontSize: "11px", color: N_SUBTLE, padding: "2px 7px", background: "rgba(79,70,229,0.07)", borderRadius: "99px" }}>
                      {asText(t.properties["Project"])}
                    </span>
                  )}
                  {dueStr && (
                    <span style={{ fontSize: "11px", color: overdue ? "#dc2626" : N_SUBTLE, flexShrink: 0, fontWeight: overdue ? 600 : 400 }}>
                      {overdue ? "⚠ " : ""}{dueStr}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
