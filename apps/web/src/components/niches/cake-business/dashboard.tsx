"use client";
import { useState } from "react";
import { Palette } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";
import { asText, asNumber, PLAN_SECTIONS, getCurrencyCode, formatCurrency, GOAL_BADGE, ORDER_STATUS_COLOR } from "./utils";

const DASHBOARD_THEMES = [
  {
    id: "rose",
    label: "Rose",
    emoji: "🌹",
    gradient: "linear-gradient(135deg, #500724 0%, #9f1239 40%, #e11d48 75%, #fda4af 100%)",
    shadow: "rgba(225,29,72,0.30)",
    accent: "#e11d48",
    accentLight: "rgba(225,29,72,0.07)",
    accentBorder: "rgba(225,29,72,0.22)",
    accentText: "#9f1239",
  },
  {
    id: "blossom",
    label: "Blossom",
    emoji: "🌸",
    gradient: "linear-gradient(135deg, #500724 0%, #be185d 40%, #ec4899 75%, #fbcfe8 100%)",
    shadow: "rgba(190,24,93,0.30)",
    accent: "#db2777",
    accentLight: "rgba(219,39,119,0.07)",
    accentBorder: "rgba(219,39,119,0.22)",
    accentText: "#be185d",
  },
  {
    id: "lavender",
    label: "Lavender",
    emoji: "💜",
    gradient: "linear-gradient(135deg, #2e1065 0%, #6d28d9 40%, #a855f7 75%, #e9d5ff 100%)",
    shadow: "rgba(109,40,217,0.30)",
    accent: "#9333ea",
    accentLight: "rgba(147,51,234,0.07)",
    accentBorder: "rgba(147,51,234,0.22)",
    accentText: "#6d28d9",
  },
  {
    id: "champagne",
    label: "Champagne",
    emoji: "🥂",
    gradient: "linear-gradient(135deg, #1c0a00 0%, #78350f 40%, #d97706 75%, #fde68a 100%)",
    shadow: "rgba(217,119,6,0.28)",
    accent: "#d97706",
    accentLight: "rgba(217,119,6,0.07)",
    accentBorder: "rgba(217,119,6,0.22)",
    accentText: "#92400e",
  },
  {
    id: "sage",
    label: "Sage",
    emoji: "🌿",
    gradient: "linear-gradient(135deg, #052e16 0%, #166534 40%, #22c55e 75%, #bbf7d0 100%)",
    shadow: "rgba(22,101,52,0.28)",
    accent: "#16a34a",
    accentLight: "rgba(22,163,74,0.07)",
    accentBorder: "rgba(22,163,74,0.22)",
    accentText: "#166534",
  },
  {
    id: "slate",
    label: "Midnight",
    emoji: "🍫",
    gradient: "linear-gradient(135deg, #020617 0%, #1e293b 40%, #334155 75%, #94a3b8 100%)",
    shadow: "rgba(15,23,42,0.50)",
    accent: "#64748b",
    accentLight: "rgba(100,116,139,0.08)",
    accentBorder: "rgba(100,116,139,0.22)",
    accentText: "#334155",
  },
] as const;

type ThemeId = typeof DASHBOARD_THEMES[number]["id"];

