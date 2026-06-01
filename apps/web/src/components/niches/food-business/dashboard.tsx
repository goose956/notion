"use client";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";
import { asText, asNumber, ACCENT, ACCENT_LIGHT, ACCENT_BORDER, GOAL_BADGE, PLAN_SECTIONS, getCurrencyCode, formatCurrency } from "./utils";

const FD_GRADIENT = "linear-gradient(135deg, #450a0a 0%, #991b1b 40%, #dc2626 75%, #fca5a5 100%)";
const FD_SHADOW   = "rgba(220,38,38,0.30)";

export function FoodBusinessDashboard({
  databases,
  criteria,
  nicheId = "food-business",
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
  nicheId?:  string;
}) {
  const currency     = getCurrencyCode(criteria);
  const businessName = asText(criteria?.["business-name"]) || "Your Food Business";
  const foodType     = asText(criteria?.["food-type"]);
  const goal         = asText(criteria?.["primary-goal"]);
  const goalBadge    = GOAL_BADGE[goal] ?? null;

  const docsDb       = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents")   ?? null;
  const financialsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "financials")  ?? null;
  const licencesDb   = databases.find((d) => d.nicheId === nicheId && d.dbId === "licences")    ?? null;
  const menuDb       = databases.find((d) => d.nicheId === nicheId && d.dbId === "menu")        ?? null;

  // Plan completeness
  const generatedSections = new Set(
    (docsDb?.rows ?? []).map((r) => asText(r.properties["Section"])).filter(Boolean),
  );
  const completeness = Math.round((generatedSections.size / PLAN_SECTIONS.length) * 100);

  // Financial snapshot — last row
  const finRows    = financialsDb?.rows ?? [];
  const lastFinRow = finRows[finRows.length - 1] ?? null;
  const peakRevenue  = lastFinRow ? asNumber(lastFinRow.properties["Revenue"])          : null;
  const peakProfit   = lastFinRow ? asNumber(lastFinRow.properties["Net Profit"])       : null;
  const breakEvenRow = finRows.find((r) => (asNumber(r.properties["Cumulative Profit"]) ?? -1) >= 0);

  // Compliance
  const allLicences     = licencesDb?.rows ?? [];
  const obtainedCount   = allLicences.filter((r) => asText(r.properties["Status"]) === "Obtained").length;
  const urgentLicences  = allLicences.filter((r) => {
    const status = asText(r.properties["Status"]);
    return status === "Not started" || status === "In progress";
  }).slice(0, 3);

  // Menu items
  const menuItems      = menuDb?.rows ?? [];
  const availableItems = menuItems.filter((r) => r.properties["Available"] !== false).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>

      {/* HERO */}
      <section style={{ borderRadius: "16px", background: FD_GRADIENT, overflow: "hidden", boxShadow: `0 12px 40px ${FD_SHADOW}`, padding: "22px 26px 20px" }}>
        <p style={{ margin: "0 0 6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
          🍽️ Food Business Plan
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "white", textShadow: "0 1px 6px rgba(0,0,0,0.25)" }}>
            {businessName}
          </h2>
          {foodType && (
            <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "99px", background: "rgba(255,255,255,0.18)", color: "white", fontWeight: 600, border: "1px solid rgba(255,255,255,0.3)" }}>
              {foodType}
            </span>
          )}
          {goalBadge && (
            <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "99px", background: "rgba(255,255,255,0.14)", color: "white", fontWeight: 600, border: "1px solid rgba(255,255,255,0.25)" }}>
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
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#b91c1c" }}>Peak monthly revenue</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>{formatCurrency(peakRevenue, currency)}</p>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>month 12 projection</p>
        </div>

        <div style={{ borderRadius: "12px", background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.18)", padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#065f46" }}>Peak net profit</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>{formatCurrency(peakProfit, currency)}</p>
          {breakEvenRow && <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>Break-even: {asText(breakEvenRow.properties["Month"])}</p>}
        </div>

        <div style={{ borderRadius: "12px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)", padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#1d4ed8" }}>Licences obtained</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>
            {obtainedCount}<span style={{ fontSize: "14px", fontWeight: 500, color: N_SUBTLE }}>/{allLicences.length}</span>
          </p>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>{allLicences.length - obtainedCount} outstanding</p>
        </div>

        {menuDb && (
          <div style={{ borderRadius: "12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", padding: "14px" }}>
            <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#92400e" }}>Menu items</p>
            <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>
              {availableItems}<span style={{ fontSize: "14px", fontWeight: 500, color: N_SUBTLE }}>/{menuItems.length}</span>
            </p>
            <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>available</p>
          </div>
        )}
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
                {done && <span style={{ marginLeft: "auto", fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: ACCENT_LIGHT, color: "#b91c1c", fontWeight: 600 }}>Generated</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* COMPLIANCE STATUS */}
      {urgentLicences.length > 0 && (
        <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Compliance to action</p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>Use the Compliance tab to generate your full checklist</p>
          </div>
          <div>
            {urgentLicences.map((lic, i) => {
              const name     = asText(lic.properties["Licence"]);
              const category = asText(lic.properties["Category"]);
              const status   = asText(lic.properties["Status"]);
              const isInProgress = status === "In progress";
              return (
                <div key={lic.pageId} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 16px", borderBottom: i < urgentLicences.length - 1 ? `1px solid ${N_BORDER}` : "none" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: isInProgress ? "#f59e0b" : "#94a3b8", flexShrink: 0 }} />
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
