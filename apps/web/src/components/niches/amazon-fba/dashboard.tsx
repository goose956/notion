"use client";
import { useState } from "react";
import { Palette } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, asText } from "./utils";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";

const DASHBOARD_THEMES = [
  {
    id: "gold",
    label: "Gold",
    emoji: "🥇",
    gradient: "linear-gradient(135deg, #1a0e00 0%, #7c3800 42%, #c97f00 72%, #f5c842 100%)",
    shadow: "rgba(124,56,0,0.35)",
  },
  {
    id: "night",
    label: "Night",
    emoji: "🌃",
    gradient: "linear-gradient(135deg, #050505 0%, #0f172a 42%, #1e293b 72%, #334155 100%)",
    shadow: "rgba(15,23,42,0.50)",
  },
  {
    id: "copper",
    label: "Copper",
    emoji: "🔶",
    gradient: "linear-gradient(135deg, #180800 0%, #7c2d12 42%, #ea580c 72%, #fb923c 100%)",
    shadow: "rgba(124,45,18,0.38)",
  },
  {
    id: "ocean",
    label: "Ocean",
    emoji: "🌊",
    gradient: "linear-gradient(135deg, #030f1a 0%, #0e3a5e 42%, #0891b2 72%, #38bdf8 100%)",
    shadow: "rgba(8,145,178,0.30)",
  },
  {
    id: "forest",
    label: "Forest",
    emoji: "🌿",
    gradient: "linear-gradient(135deg, #071a0a 0%, #14532d 42%, #16a34a 72%, #4ade80 100%)",
    shadow: "rgba(20,83,45,0.35)",
  },
] as const;
type ThemeId = (typeof DASHBOARD_THEMES)[number]["id"];