export function CakeBusinessDashboard({
  databases,
  criteria,
  nicheId = "cake-business",
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
  nicheId?:  string;
}) {
  const storageKey = `cakeDashboardTheme_${nicheId}`;
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "blossom";
    return (localStorage.getItem(storageKey) as ThemeId | null) ?? "blossom";
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const theme = DASHBOARD_THEMES.find((t) => t.id === themeId) ?? DASHBOARD_THEMES[1]!;

  function selectTheme(id: ThemeId) {
    setThemeId(id);
    localStorage.setItem(storageKey, id);
    setShowThemePicker(false);
  }

  const currency     = getCurrencyCode(criteria);
  const businessName = asText(criteria?.["business-name"]) || "Your Cake Business";
  const speciality   = asText(criteria?.["speciality"]);
  const goal         = asText(criteria?.["primary-goal"]);
  const goalBadge    = GOAL_BADGE[goal] ?? null;

  const docsDb       = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents")   ?? null;
  const financialsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "financials")  ?? null;
  const complianceDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "compliance")  ?? null;
  const ordersDb     = databases.find((d) => d.nicheId === nicheId && d.dbId === "orders")      ?? null;

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
  const allCompliance   = complianceDb?.rows ?? [];
  const obtainedCount   = allCompliance.filter((r) => asText(r.properties["Status"]) === "Obtained").length;
  const urgentItems     = allCompliance.filter((r) => {
    const status = asText(r.properties["Status"]);
    return status === "Not started" || status === "In progress";
  }).slice(0, 4);

  // Orders
  const allOrders     = ordersDb?.rows ?? [];
  const activeOrders  = allOrders.filter((r) => {
    const status = asText(r.properties["Status"]);
    return ["Confirmed", "Deposit Paid", "In Progress"].includes(status);
  });
  const totalRevenue  = allOrders.reduce((s, r) => s + (asNumber(r.properties["Quote"]) ?? 0), 0);
  const upcomingOrders = activeOrders
    .filter((r) => asText(r.properties["Event Date"]))
    .sort((a, b) => asText(a.properties["Event Date"]).localeCompare(asText(b.properties["Event Date"])))
    .slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>

      {/* HERO */}
      <div style={{ position: "relative" }}>
        <section style={{ borderRadius: "16px", background: theme.gradient, overflow: "hidden", boxShadow: `0 12px 40px ${theme.shadow}`, padding: "22px 26px 20px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
            🎂 Cake Business Planner
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

          {/* Plan progress */}
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
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 12px", borderRadius: "8px", border: "none",
                    background: themeId === t.id ? theme.accentLight : "transparent",
                    color: themeId === t.id ? theme.accentText : N_FG,
                    fontWeight: themeId === t.id ? 700 : 400,
                    fontSize: "13px", cursor: "pointer", fontFamily: N_FONT, textAlign: "left", whiteSpace: "nowrap",
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "10px" }}>
        <div style={{ borderRadius: "12px", background: theme.accentLight, border: `1px solid ${theme.accentBorder}`, padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: theme.accentText }}>Active orders</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>{activeOrders.length}</p>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>
            {totalRevenue > 0 ? `${formatCurrency(totalRevenue, currency)} total quoted` : "No orders yet"}
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
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#1d4ed8" }}>Peak net profit</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>{formatCurrency(peakProfit, currency)}</p>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>month 12 projection</p>
        </div>

        <div style={{ borderRadius: "12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#92400e" }}>Compliance obtained</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>
            {obtainedCount}<span style={{ fontSize: "14px", fontWeight: 500, color: N_SUBTLE }}>/{allCompliance.length}</span>
          </p>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>{allCompliance.length - obtainedCount} outstanding</p>
        </div>
      </div>

      {/* UPCOMING ORDERS */}
      {upcomingOrders.length > 0 && (
        <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Upcoming orders</p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>Confirmed, deposit paid and in-progress orders by event date</p>
          </div>
          <div>
            {upcomingOrders.map((order, i) => {
              const customer  = asText(order.properties["Customer"]);
              const event     = asText(order.properties["Event"]);
              const eventDate = asText(order.properties["Event Date"]);
              const cakeType  = asText(order.properties["Cake Type"]);
              const quote     = asNumber(order.properties["Quote"]);
              const status    = asText(order.properties["Status"]);
              const statusColors = ORDER_STATUS_COLOR[status] ?? { bg: "rgba(148,163,184,0.12)", color: "#475569" };
              return (
                <div key={order.pageId} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 16px", borderBottom: i < upcomingOrders.length - 1 ? `1px solid ${N_BORDER}` : "none" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: N_FG }}>{customer}</p>
                      {event && <span style={{ fontSize: "11px", color: N_MUTED }}>{event}</span>}
                      <span style={{ fontSize: "10px", padding: "1px 8px", borderRadius: "99px", background: statusColors.bg, color: statusColors.color, fontWeight: 600 }}>{status}</span>
                    </div>
                    {cakeType && <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_SUBTLE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cakeType}</p>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {quote !== null && <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>{formatCurrency(quote, currency)}</p>}
                    {eventDate && <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>{eventDate}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
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
    </div>
  );
}
