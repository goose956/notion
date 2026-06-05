"use client";
import { useState } from "react";
import { Palette } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";
import { asText, asNumber, PLAN_SECTIONS, getCurrencyCode, formatCurrency, GOAL_BADGE, APPT_STATUS_COLOR } from "./utils";

const DASHBOARD_THEMES = [
  {
    id: "fuchsia",
    label: "Fuchsia",
    emoji: "💅",
    gradient: "linear-gradient(135deg, #4a044e 0%, #86198f 40%, #d946ef 75%, #f0abfc 100%)",
    shadow: "rgba(192,38,211,0.30)",
    accent: "#c026d3",
    accentLight: "rgba(192,38,211,0.07)",
    accentBorder: "rgba(192,38,211,0.22)",
    accentText: "#86198f",
  },
  {
    id: "rose-gold",
    label: "Rose Gold",
    emoji: "🌸",
    gradient: "linear-gradient(135deg, #4c0519 0%, #9f1239 40%, #fb7185 75%, #fecdd3 100%)",
    shadow: "rgba(159,18,57,0.30)",
    accent: "#e11d48",
    accentLight: "rgba(225,29,72,0.07)",
    accentBorder: "rgba(225,29,72,0.22)",
    accentText: "#9f1239",
  },
  {
    id: "mauve",
    label: "Mauve",
    emoji: "🪻",
    gradient: "linear-gradient(135deg, #2e1065 0%, #7c3aed 40%, #a78bfa 75%, #ede9fe 100%)",
    shadow: "rgba(124,58,237,0.30)",
    accent: "#7c3aed",
    accentLight: "rgba(124,58,237,0.07)",
    accentBorder: "rgba(124,58,237,0.22)",
    accentText: "#5b21b6",
  },
  {
    id: "nude",
    label: "Nude",
    emoji: "🤍",
    gradient: "linear-gradient(135deg, #1c0a00 0%, #78350f 40%, #d97706 75%, #fde68a 100%)",
    shadow: "rgba(217,119,6,0.28)",
    accent: "#d97706",
    accentLight: "rgba(217,119,6,0.07)",
    accentBorder: "rgba(217,119,6,0.22)",
    accentText: "#92400e",
  },
  {
    id: "berry",
    label: "Berry",
    emoji: "🫐",
    gradient: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 40%, #818cf8 75%, #e0e7ff 100%)",
    shadow: "rgba(67,56,202,0.30)",
    accent: "#4338ca",
    accentLight: "rgba(67,56,202,0.07)",
    accentBorder: "rgba(67,56,202,0.22)",
    accentText: "#3730a3",
  },
  {
    id: "midnight",
    label: "Midnight",
    emoji: "🖤",
    gradient: "linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e3a5f 75%, #38bdf8 100%)",
    shadow: "rgba(15,23,42,0.50)",
    accent: "#0ea5e9",
    accentLight: "rgba(14,165,233,0.07)",
    accentBorder: "rgba(14,165,233,0.20)",
    accentText: "#0369a1",
  },
] as const;

type ThemeId = typeof DASHBOARD_THEMES[number]["id"];

