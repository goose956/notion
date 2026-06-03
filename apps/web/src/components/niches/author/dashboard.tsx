"use client";
import { useState } from "react";
import { Palette } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, OUTLINE_SECTIONS, asText, GOAL_BADGE } from "./utils";

const THEMES = [
  {
    id: "amber",
    label: "Amber Ink",
    emoji: "📜",
    gradient: "linear-gradient(135deg, #1c0a00 0%, #78350f 40%, #d97706 75%, #fde68a 100%)",
    shadow: "rgba(217,119,6,0.30)",
    accent: "#d97706",
    accentLight: ACCENT_LIGHT,
    accentBorder: ACCENT_BORDER,
    accentText: ACCENT_TEXT,
  },
  {
    id: "midnight",
    label: "Midnight",
    emoji: "🌙",
    gradient: "linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e3a5f 75%, #38bdf8 100%)",
    shadow: "rgba(15,23,42,0.50)",
    accent: "#0ea5e9",
    accentLight: "rgba(14,165,233,0.07)",
    accentBorder: "rgba(14,165,233,0.20)",
    accentText: "#0369a1",
  },
  {
    id: "forest",
    label: "Forest",
    emoji: "🌿",
    gradient: "linear-gradient(135deg, #052e16 0%, #14532d 40%, #16a34a 75%, #bbf7d0 100%)",
    shadow: "rgba(22,163,74,0.28)",
    accent: "#16a34a",
    accentLight: "rgba(22,163,74,0.07)",
    accentBorder: "rgba(22,163,74,0.22)",
    accentText: "#14532d",
  },
  {
    id: "violet",
    label: "Violet",
    emoji: "🔮",
    gradient: "linear-gradient(135deg, #2e1065 0%, #7c3aed 40%, #a78bfa 75%, #ede9fe 100%)",
    shadow: "rgba(124,58,237,0.30)",
    accent: "#7c3aed",
    accentLight: "rgba(124,58,237,0.07)",
    accentBorder: "rgba(124,58,237,0.22)",
    accentText: "#5b21b6",
  },
  {
    id: "crimson",
    label: "Crimson",
    emoji: "🩸",
    gradient: "linear-gradient(135deg, #450a0a 0%, #991b1b 40%, #ef4444 75%, #fecaca 100%)",
    shadow: "rgba(153,27,27,0.30)",
    accent: "#dc2626",
    accentLight: "rgba(220,38,38,0.07)",
    accentBorder: "rgba(220,38,38,0.22)",
    accentText: "#991b1b",
  },
  {
    id: "slate",
    label: "Slate",
    emoji: "🖊️",
    gradient: "linear-gradient(135deg, #0f172a 0%, #334155 40%, #64748b 75%, #e2e8f0 100%)",
    shadow: "rgba(100,116,139,0.30)",
    accent: "#64748b",
    accentLight: "rgba(100,116,139,0.07)",
    accentBorder: "rgba(100,116,139,0.22)",
    accentText: "#334155",
  },
] as const;

type ThemeId = typeof THEMES[number]["id"];

