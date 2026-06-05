"use client";
import { N_FG, N_MUTED, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, asText } from "./utils";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";

export function TeacherDashboard({
  databases,
  criteria,
}: {
  databases: WorkspaceDatabase[];
  criteria: Record<string, unknown> | null;
}) {
  const docsDb   = databases.find((d) => d.nicheId === "teacher" && d.dbId === "documents") ?? null;
  const allDocs  = docsDb?.rows ?? [];
  const lessons  = allDocs.filter((r) => asText(r.properties["Type"]) === "Lesson Plan");
  const reports  = allDocs.filter((r) => asText(r.properties["Type"]) === "Report Comment");
  const assessments = allDocs.filter((r) => asText(r.properties["Type"]) === "Assessment");

  const subject    = String(criteria?.["subject"]     ?? "").trim();
  const yearGroups = String(criteria?.["year-groups"] ?? "").trim();
  const schoolName = String(criteria?.["school-name"] ?? "").trim();

  const stats = [
    { label: "Lesson Plans",    value: lessons.length,    color: "#2563eb" },
    { label: "Report Comments", value: reports.length,    color: "#16a34a" },
    { label: "Assessments",     value: assessments.length, color: "#ea580c" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>
          {schoolName ? `${schoolName} — Planning Hub` : "Teacher Planning Hub"}
        </h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
          {subject && yearGroups ? `${subject} · ${yearGroups}` : "Your AI-powered lesson planning workspace."}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: "16px", borderRadius: "10px", border: `1px solid ${N_BORDER_MED}`, background: "white", textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 800, color: s.color }}>{s.value}</p>
            <p style={{ margin: 0, fontSize: "12px", color: N_MUTED }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Getting started */}
      {allDocs.length === 0 && (
        <div style={{ padding: "20px", borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT }}>
          <p style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>Get started in 3 steps</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { n: "1", label: "Lesson Planner", desc: "Give a topic and year group — AI builds your full lesson plan in seconds." },
              { n: "2", label: "Report Writer",  desc: "Enter a student name and grades — AI writes a professional report comment." },
              { n: "3", label: "My Documents",   desc: "All saved plans and reports in one place — export to PDF with one click." },
            ].map((s) => (
              <div key={s.n} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0, width: "22px", height: "22px", borderRadius: "50%", background: ACCENT, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>{s.n}</span>
                <div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: ACCENT_TEXT }}>{s.label}</span>
                  <span style={{ fontSize: "13px", color: N_MUTED }}> — {s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent documents */}
      {allDocs.length > 0 && (
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER_MED}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Recent Documents</p>
          </div>
          {allDocs.slice(0, 6).map((row) => {
            const type    = asText(row.properties["Type"]);
            const title   = asText(row.properties["Title"]);
            const subject = asText(row.properties["Subject"]);
            const yr      = asText(row.properties["Year Group"]);
            const colors: Record<string, string> = { "Lesson Plan": "#2563eb", "Report Comment": "#16a34a", "Assessment": "#ea580c" };
            const color = colors[type] ?? ACCENT;
            return (
              <div key={row.pageId} style={{ padding: "10px 16px", borderBottom: `1px solid rgba(0,0,0,0.05)`, display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", background: `${color}18`, color, border: `1px solid ${color}30` }}>{type}</span>
                <span style={{ flex: 1, fontSize: "13px", color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Untitled"}</span>
                {(subject || yr) && <span style={{ fontSize: "11px", color: N_MUTED, flexShrink: 0 }}>{[subject, yr].filter(Boolean).join(" · ")}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
