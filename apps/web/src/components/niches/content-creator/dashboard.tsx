"use client";
import { useState, useEffect } from "react";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";
import { asText, asNumber, getCurrencyCode, formatCurrency, PLATFORM_EMOJI, GOAL_BADGE } from "./utils";
import { N_FONT } from "@/lib/workspace-tokens";

// ─── Themes ──────────────────────────────────────────────────────────────────
const DASHBOARD_THEMES = [
  {
    id: "studio",
    label: "🎬 Studio",
    gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    shadow:   "0 4px 20px rgba(99,102,241,0.25)",
    accent:         "#6366f1",
    accentLight:    "rgba(99,102,241,0.08)",
    accentBorder:   "rgba(99,102,241,0.22)",
    accentText:     "#3730a3",
    statCards: [
      { bg: "rgba(99,102,241,0.07)",  border: "rgba(99,102,241,0.18)",  label: "#3730a3" },
      { bg: "rgba(99,102,241,0.07)",  border: "rgba(99,102,241,0.18)",  label: "#3730a3" },
      { bg: "rgba(99,102,241,0.07)",  border: "rgba(99,102,241,0.18)",  label: "#3730a3" },
      { bg: "rgba(99,102,241,0.07)",  border: "rgba(99,102,241,0.18)",  label: "#3730a3" },
    ],
  },
  {
    id: "gold",
    label: "✨ Gold",
    gradient: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
    shadow:   "0 4px 20px rgba(217,119,6,0.25)",
    accent:         "#d97706",
    accentLight:    "rgba(217,119,6,0.08)",
    accentBorder:   "rgba(217,119,6,0.22)",
    accentText:     "#78350f",
    statCards: [
      { bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.18)", label: "#78350f" },
      { bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.18)", label: "#78350f" },
      { bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.18)", label: "#78350f" },
      { bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.18)", label: "#78350f" },
    ],
  },
  {
    id: "neon",
    label: "⚡ Neon",
    gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    shadow:   "0 4px 20px rgba(5,150,105,0.22)",
    accent:         "#059669",
    accentLight:    "rgba(5,150,105,0.08)",
    accentBorder:   "rgba(5,150,105,0.22)",
    accentText:     "#064e3b",
    statCards: [
      { bg: "rgba(5,150,105,0.07)", border: "rgba(5,150,105,0.18)", label: "#064e3b" },
      { bg: "rgba(5,150,105,0.07)", border: "rgba(5,150,105,0.18)", label: "#064e3b" },
      { bg: "rgba(5,150,105,0.07)", border: "rgba(5,150,105,0.18)", label: "#064e3b" },
      { bg: "rgba(5,150,105,0.07)", border: "rgba(5,150,105,0.18)", label: "#064e3b" },
    ],
  },
  {
    id: "aesthetic",
    label: "🌸 Aesthetic",
    gradient: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
    shadow:   "0 4px 20px rgba(236,72,153,0.22)",
    accent:         "#ec4899",
    accentLight:    "rgba(236,72,153,0.08)",
    accentBorder:   "rgba(236,72,153,0.22)",
    accentText:     "#831843",
    statCards: [
      { bg: "rgba(236,72,153,0.07)", border: "rgba(236,72,153,0.18)", label: "#831843" },
      { bg: "rgba(236,72,153,0.07)", border: "rgba(236,72,153,0.18)", label: "#831843" },
      { bg: "rgba(236,72,153,0.07)", border: "rgba(236,72,153,0.18)", label: "#831843" },
      { bg: "rgba(236,72,153,0.07)", border: "rgba(236,72,153,0.18)", label: "#831843" },
    ],
  },
  {
    id: "darkmode",
    label: "🖤 Dark Mode",
    gradient: "linear-gradient(135deg, #374151 0%, #1f2937 100%)",
    shadow:   "0 4px 20px rgba(31,41,55,0.30)",
    accent:         "#374151",
    accentLight:    "rgba(55,65,81,0.08)",
    accentBorder:   "rgba(55,65,81,0.22)",
    accentText:     "#111827",
    statCards: [
      { bg: "rgba(55,65,81,0.07)", border: "rgba(55,65,81,0.18)", label: "#1f2937" },
      { bg: "rgba(55,65,81,0.07)", border: "rgba(55,65,81,0.18)", label: "#1f2937" },
      { bg: "rgba(55,65,81,0.07)", border: "rgba(55,65,81,0.18)", label: "#1f2937" },
      { bg: "rgba(55,65,81,0.07)", border: "rgba(55,65,81,0.18)", label: "#1f2937" },
    ],
  },
  {
    id: "vibe",
    label: "🌊 Vibe",
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
    shadow:   "0 4px 20px rgba(14,165,233,0.22)",
    accent:         "#0ea5e9",
    accentLight:    "rgba(14,165,233,0.08)",
    accentBorder:   "rgba(14,165,233,0.22)",
    accentText:     "#0c4a6e",
    statCards: [
      { bg: "rgba(14,165,233,0.07)", border: "rgba(14,165,233,0.18)", label: "#0c4a6e" },
      { bg: "rgba(14,165,233,0.07)", border: "rgba(14,165,233,0.18)", label: "#0c4a6e" },
      { bg: "rgba(14,165,233,0.07)", border: "rgba(14,165,233,0.18)", label: "#0c4a6e" },
      { bg: "rgba(14,165,233,0.07)", border: "rgba(14,165,233,0.18)", label: "#0c4a6e" },
    ],
  },
];