export function AuthorDashboard({
  databases,
  criteria,
  nicheId = "author",
}: {
  databases: import("@/app/api/members/workspace/route").WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
  nicheId?:  string;
}) {
  const storageKey = `authorDashboardTheme_${nicheId}`;
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "amber";
    return (localStorage.getItem(storageKey) as ThemeId | null) ?? "amber";
  });
  const [showPicker, setShowPicker] = useState(false);
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0]!;

  function selectTheme(id: ThemeId) {
    setThemeId(id);
    localStorage.setItem(storageKey, id);
    setShowPicker(false);
  }

  const bookTitle   = asText(criteria?.["book-title"])  || "Your Book";
  const genre       = asText(criteria?.["genre"]);
  const goal        = asText(criteria?.["goal"]);
  const goalBadge   = GOAL_BADGE[goal] ?? null;
  const wordTarget  = Number(criteria?.["word-target"])  || null;

  const docsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents") ?? null;

  // How many outline sections have been generated
  const generatedSections = new Set(
    (docsDb?.rows ?? []).map((r) => asText(r.properties["Section"])).filter(Boolean),
  );
  const completeness = Math.round((generatedSections.size / OUTLINE_SECTIONS.length) * 100);

  // Characters saved
  const charsDb       = databases.find((d) => d.nicheId === nicheId && d.dbId === "characters") ?? null;
  const characterCount = charsDb?.rows.length ?? 0;

  // Scenes saved
  const scenesDb   = databases.find((d) => d.nicheId === nicheId && d.dbId === "scenes") ?? null;
  const sceneCount = scenesDb?.rows.length ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>

      {/* HERO */}
      <div style={{ position: "relative" }}>
        <section style={{ borderRadius: "16px", background: theme.gradient, overflow: "hidden", boxShadow: `0 12px 40px ${theme.shadow}`, padding: "22px 26px 20px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
            📖 Author & Book Writing OS
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
            <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "white", textShadow: "0 1px 6px rgba(0,0,0,0.25)" }}>
              {bookTitle}
            </h2>
            {genre && (
              <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "99px", background: "rgba(255,255,255,0.18)", color: "white", fontWeight: 600, border: "1px solid rgba(255,255,255,0.3)" }}>
                {genre}
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
              <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.09em" }}>Outline completeness</p>
              <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "white" }}>{completeness}%</p>
            </div>
            <div style={{ height: "6px", borderRadius: "99px", background: "rgba(255,255,255,0.20)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${completeness}%`, borderRadius: "99px", background: "white", transition: "width 0.4s ease" }} />
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.55)" }}>
              {generatedSections.size} of {OUTLINE_SECTIONS.length} sections generated
            </p>
          </div>
        </section>

        {/* Theme picker */}
        <div style={{ position: "absolute", top: "14px", right: "14px", zIndex: 10 }}>
          <button
            onClick={() => setShowPicker((v) => !v)}
            style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.30)", borderRadius: "8px", padding: "6px 8px", cursor: "pointer", color: "white", display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 600, fontFamily: N_FONT }}
          >
            <Palette size={13} /> Theme
          </button>
          {showPicker && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "white", border: `1px solid ${N_BORDER_MED}`, borderRadius: "12px", padding: "8px", boxShadow: "0 8px 30px rgba(0,0,0,0.14)", zIndex: 50, display: "flex", flexDirection: "column", gap: "4px", minWidth: "160px" }}>
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => selectTheme(t.id)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", border: "none", background: themeId === t.id ? theme.accentLight : "transparent", color: themeId === t.id ? theme.accentText : N_FG, fontWeight: themeId === t.id ? 700 : 400, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT, textAlign: "left", whiteSpace: "nowrap" }}>
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
        <div style={{ borderRadius: "12px", background: theme.accentLight, border: `1px solid ${theme.accentBorder}`, padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: theme.accentText }}>Outline sections</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>{generatedSections.size}<span style={{ fontSize: "14px", fontWeight: 500, color: N_SUBTLE }}>/{OUTLINE_SECTIONS.length}</span></p>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>Use Story Planner to generate</p>
        </div>
        <div style={{ borderRadius: "12px", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)", padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#5b21b6" }}>Characters</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>{characterCount}</p>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>profiles saved</p>
        </div>
        <div style={{ borderRadius: "12px", background: "rgba(8,145,178,0.06)", border: "1px solid rgba(8,145,178,0.18)", padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#0e7490" }}>Scenes written</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>{sceneCount}</p>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>saved to scene library</p>
        </div>
        {wordTarget && (
          <div style={{ borderRadius: "12px", background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.18)", padding: "14px" }}>
            <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#14532d" }}>Word target</p>
            <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: N_FG }}>{wordTarget.toLocaleString()}</p>
            <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>words</p>
          </div>
        )}
      </div>

      {/* OUTLINE SECTIONS */}
      <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}` }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Your story outline</p>
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>Use the Story Planner tab to generate each section</p>
        </div>
        <div>
          {OUTLINE_SECTIONS.map((section, i) => {
            const done = generatedSections.has(section);
            return (
              <div key={section} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 16px", borderBottom: i < OUTLINE_SECTIONS.length - 1 ? `1px solid ${N_BORDER}` : "none" }}>
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

      {/* QUICK TIPS */}
      <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", padding: "14px 16px" }}>
        <p style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 700, color: N_FG }}>Getting started</p>
        {[
          { icon: "1️⃣", text: "Go to Story Planner — generate your Premise & Hook first, then chapter outline" },
          { icon: "2️⃣", text: "Go to Character Builder — create profiles for your main cast with AI" },
          { icon: "3️⃣", text: "Go to Scene Writer — paste your current context and let AI write or continue the scene" },
        ].map((tip) => (
          <div key={tip.icon} style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
            <span style={{ fontSize: "14px", flexShrink: 0 }}>{tip.icon}</span>
            <p style={{ margin: 0, fontSize: "12px", color: N_MUTED, lineHeight: 1.5 }}>{tip.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