export function FBADashboard({
  databases,
  criteria,
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
}) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "gold";
    return (localStorage.getItem("fbaDashboardTheme") as ThemeId | null) ?? "gold";
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const theme = DASHBOARD_THEMES.find((t) => t.id === themeId) ?? DASHBOARD_THEMES[0]!;

  function selectTheme(id: ThemeId) {
    setThemeId(id);
    localStorage.setItem("fbaDashboardTheme", id);
    setShowThemePicker(false);
  }

  const productsDb = databases.find((d) => d.nicheId === "amazon-fba" && d.dbId === "products")  ?? null;
  const docsDb     = databases.find((d) => d.nicheId === "amazon-fba" && d.dbId === "documents") ?? null;

  const products  = productsDb?.rows ?? [];
  const allDocs   = docsDb?.rows     ?? [];

  const live       = products.filter((r) => asText(r.properties["Status"]) === "Live");
  const sourcing   = products.filter((r) => asText(r.properties["Status"]) === "Sourcing");
  const researching = products.filter((r) => asText(r.properties["Status"]) === "Researching");
  const reports    = allDocs.filter((r) => asText(r.properties["Type"]) === "Research Report");
  const listings   = allDocs.filter((r) => asText(r.properties["Type"]) === "Listing");

  const totalRevenue = products.reduce((sum, r) => {
    const v = r.properties["Monthly Revenue"];
    const n = typeof v === "number" ? v : (v && typeof v === "object" && "number" in (v as object) ? (v as { number: number }).number : 0);
    return sum + (n || 0);
  }, 0);

  const marketplace    = String(criteria?.["marketplace"]     ?? "").trim();
  const category       = String(criteria?.["category"]        ?? "").trim();
  const businessStage  = String(criteria?.["business-stage"]  ?? "").trim();
  const isUS = marketplace.toLowerCase().includes("us") || marketplace.toLowerCase().includes(".com");
  const currency = isUS ? "$" : "£";

  const stats = [
    { label: "Live Products",     value: live.length                                                    },
    { label: "Research Reports",  value: reports.length                                                 },
    { label: "Optimised Listings",value: listings.length                                                },
    { label: "Monthly Revenue",   value: totalRevenue > 0 ? `${currency}${totalRevenue.toLocaleString()}` : "—" },
  ];

  const statusColors: Record<string, string> = {
    Live: "#16a34a", Sourcing: "#ea580c", Researching: "#d97706", Paused: "#6b7280", Dropped: "#dc2626",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>

      {/* ── HERO BANNER ─────────────────────────────────────────────────────── */}
      <section style={{ borderRadius: "16px", background: theme.gradient, overflow: "visible", boxShadow: `0 12px 40px ${theme.shadow}, 0 2px 8px rgba(0,0,0,0.12)`, padding: "22px 26px 20px", display: "flex", flexDirection: "column", gap: "10px", position: "relative" }}>
        <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
          📦 Amazon FBA Seller OS
        </p>

        <div style={{ position: "relative" }}>
          <button type="button" onClick={() => setShowThemePicker((s) => !s)} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.12)", cursor: "pointer", fontSize: "11px", color: "rgba(255,255,255,0.85)", fontFamily: N_FONT }}>
            <Palette size={11} /> {theme.emoji} {theme.label}
          </button>
          {showThemePicker && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, background: "white", borderRadius: "10px", boxShadow: "0 8px 28px rgba(0,0,0,0.18)", padding: "10px 12px", display: "flex", gap: "8px", flexWrap: "wrap", minWidth: "240px", border: "1px solid rgba(0,0,0,0.08)" }}>
              {DASHBOARD_THEMES.map((t) => (
                <button key={t.id} type="button" onClick={() => selectTheme(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "6px 8px", borderRadius: "8px", border: t.id === themeId ? "2px solid #37352F" : "2px solid transparent", background: t.id === themeId ? "rgba(55,53,47,0.07)" : "transparent", cursor: "pointer", fontFamily: N_FONT }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: t.gradient, flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.20)" }} />
                  <span style={{ fontSize: "10px", color: "#37352F", fontWeight: t.id === themeId ? 700 : 400 }}>{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <h2 style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "white", textShadow: "0 1px 8px rgba(0,0,0,0.30)" }}>
          FBA Business
        </h2>
        {(marketplace || category) && (
          <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
            {[marketplace, category].filter(Boolean).join(" · ")}
          </p>
        )}
        {businessStage && (
          <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>{businessStage}</p>
        )}

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
          {stats.map((s) => (
            <div key={s.label} style={{ padding: "5px 14px", borderRadius: "99px", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "white" }}>{s.value}</span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pipeline ─────────────────────────────────────────────────────────── */}
      {products.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {[
            { label: "Researching", count: researching.length, color: "#d97706" },
            { label: "Sourcing",    count: sourcing.length,    color: "#ea580c" },
            { label: "Live",        count: live.length,        color: "#16a34a" },
          ].map((s) => (
            <div key={s.label} style={{ padding: "14px", borderRadius: "10px", border: `1px solid ${N_BORDER_MED}`, background: "white", textAlign: "center" }}>
              <p style={{ margin: "0 0 2px", fontSize: "22px", fontWeight: 800, color: s.color }}>{s.count}</p>
              <p style={{ margin: 0, fontSize: "12px", color: N_MUTED }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Getting started ──────────────────────────────────────────────────── */}
      {allDocs.length === 0 && products.length === 0 && (
        <div style={{ padding: "20px", borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT }}>
          <p style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>Get started in 3 steps</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { n: "1", label: "Product Research", desc: "Enter a product idea — AI returns a full viability report with demand, competition and profit estimates." },
              { n: "2", label: "Listing Writer",   desc: "Generate a fully SEO-optimised Amazon listing: title, bullets, description and backend keywords." },
              { n: "3", label: "Supplier Brief",   desc: "AI writes a sourcing brief to send to suppliers — spec, MOQ, packaging, quality questions." },
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

      {/* ── Product tracker ──────────────────────────────────────────────────── */}
      {products.length > 0 && (
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER_MED}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Product Tracker</p>
          </div>
          {products.slice(0, 8).map((row) => {
            const name     = asText(row.properties["Title"]);
            const status   = asText(row.properties["Status"]);
            const category = asText(row.properties["Category"]);
            const rev      = row.properties["Monthly Revenue"];
            const revNum   = typeof rev === "number" ? rev : (rev && typeof rev === "object" && "number" in (rev as object) ? (rev as { number: number }).number : null);
            const color    = statusColors[status] ?? ACCENT;
            return (
              <div key={row.pageId} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", background: `${color}18`, color, border: `1px solid ${color}30` }}>{status || "—"}</span>
                <span style={{ flex: 1, fontSize: "13px", color: N_FG, fontWeight: 500 }}>{name || "Untitled"}</span>
                {category && <span style={{ fontSize: "11px", color: N_MUTED }}>{category}</span>}
                {revNum != null && revNum > 0 && <span style={{ fontSize: "12px", fontWeight: 700, color: ACCENT_TEXT }}>{currency}{revNum.toLocaleString()}/mo</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Recent documents ─────────────────────────────────────────────────── */}
      {allDocs.length > 0 && (
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER_MED}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Recent Documents</p>
          </div>
          {allDocs.slice(0, 5).map((row) => {
            const type    = asText(row.properties["Type"]);
            const title   = asText(row.properties["Title"]);
            const product = asText(row.properties["Product"]);
            const typeColors: Record<string, string> = { "Research Report": "#2563eb", "Listing": "#16a34a", "Supplier Brief": "#ea580c" };
            const color = typeColors[type] ?? ACCENT;
            return (
              <div key={row.pageId} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", background: `${color}18`, color, border: `1px solid ${color}30` }}>{type}</span>
                <span style={{ flex: 1, fontSize: "13px", color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Untitled"}</span>
                {product && <span style={{ fontSize: "11px", color: N_MUTED, flexShrink: 0 }}>{product}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