const N_FG     = "#111827";
const N_MUTED  = "#6b7280";
const N_BORDER = "#e5e7eb";
const N_BG     = "#f9fafb";

export function ContentCreatorDashboard({
  databases,
  criteria,
  nicheId,
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
  nicheId:   string;
}) {
  const [themeId, setThemeId]       = useState("studio");
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`ccDashboardTheme_${nicheId}`);
    if (saved && DASHBOARD_THEMES.find((t) => t.id === saved)) setThemeId(saved);
  }, [nicheId]);

  const selectTheme = (id: string) => {
    setThemeId(id);
    localStorage.setItem(`ccDashboardTheme_${nicheId}`, id);
    setShowPicker(false);
  };

  const theme = DASHBOARD_THEMES.find((t) => t.id === themeId) ?? DASHBOARD_THEMES[0]!;
  const currencyCode = getCurrencyCode(criteria);

  // ── derive data ────────────────────────────────────────────────────────────
  const contentDb    = databases.find((d) => d.nicheId === nicheId && d.dbId === "content");
  const ideasDb      = databases.find((d) => d.nicheId === nicheId && d.dbId === "ideas");
  const brandDb      = databases.find((d) => d.nicheId === nicheId && d.dbId === "brand-deals");
  const analyticsDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "analytics");

  const creatorName = asText(criteria?.["creator-name"]) || "Your Channel";
  const platform    = asText(criteria?.["primary-platform"]) || "";
  const niche       = asText(criteria?.["niche"]) || "";
  const goal        = asText(criteria?.["content-goal"]) || "";

  // Content stats
  const contentRows    = contentDb?.rows ?? [];
  const publishedCount = contentRows.filter((r) => asText(r.properties["Status"]) === "Published").length;
  const scheduledCount = contentRows.filter((r) => asText(r.properties["Status"]) === "Scheduled").length;
  const totalViews     = contentRows.reduce((s, r) => s + (asNumber(r.properties["Views"]) ?? 0), 0);

  // Ideas
  const ideasCount = (ideasDb?.rows ?? []).filter((r) => asText(r.properties["Status"]) === "New").length;

  // Brand deals
  const brandRows      = brandDb?.rows ?? [];
  const activeBrands   = brandRows.filter((r) => {
    const s = asText(r.properties["Status"]);
    return s === "Confirmed" || s === "Negotiating";
  }).length;
  const brandRevenue   = brandRows.filter((r) => asText(r.properties["Status"]) === "Paid")
    .reduce((s, r) => s + (asNumber(r.properties["Rate"]) ?? 0), 0);

  // Analytics: latest row
  const analyticsRows  = analyticsDb?.rows ?? [];
  const latestAnalytics = analyticsRows[analyticsRows.length - 1];
  const followers      = latestAnalytics ? asNumber(latestAnalytics.properties["Followers"]) : null;
  const followerGrowth = latestAnalytics ? asNumber(latestAnalytics.properties["Follower Growth"]) : null;

  const statCards = [
    {
      icon:  PLATFORM_EMOJI[platform] ?? "🎬",
      label: "Published",
      value: String(publishedCount),
      sub:   scheduledCount > 0 ? `${scheduledCount} scheduled` : "No upcoming posts",
    },
    {
      icon:  "👁️",
      label: "Total Views",
      value: totalViews > 0 ? (totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : String(totalViews)) : "—",
      sub:   totalViews > 0 ? "Across all content" : "Add content to track",
    },
    {
      icon:  "👥",
      label: "Followers",
      value: followers != null ? (followers >= 1000 ? `${(followers / 1000).toFixed(1)}k` : String(followers)) : "—",
      sub:   followerGrowth != null && followerGrowth > 0 ? `+${followerGrowth} this month` : "Log in Analytics",
    },
    {
      icon:  "🤝",
      label: "Brand Deals",
      value: brandRevenue > 0 ? formatCurrency(brandRevenue, currencyCode) : String(activeBrands),
      sub:   brandRevenue > 0 ? "Paid out" : activeBrands > 0 ? `${activeBrands} active` : "No deals yet",
    },
  ];

  // In-progress content
  const inProgress = contentRows.filter((r) => {
    const s = asText(r.properties["Status"]);
    return s === "Scripting" || s === "Filming" || s === "Editing";
  }).slice(0, 5);

  // High-priority ideas
  const topIdeas = (ideasDb?.rows ?? [])
    .filter((r) => asText(r.properties["Status"]) === "New" && asText(r.properties["Priority"]) === "High")
    .slice(0, 4);

  // Overdue brand deals
  const overdueBrands = brandRows.filter((r) => {
    const deadline = asText(r.properties["Deadline"]);
    const status   = asText(r.properties["Status"]);
    if (!deadline || status === "Paid" || status === "Declined" || status === "Delivered") return false;
    return new Date(deadline) < new Date();
  }).slice(0, 3);

  const goalInfo = GOAL_BADGE[goal];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>
      {/* Hero + picker wrapper */}
      <div style={{ position: "relative" }}>
        <section style={{
          background: theme.gradient,
          borderRadius: "16px",
          padding: "22px 26px 20px",
          color: "white",
          boxShadow: theme.shadow,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>{creatorName}</h1>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                {platform && (
                  <span style={{ background: "rgba(255,255,255,0.22)", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontWeight: 600, backdropFilter: "blur(4px)" }}>
                    {PLATFORM_EMOJI[platform] ?? "🎬"} {platform}
                  </span>
                )}
                {niche && (
                  <span style={{ background: "rgba(255,255,255,0.18)", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", backdropFilter: "blur(4px)" }}>
                    {niche}
                  </span>
                )}
                {goalInfo && (
                  <span style={{ background: "rgba(255,255,255,0.18)", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", backdropFilter: "blur(4px)" }}>
                    {goalInfo.label}
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>🎬</p>
              <p style={{ fontSize: "11px", opacity: 0.75, marginTop: "4px" }}>Content Creator OS</p>
            </div>
          </div>
        </section>

        {/* Theme picker */}
        <div style={{ position: "absolute", top: "14px", right: "14px", zIndex: 10 }}>
          <button
            onClick={() => setShowPicker((p) => !p)}
            title="Change theme"
            style={{
              background: "rgba(255,255,255,0.20)",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: "8px",
              padding: "5px 10px",
              cursor: "pointer",
              fontSize: "12px",
              color: "white",
              backdropFilter: "blur(4px)",
              fontWeight: 600,
            }}
          >
            🎨
          </button>
          {showPicker && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              background: "white",
              border: `1px solid ${N_BORDER}`,
              borderRadius: "10px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              overflow: "hidden",
              minWidth: "160px",
            }}>
              {DASHBOARD_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selectTheme(t.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    border: "none",
                    background: themeId === t.id ? "#f3f4f6" : "transparent",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: N_FG,
                    fontWeight: themeId === t.id ? 600 : 400,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "10px" }}>
        {statCards.map((card, i) => (
          <div key={i} style={{
            background: theme.statCards[i]?.bg ?? theme.accentLight,
            border: `1px solid ${theme.statCards[i]?.border ?? theme.accentBorder}`,
            borderRadius: "12px",
            padding: "16px 18px",
          }}>
            <p style={{ fontSize: "20px", margin: "0 0 6px 0" }}>{card.icon}</p>
            <p style={{ fontSize: "11px", fontWeight: 600, color: theme.statCards[i]?.label ?? theme.accentText, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>
              {card.label}
            </p>
            <p style={{ fontSize: "22px", fontWeight: 800, color: N_FG, margin: "0 0 2px 0" }}>{card.value}</p>
            <p style={{ fontSize: "11px", color: N_MUTED, margin: 0 }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Overdue brand deal warning */}
      {overdueBrands.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <span style={{ fontSize: "16px", flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#991b1b", margin: "0 0 4px 0" }}>
              {overdueBrands.length} brand deal{overdueBrands.length !== 1 ? "s" : ""} past deadline
            </p>
            <p style={{ fontSize: "12px", color: "#b91c1c", margin: 0 }}>
              {overdueBrands.map((b) => asText(b.properties["Brand"] ?? b.properties["title"])).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* In-progress content */}
        <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "18px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: N_FG, margin: "0 0 12px 0" }}>🎬 In Progress</h3>
          {inProgress.length === 0 ? (
            <p style={{ fontSize: "12px", color: N_MUTED }}>No content in production. Add to the Content Calendar.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
              {inProgress.map((c, i) => {
                const status = asText(c.properties["Status"]);
                const statusColors: Record<string, { bg: string; color: string }> = {
                  "Scripting": { bg: "rgba(245,158,11,0.10)", color: "#92400e" },
                  "Filming":   { bg: "rgba(249,115,22,0.10)", color: "#7c2d12" },
                  "Editing":   { bg: "rgba(59,130,246,0.10)", color: "#1d4ed8" },
                };
                const sc = statusColors[status] ?? { bg: N_BG, color: N_MUTED };
                return (
                  <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: N_BG, borderRadius: "8px" }}>
                    <span style={{ fontSize: "12px", color: N_FG, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: "8px" }}>
                      {asText(c.properties["Title"] ?? c.properties["title"]) || `Content ${i + 1}`}
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px", background: sc.bg, color: sc.color, flexShrink: 0 }}>
                      {status}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Top ideas + ideas count */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "18px", flex: 1 }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: N_FG, margin: "0 0 12px 0" }}>💡 Top Ideas</h3>
            {topIdeas.length === 0 ? (
              <p style={{ fontSize: "12px", color: N_MUTED }}>
                {ideasCount > 0 ? `${ideasCount} ideas in bank — none marked high priority yet.` : "No ideas yet. Use the Idea Generator to fill your bank."}
              </p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                {topIdeas.map((idea, i) => (
                  <li key={i} style={{ fontSize: "12px", color: N_FG, padding: "6px 10px", background: theme.accentLight, border: `1px solid ${theme.accentBorder}`, borderRadius: "8px" }}>
                    {asText(idea.properties["Idea"] ?? idea.properties["title"]) || `Idea ${i + 1}`}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {ideasCount > 0 && (
            <div style={{ background: N_BG, border: `1px solid ${N_BORDER}`, borderRadius: "10px", padding: "12px 14px", display: "flex", gap: "12px", alignItems: "center" }}>
              <span style={{ fontSize: "18px" }}>💡</span>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: N_FG, margin: 0 }}>{ideasCount} new idea{ideasCount !== 1 ? "s" : ""} in bank</p>
                <p style={{ fontSize: "11px", color: N_MUTED, margin: 0 }}>Ready to script</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
