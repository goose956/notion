"use client";
import { useState } from "react";
import { Palette } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";
import { asText, asNumber, PLAN_SECTIONS, getCurrencyCode, formatCurrency, GOAL_BADGE } from "./utils";

// ─── Dashboard colour themes ──────────────────────────────────────────────────
const DASHBOARD_THEMES = [
  {
    id: "crimson",
    label: "Crimson",
    emoji: "🍷",
    gradient: "linear-gradient(135deg, #450a0a 0%, #991b1b 40%, #dc2626 75%, #fca5a5 100%)",
    shadow: "rgba(220,38,38,0.30)",
    accent: "#dc2626",
    accentLight: "rgba(220,38,38,0.07)",
    accentBorder: "rgba(220,38,38,0.20)",
    accentText: "#b91c1c",
    statCards: [
      { bg: "rgba(220,38,38,0.07)",  border: "rgba(220,38,38,0.20)",  label: "#b91c1c" },
      { bg: "rgba(5,150,105,0.06)",  border: "rgba(5,150,105,0.18)",  label: "#065f46" },
      { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.18)", label: "#1d4ed8" },
      { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.18)", label: "#92400e" },
    ],
  },
  {
    id: "spice",
    label: "Spice",
    emoji: "🌶️",
    gradient: "linear-gradient(135deg, #431407 0%, #9a3412 40%, #ea580c 75%, #fdba74 100%)",
    shadow: "rgba(234,88,12,0.30)",
    accent: "#ea580c",
    accentLight: "rgba(234,88,12,0.07)",
    accentBorder: "rgba(234,88,12,0.20)",
    accentText: "#c2410c",
    statCards: [
      { bg: "rgba(234,88,12,0.07)",  border: "rgba(234,88,12,0.20)",  label: "#c2410c" },
      { bg: "rgba(5,150,105,0.06)",  border: "rgba(5,150,105,0.18)",  label: "#065f46" },
      { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.18)", label: "#1d4ed8" },
      { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.18)", label: "#92400e" },
    ],
  },
  {
    id: "herb",
    label: "Herb",
    emoji: "🌿",
    gradient: "linear-gradient(135deg, #052e16 0%, #166534 40%, #16a34a 75%, #86efac 100%)",
    shadow: "rgba(22,101,52,0.30)",
    accent: "#16a34a",
    accentLight: "rgba(22,163,74,0.07)",
    accentBorder: "rgba(22,163,74,0.20)",
    accentText: "#166534",
    statCards: [
      { bg: "rgba(22,163,74,0.07)",  border: "rgba(22,163,74,0.20)",  label: "#166534" },
      { bg: "rgba(5,150,105,0.06)",  border: "rgba(5,150,105,0.18)",  label: "#065f46" },
      { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.18)", label: "#1d4ed8" },
      { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.18)", label: "#92400e" },
    ],
  },
  {
    id: "bakery",
    label: "Bakery",
    emoji: "🥐",
    gradient: "linear-gradient(135deg, #1c0a00 0%, #78350f 40%, #d97706 75%, #fde68a 100%)",
    shadow: "rgba(217,119,6,0.30)",
    accent: "#d97706",
    accentLight: "rgba(217,119,6,0.07)",
    accentBorder: "rgba(217,119,6,0.20)",
    accentText: "#92400e",
    statCards: [
      { bg: "rgba(217,119,6,0.07)",  border: "rgba(217,119,6,0.20)",  label: "#92400e" },
      { bg: "rgba(5,150,105,0.06)",  border: "rgba(5,150,105,0.18)",  label: "#065f46" },
      { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.18)", label: "#1d4ed8" },
      { bg: "rgba(220,38,38,0.06)",  border: "rgba(220,38,38,0.18)",  label: "#b91c1c" },
    ],
  },
  {
    id: "midnight",
    label: "Midnight",
    emoji: "🍸",
    gradient: "linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e3a5f 75%, #38bdf8 100%)",
    shadow: "rgba(15,23,42,0.50)",
    accent: "#0ea5e9",
    accentLight: "rgba(14,165,233,0.07)",
    accentBorder: "rgba(14,165,233,0.20)",
    accentText: "#0369a1",
    statCards: [
      { bg: "rgba(14,165,233,0.07)", border: "rgba(14,165,233,0.20)", label: "#0369a1" },
      { bg: "rgba(5,150,105,0.06)",  border: "rgba(5,150,105,0.18)",  label: "#065f46" },
      { bg: "rgba(124,58,237,0.06)", border: "rgba(124,58,237,0.18)", label: "#4c1d95" },
      { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.18)", label: "#92400e" },
    ],
  },
  {
    id: "umami",
    label: "Umami",
    emoji: "🍜",
    gradient: "linear-gradient(135deg, #1a0030 0%, #4c1d95 40%, #7c3aed 75%, #c4b5fd 100%)",
    shadow: "rgba(76,29,149,0.30)",
    accent: "#7c3aed",
    accentLight: "rgba(124,58,237,0.07)",
    accentBorder: "rgba(124,58,237,0.20)",
    accentText: "#4c1d95",
    statCards: [
      { bg: "rgba(124,58,237,0.07)", border: "rgba(124,58,237,0.20)", label: "#4c1d95" },
      { bg: "rgba(5,150,105,0.06)",  border: "rgba(5,150,105,0.18)",  label: "#065f46" },
      { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.18)", label: "#1d4ed8" },
      { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.18)", label: "#92400e" },
    ],
  },
] as const;
type ThemeId = typeof DASHBOARD_THEMES[number]["id"];

