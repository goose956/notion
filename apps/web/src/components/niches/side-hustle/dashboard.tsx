"use client";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";
import { asText, asNumber, ACCENT, ACCENT_LIGHT, ACCENT_BORDER, GOAL_BADGE, PLAN_SECTIONS } from "./utils";

const SH_GRADIENT = "linear-gradient(135deg, #431407 0%, #9a3412 40%, #ea580c 75%, #fdba74 100%)";
const SH_SHADOW   = "rgba(234,88,12,0.30)";

export function SideHustleDashboard({
  databases,
  criteria,
  nicheId = "side-hustle",
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
  nicheId?:  string;
}) {
  const businessName  = asText(criteria?.["business-name"]) || "Your Business";
  const goal          = asText(criteria?.["primary-goal"]);
  const goalBadge     = GOAL_BADGE[goal] ?? null;

  const docsDb        = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents")    ?? null;
  const financialsDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "financials")   ?? null;
  const milestonesDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "milestones")   ?? null;

  // Plan completeness
  const generatedSections = new Set(
    (docsDb?.rows ?? []).map((r) => asText(r.properties["Section"])).filter(Boolean),
  );
  const completeness = Math.round((generatedSections.size / PLAN_SECTIONS.length) * 100);

  // Financial snapshot — last row in projections
  const finRows      = financialsDb?.rows ?? [];
  const lastFinRow   = finRows[finRows.length - 1] ?? null;
  const peakRevenue  = lastFinRow ? asNumber(lastFinRow.properties["Revenue"]) : null;
  const peakProfit   = lastFinRow ? asNumber(lastFinRow.properties["Profit"])  : null;
  const breakEvenRow = finRows.find((r) => (asNumber(r.properties["Cumulative Profit"]) ?? -1) >= 0);

  // Milestones
  const allMilestones  = milestonesDb?.rows ?? [];
  const doneMilestones = allMilestones.filter((r) => asText(r.properties["Status"]) === "Done").length;
  const nextMilestones = allMilestones
    .filter((r) => asText(r.properties["Status"]) !== "Done")
    .slice(0, 3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>

      {/* HERO */}
      <section style={{ borderRadius: "16px", background: SH_GRADIENT, overflow: "hidden", boxShadow: `0 12px 40px ${SH_SHADOW}`, padding: "22px 26px 20px" }}>
        <p style={{ margin: "0 0 6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
          🚀 Side Hustle Business Plan
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "white", textShadow: "0 1px 6px rgba(0,0,0,0.25)" }}>
            {businessName}
          </h2>
          {goalBadge && (
            <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "99px", background: "rgba(255,255,255,0.18)", color: "white", fontWeight: 600, border: "1px solid rgba(255,255,255,0.3)" }}>
              {goalBadge.label}
            </span>
          )}
        </div>

        {/* Plan progress bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.09em" }}>
              Plan completeness
            </p>
            <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "white" }}>{completeness}%</p>
          </div>
          <div style={{ height: "6px", borderRadius: "99px", background: "rgba(255,255,255,0.20)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${completeness}%`, borderRadius: "99px", background: "white", transition: "width 0.4s ease" }} />
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.55)" }}>
            {generatedSections.size} of {PLAN_SECTIONS.length} sections generated
          </p>
        </div>
      </section>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
        <div style={{ borderRadius: "12px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#c2410c" }}>Peak monthly revenue</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>
            {peakRevenue !== null ? `£${peakRevenue.toLocaleString()}` : "—"}
          </p>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>month 12 projection</p>
        </div>

        <div style={{ borderRadius: "12px", background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.18)", padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#065f46" }}>Peak monthly profit</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>
            {peakProfit !== null ? `£${peakProfit.toLocaleString()}` : "—"}
          </p>
          {breakEvenRow && <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>Break-even: {asText(breakEvenRow.properties["Month"])}</p>}
        </div>

        <div style={{ borderRadius: "12px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)", padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#1d4ed8" }}>Milestones done</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>
            {doneMilestones}<span style={{ fontSize: "14px", fontWeight: 500, color: N_SUBTLE }}>/{allMilestones.length}</span>
          </p>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>{allMilestones.length - doneMilestones} remaining</p>
        </div>
      </div>

      {/* PLAN SECTIONS STATUS */}
      <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}` }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Your business plan</p>
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>Use the Plan Builder tab to generate each section</p>
        </div>
        <div>
          {PLAN_SECTIONS.map((section, i) => {
            const done = generatedSections.has(section);
            return (
              <div key={section} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 16px", borderBottom: i < PLAN_SECTIONS.length - 1 ? `1px solid ${N_BORDER}` : "none" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${done ? ACCENT : N_BORDER_MED}`, background: done ? ACCENT : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {done && <span style={{ color: "white", fontSize: "11px", lineHeight: 1 }}>✓</span>}
                </div>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: done ? 600 : 400, color: done ? N_FG : N_SUBTLE }}>{section}</p>
                {done && <span style={{ marginLeft: "auto", fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: ACCENT_LIGHT, color: "#c2410c", fontWeight: 600 }}>Generated</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* NEXT MILESTONES */}
      {nextMilestones.length > 0 && (
        <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Next up</p>
          </div>
          <div>
            {nextMilestones.map((m, i) => {
              const name     = asText(m.properties["Milestone"]);
              const category = asText(m.properties["Category"]);
              const priority = asText(m.properties["Priority"]);
              const isHigh   = priority === "High";
              return (
                <div key={m.pageId} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 16px", borderBottom: i < nextMilestones.length - 1 ? `1px solid ${N_BORDER}` : "none" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: isHigh ? "#ef4444" : "#94a3b8", flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: N_FG, flex: 1 }}>{name}</p>
                  <span style={{ fontSize: "10px", color: N_SUBTLE }}>{category}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