export function NailTechDashboard({
  databases,
  criteria,
  nicheId = "nail-tech",
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
  nicheId?:  string;
}) {
  const storageKey = `nailDashboardTheme_${nicheId}`;
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "fuchsia";
    return (localStorage.getItem(storageKey) as ThemeId | null) ?? "fuchsia";
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const theme = DASHBOARD_THEMES.find((t) => t.id === themeId) ?? DASHBOARD_THEMES[0]!;

  function selectTheme(id: ThemeId) {
    setThemeId(id);
    localStorage.setItem(storageKey, id);
    setShowThemePicker(false);
  }

  const currency     = getCurrencyCode(criteria);
  const businessName = asText(criteria?.["business-name"]) || "Your Beauty Business";
  const speciality   = asText(criteria?.["speciality"]);
  const goal         = asText(criteria?.["primary-goal"]);
  const goalBadge    = GOAL_BADGE[goal] ?? null;

  const docsDb       = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents")   ?? null;
  const financialsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "financials")  ?? null;
  const complianceDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "compliance")  ?? null;
  const apptDb       = databases.find((d) => d.nicheId === nicheId && d.dbId === "appointments") ?? null;
  const clientsDb    = databases.find((d) => d.nicheId === nicheId && d.dbId === "clients")     ?? null;

  // Plan completeness
  const generatedSections = new Set(
    (docsDb?.rows ?? []).map((r) => asText(r.properties["Section"])).filter(Boolean),
  );
  const completeness = Math.round((generatedSections.size / PLAN_SECTIONS.length) * 100);

  // Financial snapshot
  const finRows     = financialsDb?.rows ?? [];
  const lastFinRow  = finRows[finRows.length - 1] ?? null;
  const peakRevenue = lastFinRow ? asNumber(lastFinRow.properties["Revenue"])    : null;
  const peakProfit  = lastFinRow ? asNumber(lastFinRow.properties["Net Profit"]) : null;
  const breakEvenRow = finRows.find((r) => (asNumber(r.properties["Cumulative Profit"]) ?? -1) >= 0);

  // Compliance
  const allCompliance  = complianceDb?.rows ?? [];
  const obtainedCount  = allCompliance.filter((r) => asText(r.properties["Status"]) === "Obtained").length;
  const urgentItems    = allCompliance.filter((r) => {
    const s = asText(r.properties["Status"]);
    return s === "Not started" || s === "In progress";
  }).slice(0, 4);

  // Appointments
  const allAppts      = apptDb?.rows ?? [];
  const activeAppts   = allAppts.filter((r) => ["Booked", "Deposit Paid"].includes(asText(r.properties["Status"])));
  const totalRevenue  = allAppts
    .filter((r) => asText(r.properties["Status"]) === "Completed")
    .reduce((s, r) => s + (asNumber(r.properties["Price"]) ?? 0), 0);
  const upcomingAppts = activeAppts
    .filter((r) => asText(r.properties["Date"]))
    .sort((a, b) => asText(a.properties["Date"]).localeCompare(asText(b.properties["Date"])))
    .slice(0, 5);

  // Clients
  const totalClients    = clientsDb?.rows.length ?? 0;
  const patchTestDue    = (clientsDb?.rows ?? []).filter((r) => asText(r.properties["Patch Test Result"]) === "Pending").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>

      {/* HERO */}
      <div style={{ position: "relative" }}>
        <section style={{ borderRadius: "16px", background: theme.gradient, overflow: "hidden", boxShadow: `0 12px 40px ${theme.shadow}`, padding: "22px 26px 20px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
            💅 Nail Tech & Beauty Business Planner
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
            <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "white", textShadow: "0 1px 6px rgba(0,0,0,0.25)" }}>
              {businessName}
            </h2>
            {speciality && (
              <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "99px", background: "rgba(255,255,255,0.18)", color: "white", fontWeight: 600, border: "1px solid rgba(255,255,255,0.3)" }}>
                {speciality}
              </span>
            )}
            {goalBadge && (
              <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "99px", background: "rgba(255,255,255,0.14)", color: "white", fontWeight: 600, border: "1px solid rgba(255,255,255,0.25)" }}>
                {goalBadge.label}
              </span>
            )}
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.09em" }}>Plan completeness</p>
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

        {/* Theme picker */}
        <div style={{ position: "absolute", top: "14px", right: "14px", zIndex: 10 }}>
          <button
            onClick={() => setShowThemePicker((v) => !v)}
            title="Change theme"
            style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.30)", borderRadius: "8px", padding: "6px 8px", cursor: "pointer", color: "white", display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 600, fontFamily: N_FONT }}
          >
            <Palette size={13} /> Theme
          </button>
          {showThemePicker && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "white", border: `1px solid ${N_BORDER_MED}`, borderRadius: "12px", padding: "8px", boxShadow: "0 8px 30px rgba(0,0,0,0.14)", zIndex: 50, display: "flex", flexDirection: "column", gap: "4px", minWidth: "160px" }}>
              {DASHBOARD_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTheme(t.id)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", border: "none", background: themeId === t.id ? theme.accentLight : "transparent", color: themeId === t.id ? theme.accentText : N_FG, fontWeight: themeId === t.id ? 700 : 400, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT, textAlign: "left", whiteSpace: "nowrap" }}
                >
                  <span>{t.emoji}</span> {t.label}
                  {themeId === t.id && <span style={{ marginLeft: "auto", fontSize: "10px" }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "10px" }}>
        <div style={{ borderRadius: "12px", background: theme.accentLight, border: `1px solid ${theme.accentBorder}`, padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: theme.accentText }}>Upcoming bookings</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>{activeAppts.length}</p>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>
            {totalRevenue > 0 ? `${formatCurrency(totalRevenue, currency)} earned to date` : "No completed appointments yet"}
          </p>
        </div>

        <div style={{ borderRadius: "12px", background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.18)", padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#065f46" }}>Peak monthly revenue</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>{formatCurrency(peakRevenue, currency)}</p>
          {breakEvenRow
            ? <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>Break-even: {asText(breakEvenRow.properties["Month"])}</p>
            : <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>Month 12 projection</p>}
        </div>

        <div style={{ borderRadius: "12px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)", padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#1d4ed8" }}>Clients</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>{totalClients}</p>
          {patchTestDue > 0
            ? <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#b45309" }}>⚠️ {patchTestDue} patch test pending</p>
            : <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>in client records</p>}
        </div>

        <div style={{ borderRadius: "12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#92400e" }}>Compliance obtained</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>
            {obtainedCount}<span style={{ fontSize: "14px", fontWeight: 500, color: N_SUBTLE }}>/{allCompliance.length}</span>
          </p>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>{allCompliance.length - obtainedCount} outstanding</p>
        </div>
      </div>

      {/* UPCOMING APPOINTMENTS */}
      {upcomingAppts.length > 0 && (
        <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Upcoming appointments</p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>Booked and deposit-paid appointments by date</p>
          </div>
          <div>
            {upcomingAppts.map((appt, i) => {
              const client   = asText(appt.properties["Client"]);
              const service  = asText(appt.properties["Service"]);
              const date     = asText(appt.properties["Date"]);
              const price    = asNumber(appt.properties["Price"]);
              const duration = asText(appt.properties["Duration"]);
              const status   = asText(appt.properties["Status"]);
              const sc = APPT_STATUS_COLOR[status] ?? { bg: "rgba(148,163,184,0.12)", color: "#475569" };
              return (
                <div key={appt.pageId} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 16px", borderBottom: i < upcomingAppts.length - 1 ? `1px solid ${N_BORDER}` : "none" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: N_FG }}>{client}</p>
                      <span style={{ fontSize: "10px", padding: "1px 8px", borderRadius: "99px", background: sc.bg, color: sc.color, fontWeight: 600 }}>{status}</span>
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_SUBTLE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {service}{duration ? ` · ${duration}` : ""}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {price !== null && <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>{formatCurrency(price, currency)}</p>}
                    {date && <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>{date}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* PATCH TEST ALERT */}
      {patchTestDue > 0 && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#92400e" }}>
            ⚠️ {patchTestDue} client{patchTestDue > 1 ? "s have" : " has"} a pending patch test result.
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#b45309" }}>
            Do not proceed with tint or lash treatments until results are confirmed. Check Client Records.
          </p>
        </div>
      )}

      {/* PLAN SECTIONS */}
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
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${done ? theme.accent : N_BORDER_MED}`, background: done ? theme.accent : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {done && <span style={{ color: "white", fontSize: "11px", lineHeight: 1 }}>✓</span>}
                </div>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: done ? 600 : 400, color: done ? N_FG : N_SUBTLE }}>{section}</p>
                {done && <span style={{ marginLeft: "auto", fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: theme.accentLight, color: theme.accentText, fontWeight: 600 }}>Generated</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* COMPLIANCE */}
      {urgentItems.length > 0 && (
        <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Compliance to action</p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>Use the Pricing & Compliance tab to generate your full checklist</p>
          </div>
          <div>
            {urgentItems.map((item, i) => {
              const name     = asText(item.properties["Requirement"]);
              const category = asText(item.properties["Category"]);
              const status   = asText(item.properties["Status"]);
              return (
                <div key={item.pageId} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 16px", borderBottom: i < urgentItems.length - 1 ? `1px solid ${N_BORDER}` : "none" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: status === "In progress" ? "#f59e0b" : "#94a3b8", flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: N_FG, flex: 1 }}>{name}</p>
                  <span style={{ fontSize: "10px", color: N_SUBTLE }}>{category}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* PEAK PROFIT SNAPSHOT */}
      {peakProfit !== null && (
        <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", padding: "14px 16px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 700, color: N_FG }}>Financial projection snapshot</p>
          <p style={{ margin: 0, fontSize: "12px", color: N_MUTED }}>
            Month 12 peak net profit: <strong style={{ color: N_FG }}>{formatCurrency(peakProfit, currency)}</strong>
            {breakEvenRow ? ` · Cumulative break-even: ${asText(breakEvenRow.properties["Month"])}` : " · Break-even not reached within 12 months"}
          </p>
        </section>
      )}
    </div>
  );
}
