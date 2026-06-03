"use client";
import { useState } from "react";
import { Palette } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, asText } from "./utils";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";

// ─── Dashboard colour themes ──────────────────────────────────────────────────
const DASHBOARD_THEMES = [
  {
    id: "power",
    label: "Power",
    emoji: "⚡",
    gradient: "linear-gradient(135deg, #071a0a 0%, #1a4d2a 40%, #16a34a 75%, #4ade80 100%)",
    shadow: "rgba(22,163,74,0.30)",
    accent: "#4ade80",
  },
  {
    id: "iron",
    label: "Iron",
    emoji: "🏋️",
    gradient: "linear-gradient(135deg, #0d0d0d 0%, #1f2937 40%, #374151 75%, #6b7280 100%)",
    shadow: "rgba(31,41,55,0.40)",
    accent: "#9ca3af",
  },
  {
    id: "sunrise",
    label: "Sunrise",
    emoji: "🌅",
    gradient: "linear-gradient(135deg, #1a0500 0%, #7c2d12 40%, #ea580c 72%, #fbbf24 100%)",
    shadow: "rgba(124,45,18,0.35)",
    accent: "#fbbf24",
  },
  {
    id: "ocean",
    label: "Ocean",
    emoji: "🌊",
    gradient: "linear-gradient(135deg, #030f1a 0%, #0e3a5e 40%, #0891b2 72%, #38bdf8 100%)",
    shadow: "rgba(8,145,178,0.30)",
    accent: "#38bdf8",
  },
  {
    id: "midnight",
    label: "Midnight",
    emoji: "🌙",
    gradient: "linear-gradient(135deg, #060312 0%, #1e1b4b 40%, #4338ca 72%, #818cf8 100%)",
    shadow: "rgba(67,56,202,0.35)",
    accent: "#818cf8",
  },
] as const;
type ThemeId = (typeof DASHBOARD_THEMES)[number]["id"];