export function FoodBusinessDashboard({
  databases,
  criteria,
  nicheId = "food-business",
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
  nicheId?:  string;
}) {
  const storageKey = `fdDashboardTheme_${nicheId}`;
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "crimson";
    return (localStorage.getItem(storageKey) as ThemeId | null) ?? "crimson";
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const theme = DASHBOARD_THEMES.find((t) => t.id === themeId) ?? DASHBOARD_THEMES[0];

  function selectTheme(id: ThemeId) {
    setThemeId(id);
    localStorage.setItem(storageKey, id);
    setShowThemePicker(false);
  }

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

  // Financial snapshot
  const finRows    = financialsDb?.rows ?? [];
  const lastFinRow = finRows[finRows.length - 1] ?? null;
  const peakRevenue  = lastFinRow ? asNumber(lastFinRow.properties["Revenue"])          : null;
  const peakProfit   = lastFinRow ? asNumber(lastFinRow.properties["Net Profit"])       : null;
  const breakEvenRow = finRows.find((r) => (asNumber(r.properties["Cumulative Profit"]) ?? -1) >= 0);

  // Compliance
  const allLicences    = licencesDb?.rows ?? [];
  const obtainedCount  = allLicences.filter((r) => asText(r.properties["Status"]) === "Obtained").length;
  const urgentLicences = allLicences.filter((r) => {
    const status = asText(r.properties["Status"]);
    return status === "Not started" || status === "In progress";
  }).slice(0, 3);

  // Menu
  const menuItems      = menuDb?.rows ?? [];
  const availableItems = menuItems.filter((r) => r.properties["Available"] !== false).length;

  const [s0, s1, s2, s3] = theme.statCards;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>

      {/* HERO */}
      <div style={{ position: "relative" }}>
      <section style={{ borderRadius: "16px", background: theme.gradient, overflow: "hidden", boxShadow: `0 12px 40px ${theme.shadow}`, padding: "22px 26px 20px" }}>
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

      {/* Theme picker — outside section so overflow:hidden doesn't clip the dropdown */}
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
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 12px", borderRadius: "8px", border: "none",
                  background: themeId === t.id ? theme.accentLight : "transparent",
                  color: themeId === t.id ? theme.accentText : N_FG,
                  fontWeight: themeId === t.id ? 700 : 400,
                  fontSize: "13px", cursor: "pointer", fontFamily: N_FONT, textAlign: "left",
                  whiteSpace: "nowrap",
                }}
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
        <div style={{ borderRadius: "12px", background: s0!.bg, border: `1px solid ${s0!.border}`, padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: s0!.label }}>Peak monthly revenue</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>{formatCurrency(peakRevenue, currency)}</p>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>month 12 projection</p>
        </div>

        <div style={{ borderRadius: "12px", background: s1!.bg, border: `1px solid ${s1!.border}`, padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: s1!.label }}>Peak net profit</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>{formatCurrency(peakProfit, currency)}</p>
          {breakEvenRow && <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>Break-even: {asText(breakEvenRow.properties["Month"])}</p>}
        </div>

        <div style={{ borderRadius: "12px", background: s2!.bg, border: `1px solid ${s2!.border}`, padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: s2!.label }}>Licences obtained</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>
            {obtainedCount}<span style={{ fontSize: "14px", fontWeight: 500, color: N_SUBTLE }}>/{allLicences.length}</span>
          </p>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>{allLicences.length - obtainedCount} outstanding</p>
        </div>

        {menuDb && (
          <div style={{ borderRadius: "12px", background: s3!.bg, border: `1px solid ${s3!.border}`, padding: "14px" }}>
            <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: s3!.label }}>Menu items</p>
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

      {/* COMPLIANCE STATUS */}
      {urgentLicences.length > 0 && (
        <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Compliance to action</p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>Use the Compliance tab to generate your full checklist</p>
          </div>
          <div>
            {urgentLicences.map((lic, i) => {
              const name       = asText(lic.properties["Licence"]);
              const category   = asText(lic.properties["Category"]);
              const status     = asText(lic.properties["Status"]);
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
