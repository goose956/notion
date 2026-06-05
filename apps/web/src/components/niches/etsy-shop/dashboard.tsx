"use client";
import { useState, useEffect } from "react";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";
import { asText, asNumber, getCurrencyCode, formatCurrency, SHOP_TYPE_BADGE } from "./utils";

// ─── Themes ──────────────────────────────────────────────────────────────────
const DASHBOARD_THEMES = [
  {
    id: "marketplace",
    label: "🛍️ Marketplace",
    gradient: "linear-gradient(135deg, #f1641e 0%, #e05010 100%)",
    shadow:   "0 4px 20px rgba(241,100,30,0.25)",
    accent:         "#f1641e",
    accentLight:    "rgba(241,100,30,0.08)",
    accentBorder:   "rgba(241,100,30,0.22)",
    accentText:     "#b34a12",
    statCards: [
      { bg: "rgba(241,100,30,0.07)", border: "rgba(241,100,30,0.18)", label: "#8b3a0f" },
      { bg: "rgba(241,100,30,0.07)", border: "rgba(241,100,30,0.18)", label: "#8b3a0f" },
      { bg: "rgba(241,100,30,0.07)", border: "rgba(241,100,30,0.18)", label: "#8b3a0f" },
      { bg: "rgba(241,100,30,0.07)", border: "rgba(241,100,30,0.18)", label: "#8b3a0f" },
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
    accentText:     "#92400e",
    statCards: [
      { bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.18)", label: "#78350f" },
      { bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.18)", label: "#78350f" },
      { bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.18)", label: "#78350f" },
      { bg: "rgba(217,119,6,0.07)", border: "rgba(217,119,6,0.18)", label: "#78350f" },
    ],
  },
  {
    id: "sage",
    label: "🌿 Sage",
    gradient: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
    shadow:   "0 4px 20px rgba(22,163,74,0.22)",
    accent:         "#16a34a",
    accentLight:    "rgba(22,163,74,0.08)",
    accentBorder:   "rgba(22,163,74,0.22)",
    accentText:     "#14532d",
    statCards: [
      { bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.18)", label: "#14532d" },
      { bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.18)", label: "#14532d" },
      { bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.18)", label: "#14532d" },
      { bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.18)", label: "#14532d" },
    ],
  },
  {
    id: "rose",
    label: "🌸 Rose",
    gradient: "linear-gradient(135deg, #db2777 0%, #be185d 100%)",
    shadow:   "0 4px 20px rgba(219,39,119,0.22)",
    accent:         "#db2777",
    accentLight:    "rgba(219,39,119,0.08)",
    accentBorder:   "rgba(219,39,119,0.22)",
    accentText:     "#831843",
    statCards: [
      { bg: "rgba(219,39,119,0.07)", border: "rgba(219,39,119,0.18)", label: "#831843" },
      { bg: "rgba(219,39,119,0.07)", border: "rgba(219,39,119,0.18)", label: "#831843" },
      { bg: "rgba(219,39,119,0.07)", border: "rgba(219,39,119,0.18)", label: "#831843" },
      { bg: "rgba(219,39,119,0.07)", border: "rgba(219,39,119,0.18)", label: "#831843" },
    ],
  },
  {
    id: "midnight",
    label: "🌙 Midnight",
    gradient: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)",
    shadow:   "0 4px 20px rgba(30,64,175,0.25)",
    accent:         "#1e40af",
    accentLight:    "rgba(30,64,175,0.08)",
    accentBorder:   "rgba(30,64,175,0.22)",
    accentText:     "#1e3a8a",
    statCards: [
      { bg: "rgba(30,64,175,0.07)", border: "rgba(30,64,175,0.18)", label: "#1e3a8a" },
      { bg: "rgba(30,64,175,0.07)", border: "rgba(30,64,175,0.18)", label: "#1e3a8a" },
      { bg: "rgba(30,64,175,0.07)", border: "rgba(30,64,175,0.18)", label: "#1e3a8a" },
      { bg: "rgba(30,64,175,0.07)", border: "rgba(30,64,175,0.18)", label: "#1e3a8a" },
    ],
  },
  {
    id: "craft",
    label: "🧵 Craft",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
    shadow:   "0 4px 20px rgba(124,58,237,0.22)",
    accent:         "#7c3aed",
    accentLight:    "rgba(124,58,237,0.08)",
    accentBorder:   "rgba(124,58,237,0.22)",
    accentText:     "#4c1d95",
    statCards: [
      { bg: "rgba(124,58,237,0.07)", border: "rgba(124,58,237,0.18)", label: "#4c1d95" },
      { bg: "rgba(124,58,237,0.07)", border: "rgba(124,58,237,0.18)", label: "#4c1d95" },
      { bg: "rgba(124,58,237,0.07)", border: "rgba(124,58,237,0.18)", label: "#4c1d95" },
      { bg: "rgba(124,58,237,0.07)", border: "rgba(124,58,237,0.18)", label: "#4c1d95" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const N_FG     = "#111827";
const N_MUTED  = "#6b7280";
const N_BORDER = "#e5e7eb";
const N_BG     = "#f9fafb";

export function EtsyDashboard({
  databases,
  criteria,
  nicheId,
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
  nicheId:   string;
}) {
  const [themeId, setThemeId]         = useState("marketplace");
  const [showPicker, setShowPicker]   = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`etsyDashboardTheme_${nicheId}`);
    if (saved && DASHBOARD_THEMES.find((t) => t.id === saved)) setThemeId(saved);
  }, [nicheId]);

  const selectTheme = (id: string) => {
    setThemeId(id);
    localStorage.setItem(`etsyDashboardTheme_${nicheId}`, id);
    setShowPicker(false);
  };

  const theme = DASHBOARD_THEMES.find((t) => t.id === themeId) ?? DASHBOARD_THEMES[0]!;
  const currencyCode = getCurrencyCode(criteria);

  // ── derive data from databases ────────────────────────────────────────────
  const listingsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "listings");
  const ordersDb   = databases.find((d) => d.nicheId === nicheId && d.dbId === "orders");
  const reviewsDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "reviews");
  const financeDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "finance");
  const ideasDb    = databases.find((d) => d.nicheId === nicheId && d.dbId === "ideas");

  const shopName  = asText(criteria?.["shop-name"])  || "Your Etsy Shop";
  const shopType  = asText(criteria?.["shop-type"])  || "";
  const shopStage = asText(criteria?.["shop-stage"]) || "";

  // Active listings count
  const activeListings = (listingsDb?.rows ?? []).filter((r) => asText(r.properties["Status"]) === "Active").length;
  const totalListings  = (listingsDb?.rows ?? []).length;

  // Total sales / revenue from orders
  const orders     = ordersDb?.rows ?? [];
  const totalSales = orders.length;
  const totalRev   = orders.reduce((s, r) => s + (asNumber(r.properties["Sale Price"]) ?? 0), 0);
  const totalNet   = orders.reduce((s, r) => s + (asNumber(r.properties["Net Profit"]) ?? 0), 0);

  // Reviews
  const reviews     = reviewsDb?.rows ?? [];
  const totalReviews = reviews.length;
  const starSum     = reviews.reduce((s, r) => {
    const raw = asText(r.properties["Rating"]);
    const match = raw.match(/(\d)/);
    return s + (match?.[1] != null ? parseInt(match[1]) : 0);
  }, 0);
  const avgRating = totalReviews > 0 ? (starSum / totalReviews).toFixed(1) : null;
  const unreplied = reviews.filter((r) => !r.properties["Replied"]).length;

  // Finance: latest month net
  const financeRows   = (financeDb?.rows ?? []);
  const latestFinance = financeRows[financeRows.length - 1];
  const latestNet     = latestFinance ? asNumber(latestFinance.properties["Net Profit"]) : null;

  // Ideas
  const ideasCount = (ideasDb?.rows ?? []).filter((r) => asText(r.properties["Status"]) === "Idea").length;

  const statCards = [
    {
      label: "Active Listings",
      value: `${activeListings} / ${totalListings}`,
      sub:   totalListings === 0 ? "No listings yet" : `${totalListings - activeListings} inactive`,
      icon:  "🏷️",
    },
    {
      label: "Total Sales",
      value: String(totalSales),
      sub:   totalSales > 0 ? `${formatCurrency(totalRev, currencyCode)} revenue` : "No orders yet",
      icon:  "🛒",
    },
    {
      label: "Net Profit",
      value: totalSales > 0 ? formatCurrency(totalNet, currencyCode) : "—",
      sub:   totalSales > 0 && totalRev > 0
        ? `${((totalNet / totalRev) * 100).toFixed(1)}% margin`
        : "Track orders to see profit",
      icon:  "💰",
    },
    {
      label: "Shop Rating",
      value: avgRating ? `${avgRating} ⭐` : "—",
      sub:   totalReviews > 0
        ? `${totalReviews} review${totalReviews !== 1 ? "s" : ""}${unreplied > 0 ? ` · ${unreplied} unreplied` : ""}`
        : "No reviews yet",
      icon:  "⭐",
    },
  ];

  // Pending orders
  const pendingOrders = orders.filter((r) => {
    const s = asText(r.properties["Status"]);
    return s === "Pending" || s === "Processing";
  });

  // High-priority ideas
  const highPriorityIdeas = (ideasDb?.rows ?? []).filter((r) => asText(r.properties["Priority"]) === "High" && asText(r.properties["Status"]) !== "Live").slice(0, 5);

  const stageBadge: Record<string, { bg: string; color: string }> = {
    "Just starting":    { bg: "rgba(107,114,128,0.10)", color: "#374151" },
    "Under 50 sales":   { bg: "rgba(217,119,6,0.10)",   color: "#92400e" },
    "50–500 sales":     { bg: "rgba(22,163,74,0.10)",   color: "#14532d" },
    "500+ sales":       { bg: "rgba(124,58,237,0.10)",  color: "#4c1d95" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>
      {/* Hero + theme picker wrapper */}
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
              <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>{shopName}</h1>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                {shopType && SHOP_TYPE_BADGE[shopType] && (
                  <span style={{
                    background: "rgba(255,255,255,0.22)",
                    borderRadius: "20px",
                    padding: "3px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    backdropFilter: "blur(4px)",
                  }}>
                    {SHOP_TYPE_BADGE[shopType].label}
                  </span>
                )}
                {shopStage && (
                  <span style={{
                    background: "rgba(255,255,255,0.22)",
                    borderRadius: "20px",
                    padding: "3px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    backdropFilter: "blur(4px)",
                  }}>
                    {shopStage}
                  </span>
                )}
              </div>
              {latestNet !== null && (
                <p style={{ marginTop: "12px", fontSize: "13px", opacity: 0.9 }}>
                  Latest month net: <strong>{formatCurrency(latestNet, currencyCode)}</strong>
                </p>
              )}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>🛍️</p>
              <p style={{ fontSize: "11px", opacity: 0.75, marginTop: "4px" }}>Etsy Shop Manager</p>
            </div>
          </div>
        </section>

        {/* Theme picker — sibling of section to avoid overflow:hidden clipping */}
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

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Pending orders */}
        <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "18px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: N_FG, margin: "0 0 12px 0" }}>
            📦 Pending Orders
          </h3>
          {pendingOrders.length === 0 ? (
            <p style={{ fontSize: "12px", color: N_MUTED }}>No pending orders. You're all caught up!</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
              {pendingOrders.slice(0, 5).map((o, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: N_BG, borderRadius: "8px" }}>
                  <span style={{ fontSize: "12px", color: N_FG, fontWeight: 500 }}>
                    {asText(o.properties["Order ID"] ?? o.properties["title"]) || `Order ${i + 1}`}
                  </span>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background: asText(o.properties["Status"]) === "Pending" ? "rgba(217,119,6,0.10)" : "rgba(59,130,246,0.10)",
                    color: asText(o.properties["Status"]) === "Pending" ? "#92400e" : "#1d4ed8",
                  }}>
                    {asText(o.properties["Status"])}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top ideas + unreplied reviews */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Unreplied reviews */}
          {unreplied > 0 && (
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: "12px", padding: "14px 16px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#991b1b", margin: "0 0 4px 0" }}>
                ⚠️ {unreplied} Unreplied Review{unreplied !== 1 ? "s" : ""}
              </p>
              <p style={{ fontSize: "12px", color: "#b91c1c", margin: 0 }}>
                Replying to reviews boosts your shop rank. Use the Review Manager tab.
              </p>
            </div>
          )}

          {/* High-priority ideas */}
          <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "18px", flex: 1 }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: N_FG, margin: "0 0 12px 0" }}>
              💡 High-Priority Ideas
            </h3>
            {highPriorityIdeas.length === 0 ? (
              <p style={{ fontSize: "12px", color: N_MUTED }}>No high-priority ideas yet — add them in the Product Ideas database.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                {highPriorityIdeas.map((idea, i) => (
                  <li key={i} style={{ fontSize: "12px", color: N_FG, padding: "6px 10px", background: theme.accentLight, border: `1px solid ${theme.accentBorder}`, borderRadius: "8px" }}>
                    {asText(idea.properties["Product Idea"] ?? idea.properties["title"]) || `Idea ${i + 1}`}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick stats */}
          {ideasCount > 0 && (
            <div style={{ background: N_BG, border: `1px solid ${N_BORDER}`, borderRadius: "10px", padding: "12px 14px", display: "flex", gap: "16px", alignItems: "center" }}>
              <span style={{ fontSize: "18px" }}>💡</span>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: N_FG, margin: 0 }}>{ideasCount} idea{ideasCount !== 1 ? "s" : ""} in backlog</p>
                <p style={{ fontSize: "11px", color: N_MUTED, margin: 0 }}>Ready to develop</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