export function PTDashboard({
  databases,
  criteria,
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
}) {
  const storageKey = "ptDashboardTheme";
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "power";
    return (localStorage.getItem(storageKey) as ThemeId | null) ?? "power";
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const theme = DASHBOARD_THEMES.find((t) => t.id === themeId) ?? DASHBOARD_THEMES[0]!;

  function selectTheme(id: ThemeId) {
    setThemeId(id);
    localStorage.setItem(storageKey, id);
    setShowThemePicker(false);
  }

  const clientsDb  = databases.find((d) => d.nicheId === "personal-trainer" && d.dbId === "clients")  ?? null;
  const docsDb     = databases.find((d) => d.nicheId === "personal-trainer" && d.dbId === "documents") ?? null;

  const clients    = clientsDb?.rows ?? [];
  const allDocs    = docsDb?.rows    ?? [];
  const programmes = allDocs.filter((r) => asText(r.properties["Type"]) === "Training Programme");
  const checkins   = allDocs.filter((r) => asText(r.properties["Type"]) === "Client Check-In");
  const nutrition  = allDocs.filter((r) => asText(r.properties["Type"]) === "Nutrition Guide");

  const businessName = String(criteria?.["business-name"] ?? "").trim();
  const speciality   = String(criteria?.["speciality"]    ?? "").trim();
  const setting      = String(criteria?.["setting"]       ?? "").trim();

  const stats = [
    { label: "Clients",          value: clients.length,    color: ACCENT },
    { label: "Programmes",       value: programmes.length, color: "#2563eb" },
    { label: "Check-Ins",        value: checkins.length,   color: "#7c3aed" },
    { label: "Nutrition Guides", value: nutrition.length,  color: "#ea580c" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>

      {/* ── HERO BANNER ─────────────────────────────────────────────────────── */}
      <section
        style={{
          borderRadius: "16px",
          background: theme.gradient,
          overflow: "hidden",
          boxShadow: `0 12px 40px ${theme.shadow}, 0 2px 8px rgba(0,0,0,0.12)`,
          padding: "22px 26px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          position: "relative",
        }}
      >
        <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
          💪 Personal Trainer Business OS
        </p>

        {/* Theme picker */}
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowThemePicker((s) => !s)}
            title="Change theme"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.12)", cursor: "pointer", fontSize: "11px", color: "rgba(255,255,255,0.85)", fontFamily: N_FONT }}
          >
            <Palette size={11} /> {theme.emoji} {theme.label}
          </button>
          {showThemePicker && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, background: "white", borderRadius: "10px", boxShadow: "0 8px 28px rgba(0,0,0,0.18)", padding: "10px 12px", display: "flex", gap: "8px", flexWrap: "wrap", minWidth: "240px", border: "1px solid rgba(0,0,0,0.08)" }}>
              {DASHBOARD_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTheme(t.id)}
                  title={t.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 8px",
                    borderRadius: "8px",
                    border: t.id === themeId ? "2px solid #37352F" : "2px solid transparent",
                    background: t.id === themeId ? "rgba(55,53,47,0.07)" : "transparent",
                    cursor: "pointer",
                    fontFamily: N_FONT,
                  }}
                >
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: t.gradient, flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.20)" }} />
                  <span style={{ fontSize: "10px", color: "#37352F", fontWeight: t.id === themeId ? 700 : 400 }}>{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <h2 style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "white", textShadow: "0 1px 8px rgba(0,0,0,0.30)" }}>
          {businessName || "My PT Business"}
        </h2>

        {(speciality || setting) && (
          <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
            {[speciality, setting].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Stat pills */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
          {stats.map((s) => (
            <div key={s.label} style={{ padding: "5px 14px", borderRadius: "99px", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "white" }}>{s.value}</span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Getting started ──────────────────────────────────────────────────── */}
      {allDocs.length === 0 && clients.length === 0 && (
        <div style={{ padding: "20px", borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT }}>
          <p style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>Get started in 3 steps</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { n: "1", label: "Add your clients",    desc: "Log each client's goal, fitness level and available equipment in the Clients database." },
              { n: "2", label: "Programme Builder",   desc: "Enter a client's details and AI generates a complete 4-week training programme instantly." },
              { n: "3", label: "Client Check-In",     desc: "Write professional progress updates in your chosen tone — copy and send in seconds." },
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

      {/* ── Client roster ────────────────────────────────────────────────────── */}
      {clients.length > 0 && (
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER_MED}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Your Clients</p>
          </div>
          {clients.slice(0, 8).map((row) => {
            const name  = asText(row.properties["Title"]);
            const goal  = asText(row.properties["Goal"]);
            const level = asText(row.properties["Level"]);
            const goalColors: Record<string, string> = {
              "Weight Loss": "#16a34a", "Weight Loss & Fat Loss": "#16a34a",
              "Muscle Building": "#2563eb", "Muscle Building & Strength": "#2563eb",
              "Athletic Performance": "#7c3aed", "General Fitness": "#0891b2",
              "General Fitness & Lifestyle": "#0891b2", "Rehabilitation": "#ea580c",
              "Rehabilitation & Injury Recovery": "#ea580c", "Endurance": "#d97706",
              "Flexibility & Mobility": "#db2777",
            };
            const color = goalColors[goal] ?? ACCENT;
            return (
              <div key={row.pageId} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ flexShrink: 0, width: "30px", height: "30px", borderRadius: "50%", background: `${color}18`, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700 }}>
                  {(name || "?")[0]?.toUpperCase()}
                </span>
                <span style={{ flex: 1, fontSize: "13px", color: N_FG, fontWeight: 500 }}>{name || "Unnamed Client"}</span>
                {goal  && <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", background: `${color}15`, color, border: `1px solid ${color}25` }}>{goal}</span>}
                {level && <span style={{ fontSize: "11px", color: N_MUTED }}>{level}</span>}
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
            const type   = asText(row.properties["Type"]);
            const title  = asText(row.properties["Title"]);
            const client = asText(row.properties["Client"]);
            const typeColors: Record<string, string> = { "Training Programme": "#16a34a", "Client Check-In": "#2563eb", "Nutrition Guide": "#ea580c" };
            const color = typeColors[type] ?? ACCENT;
            return (
              <div key={row.pageId} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", background: `${color}18`, color, border: `1px solid ${color}30` }}>{type}</span>
                <span style={{ flex: 1, fontSize: "13px", color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Untitled"}</span>
                {client && <span style={{ fontSize: "11px", color: N_MUTED, flexShrink: 0 }}>{client}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
