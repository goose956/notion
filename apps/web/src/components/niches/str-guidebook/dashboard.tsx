"use client";
import { useState, useEffect } from "react";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";
import { asText, asNumber, SECTION_ICON } from "./utils";

const DASHBOARD_THEMES = [
  {
    id: "coastal",
    label: "🌊 Coastal",
    gradient: "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)",
    shadow:   "0 4px 20px rgba(8,145,178,0.25)",
    accent: "#0891b2", accentLight: "rgba(8,145,178,0.08)", accentBorder: "rgba(8,145,178,0.22)", accentText: "#164e63",
    statCards: [
      { bg: "rgba(8,145,178,0.07)",  border: "rgba(8,145,178,0.18)",  label: "#164e63" },
      { bg: "rgba(8,145,178,0.07)",  border: "rgba(8,145,178,0.18)",  label: "#164e63" },
      { bg: "rgba(8,145,178,0.07)",  border: "rgba(8,145,178,0.18)",  label: "#164e63" },
      { bg: "rgba(8,145,178,0.07)",  border: "rgba(8,145,178,0.18)",  label: "#164e63" },
    ],
  },
  {
    id: "villa",
    label: "🌿 Villa",
    gradient: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
    shadow:   "0 4px 20px rgba(22,163,74,0.22)",
    accent: "#16a34a", accentLight: "rgba(22,163,74,0.08)", accentBorder: "rgba(22,163,74,0.22)", accentText: "#14532d",
    statCards: [
      { bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.18)", label: "#14532d" },
      { bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.18)", label: "#14532d" },
      { bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.18)", label: "#14532d" },
      { bg: "rgba(22,163,74,0.07)", border: "rgba(22,163,74,0.18)", label: "#14532d" },
    ],
  },
  {
    id: "sunset",
    label: "🌅 Sunset",
    gradient: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
    shadow:   "0 4px 20px rgba(249,115,22,0.22)",
    accent: "#f97316", accentLight: "rgba(249,115,22,0.08)", accentBorder: "rgba(249,115,22,0.22)", accentText: "#7c2d12",
    statCards: [
      { bg: "rgba(249,115,22,0.07)", border: "rgba(249,115,22,0.18)", label: "#7c2d12" },
      { bg: "rgba(249,115,22,0.07)", border: "rgba(249,115,22,0.18)", label: "#7c2d12" },
      { bg: "rgba(249,115,22,0.07)", border: "rgba(249,115,22,0.18)", label: "#7c2d12" },
      { bg: "rgba(249,115,22,0.07)", border: "rgba(249,115,22,0.18)", label: "#7c2d12" },
    ],
  },
  {
    id: "alpine",
    label: "🏔️ Alpine",
    gradient: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    shadow:   "0 4px 20px rgba(71,85,105,0.25)",
    accent: "#475569", accentLight: "rgba(71,85,105,0.08)", accentBorder: "rgba(71,85,105,0.22)", accentText: "#1e293b",
    statCards: [
      { bg: "rgba(71,85,105,0.07)", border: "rgba(71,85,105,0.18)", label: "#1e293b" },
      { bg: "rgba(71,85,105,0.07)", border: "rgba(71,85,105,0.18)", label: "#1e293b" },
      { bg: "rgba(71,85,105,0.07)", border: "rgba(71,85,105,0.18)", label: "#1e293b" },
      { bg: "rgba(71,85,105,0.07)", border: "rgba(71,85,105,0.18)", label: "#1e293b" },
    ],
  },
  {
    id: "rose",
    label: "🌸 Rose",
    gradient: "linear-gradient(135deg, #db2777 0%, #be185d 100%)",
    shadow:   "0 4px 20px rgba(219,39,119,0.22)",
    accent: "#db2777", accentLight: "rgba(219,39,119,0.08)", accentBorder: "rgba(219,39,119,0.22)", accentText: "#831843",
    statCards: [
      { bg: "rgba(219,39,119,0.07)", border: "rgba(219,39,119,0.18)", label: "#831843" },
      { bg: "rgba(219,39,119,0.07)", border: "rgba(219,39,119,0.18)", label: "#831843" },
      { bg: "rgba(219,39,119,0.07)", border: "rgba(219,39,119,0.18)", label: "#831843" },
      { bg: "rgba(219,39,119,0.07)", border: "rgba(219,39,119,0.18)", label: "#831843" },
    ],
  },
  {
    id: "airbnb",
    label: "🏠 Airbnb",
    gradient: "linear-gradient(135deg, #ff5a5f 0%, #e0414a 100%)",
    shadow:   "0 4px 20px rgba(255,90,95,0.25)",
    accent: "#ff5a5f", accentLight: "rgba(255,90,95,0.08)", accentBorder: "rgba(255,90,95,0.22)", accentText: "#7f1d1d",
    statCards: [
      { bg: "rgba(255,90,95,0.07)", border: "rgba(255,90,95,0.18)", label: "#7f1d1d" },
      { bg: "rgba(255,90,95,0.07)", border: "rgba(255,90,95,0.18)", label: "#7f1d1d" },
      { bg: "rgba(255,90,95,0.07)", border: "rgba(255,90,95,0.18)", label: "#7f1d1d" },
      { bg: "rgba(255,90,95,0.07)", border: "rgba(255,90,95,0.18)", label: "#7f1d1d" },
    ],
  },
];

const N_FG     = "#111827";
const N_MUTED  = "#6b7280";
const N_BORDER = "#e5e7eb";
const N_BG     = "#f9fafb";

export function STRDashboard({
  databases,
  criteria,
  nicheId,
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
  nicheId:   string;
}) {
  const [themeId, setThemeId]       = useState("coastal");
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`strDashboardTheme_${nicheId}`);
    if (saved && DASHBOARD_THEMES.find((t) => t.id === saved)) setThemeId(saved);
  }, [nicheId]);

  const selectTheme = (id: string) => {
    setThemeId(id);
    localStorage.setItem(`strDashboardTheme_${nicheId}`, id);
    setShowPicker(false);
  };

  const theme = DASHBOARD_THEMES.find((t) => t.id === themeId) ?? DASHBOARD_THEMES[0]!;

  const propertyName  = asText(criteria?.["property-name"])  || "Your Property";
  const propertyType  = asText(criteria?.["property-type"])  || "";
  const neighbourhood = asText(criteria?.["neighbourhood"])  || "";
  const city          = asText(criteria?.["city"])           || "";
  const hostName      = asText(criteria?.["host-name"])      || "";

  const propertiesDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "properties");
  const guidebookDb   = databases.find((d) => d.nicheId === nicheId && d.dbId === "guidebook");
  const guestsDb      = databases.find((d) => d.nicheId === nicheId && d.dbId === "guests");
  const welcomeDb     = databases.find((d) => d.nicheId === nicheId && d.dbId === "welcome-pack");

  // Guidebook completion
  const SECTIONS = ["Dining & Cafés", "Things to Do", "Supermarkets & Shops", "Transport & Parking", "Emergency & Safety", "Local Tips"];
  const generatedSections = new Set(
    (guidebookDb?.rows ?? []).map((r) => asText(r.properties["Section"]))
  );
  const sectionsComplete = SECTIONS.filter((s) => generatedSections.has(s)).length;

  // Welcome pack completion
  const PACK_TYPES = ["Welcome Letter", "Check-in Guide", "House Rules", "Checkout Checklist", "WiFi Card"];
  const generatedPack = new Set(
    (welcomeDb?.rows ?? []).map((r) => asText(r.properties["Type"]))
  );
  const packComplete = PACK_TYPES.filter((p) => generatedPack.has(p)).length;

  // Guests
  const guestRows   = guestsDb?.rows ?? [];
  const upcoming    = guestRows.filter((r) => asText(r.properties["Status"]) === "Upcoming");
  const checkedIn   = guestRows.filter((r) => asText(r.properties["Status"]) === "Checked In");
  const totalGuests = guestRows.length;

  const statCards = [
    {
      icon: "🏠", label: "Properties",
      value: (propertiesDb?.rows.length ?? 0) > 0 ? String(propertiesDb!.rows.length) : "1",
      sub: propertyType || "Your rental",
    },
    {
      icon: "📖", label: "Guidebook",
      value: `${sectionsComplete} / ${SECTIONS.length}`,
      sub: sectionsComplete === SECTIONS.length ? "Complete!" : `${SECTIONS.length - sectionsComplete} sections remaining`,
    },
    {
      icon: "📋", label: "Welcome Pack",
      value: `${packComplete} / ${PACK_TYPES.length}`,
      sub: packComplete === PACK_TYPES.length ? "Complete!" : `${PACK_TYPES.length - packComplete} docs remaining`,
    },
    {
      icon: "👤", label: "Guests",
      value: checkedIn.length > 0 ? `${checkedIn.length} in` : String(upcoming.length),
      sub: checkedIn.length > 0 ? "Currently staying" : `${upcoming.length} upcoming`,
    },
  ];

  // Upcoming guests
  const nextGuests = upcoming.slice(0, 4);

  // Missing guidebook sections
  const missingSections = SECTIONS.filter((s) => !generatedSections.has(s));

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Hero + picker */}
      <div style={{ position: "relative", marginBottom: "24px" }}>
        <section style={{
          background: theme.gradient,
          borderRadius: "14px",
          padding: "28px 32px",
          color: "white",
          boxShadow: theme.shadow,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>{propertyName}</h1>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                {propertyType && (
                  <span style={{ background: "rgba(255,255,255,0.22)", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontWeight: 600, backdropFilter: "blur(4px)" }}>
                    🏠 {propertyType}
                  </span>
                )}
                {(neighbourhood || city) && (
                  <span style={{ background: "rgba(255,255,255,0.18)", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", backdropFilter: "blur(4px)" }}>
                    📍 {[neighbourhood, city].filter(Boolean).join(", ")}
                  </span>
                )}
                {hostName && (
                  <span style={{ background: "rgba(255,255,255,0.15)", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", backdropFilter: "blur(4px)" }}>
                    👤 Host: {hostName}
                  </span>
                )}
              </div>
              {sectionsComplete < SECTIONS.length && (
                <p style={{ marginTop: "12px", fontSize: "13px", opacity: 0.9 }}>
                  Guidebook {Math.round((sectionsComplete / SECTIONS.length) * 100)}% complete — use the Guidebook Builder to finish it
                </p>
              )}
              {sectionsComplete === SECTIONS.length && packComplete === PACK_TYPES.length && (
                <p style={{ marginTop: "12px", fontSize: "13px", opacity: 0.9 }}>
                  ✅ Guidebook and welcome pack are complete
                </p>
              )}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>🏡</p>
              <p style={{ fontSize: "11px", opacity: 0.75, marginTop: "4px" }}>STR Guidebook</p>
            </div>
          </div>
        </section>

        {/* Theme picker */}
        <div style={{ position: "absolute", top: "14px", right: "14px", zIndex: 10 }}>
          <button
            onClick={() => setShowPicker((p) => !p)}
            style={{ background: "rgba(255,255,255,0.20)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: "8px", padding: "5px 10px", cursor: "pointer", fontSize: "12px", color: "white", backdropFilter: "blur(4px)", fontWeight: 600 }}
          >
            🎨
          </button>
          {showPicker && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden", minWidth: "160px" }}>
              {DASHBOARD_THEMES.map((t) => (
                <button key={t.id} onClick={() => selectTheme(t.id)}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: themeId === t.id ? "#f3f4f6" : "transparent", cursor: "pointer", fontSize: "13px", color: N_FG, fontWeight: themeId === t.id ? 600 : 400, whiteSpace: "nowrap" }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px,1fr))", gap: "14px", marginBottom: "24px" }}>
        {statCards.map((card, i) => (
          <div key={i} style={{ background: theme.statCards[i]?.bg ?? theme.accentLight, border: `1px solid ${theme.statCards[i]?.border ?? theme.accentBorder}`, borderRadius: "12px", padding: "16px 18px" }}>
            <p style={{ fontSize: "20px", margin: "0 0 6px 0" }}>{card.icon}</p>
            <p style={{ fontSize: "11px", fontWeight: 600, color: theme.statCards[i]?.label ?? theme.accentText, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>{card.label}</p>
            <p style={{ fontSize: "22px", fontWeight: 800, color: N_FG, margin: "0 0 2px 0" }}>{card.value}</p>
            <p style={{ fontSize: "11px", color: N_MUTED, margin: 0 }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Guidebook status */}
        <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "18px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: N_FG, margin: "0 0 12px 0" }}>📖 Guidebook Status</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {SECTIONS.map((section) => {
              const done = generatedSections.has(section);
              return (
                <div key={section} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: done ? "rgba(22,163,74,0.06)" : N_BG, borderRadius: "8px", border: `1px solid ${done ? "rgba(22,163,74,0.18)" : N_BORDER}` }}>
                  <span style={{ fontSize: "12px", color: N_FG }}>{SECTION_ICON[section] ?? "📌"} {section}</span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: done ? "#16a34a" : N_MUTED }}>{done ? "✓ Done" : "—"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming guests + welcome pack status */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Welcome pack */}
          <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "16px 18px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: N_FG, margin: "0 0 10px 0" }}>📋 Welcome Pack</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {PACK_TYPES.map((pt) => {
                const done = generatedPack.has(pt);
                return (
                  <span key={pt} style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "20px", background: done ? "rgba(22,163,74,0.10)" : N_BG, color: done ? "#15803d" : N_MUTED, border: `1px solid ${done ? "rgba(22,163,74,0.20)" : N_BORDER}` }}>
                    {done ? "✓ " : ""}{pt}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Upcoming guests */}
          <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "16px 18px", flex: 1 }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: N_FG, margin: "0 0 10px 0" }}>🗓️ Upcoming Guests</h3>
            {nextGuests.length === 0 ? (
              <p style={{ fontSize: "12px", color: N_MUTED, margin: 0 }}>
                {totalGuests > 0 ? "No upcoming bookings." : "Add guests in the Guests database."}
              </p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
                {nextGuests.map((g, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: N_BG, borderRadius: "8px" }}>
                    <span style={{ fontSize: "12px", color: N_FG, fontWeight: 500 }}>
                      {asText(g.properties["Guest Name"] ?? g.properties["title"]) || "Guest"}
                    </span>
                    <span style={{ fontSize: "11px", color: N_MUTED }}>
                      {asText(g.properties["Check-in Date"]) || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
