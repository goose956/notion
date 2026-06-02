"use client";
import { useState, useEffect } from "react";
import { Palette } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";
import { asText, asNumber, ENERGY_LEVELS, type EnergyLevel, parseWeddingDate, daysUntil } from "./utils";

// ─── Dashboard colour themes ──────────────────────────────────────────────────
const DASHBOARD_THEMES = [
  {
    id: "lavender",
    label: "Lavender",
    emoji: "💜",
    gradient: "linear-gradient(135deg, #1e0938 0%, #3b0764 40%, #6d28d9 75%, #c4b5fd 100%)",
    shadow: "rgba(109,40,217,0.30)",
    accent: "#7c3aed",
    accentLight: "rgba(124,58,237,0.07)",
    accentBorder: "rgba(124,58,237,0.20)",
    accentText: "#5b21b6",
    statCards: [
      { bg: "rgba(124,58,237,0.07)",  border: "rgba(124,58,237,0.20)",  label: "#5b21b6" },
      { bg: "rgba(5,150,105,0.06)",   border: "rgba(5,150,105,0.18)",   label: "#065f46" },
      { bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)",  label: "#92400e" },
    ],
  },
  {
    id: "rose",
    label: "Rose",
    emoji: "🌹",
    gradient: "linear-gradient(135deg, #2a0f1e 0%, #6b2040 42%, #be185d 72%, #f9a8d4 100%)",
    shadow: "rgba(190,24,93,0.28)",
    accent: "#be185d",
    accentLight: "rgba(190,24,93,0.07)",
    accentBorder: "rgba(190,24,93,0.20)",
    accentText: "#9d174d",
    statCards: [
      { bg: "rgba(190,24,93,0.07)",   border: "rgba(190,24,93,0.20)",   label: "#9d174d" },
      { bg: "rgba(5,150,105,0.06)",   border: "rgba(5,150,105,0.18)",   label: "#065f46" },
      { bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)",  label: "#92400e" },
    ],
  },
  {
    id: "ocean",
    label: "Ocean",
    emoji: "🌊",
    gradient: "linear-gradient(135deg, #0a1628 0%, #0e3a5e 42%, #1a6a8a 72%, #38b2c8 100%)",
    shadow: "rgba(14,58,94,0.30)",
    accent: "#0891b2",
    accentLight: "rgba(8,145,178,0.07)",
    accentBorder: "rgba(8,145,178,0.20)",
    accentText: "#164e63",
    statCards: [
      { bg: "rgba(8,145,178,0.07)",   border: "rgba(8,145,178,0.20)",   label: "#164e63" },
      { bg: "rgba(5,150,105,0.06)",   border: "rgba(5,150,105,0.18)",   label: "#065f46" },
      { bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)",  label: "#92400e" },
    ],
  },
  {
    id: "forest",
    label: "Forest",
    emoji: "🌿",
    gradient: "linear-gradient(135deg, #071a0a 0%, #1a4d2a 42%, #2d7a4a 72%, #68c88a 100%)",
    shadow: "rgba(26,77,42,0.30)",
    accent: "#16a34a",
    accentLight: "rgba(22,163,74,0.07)",
    accentBorder: "rgba(22,163,74,0.20)",
    accentText: "#166534",
    statCards: [
      { bg: "rgba(22,163,74,0.07)",   border: "rgba(22,163,74,0.20)",   label: "#166534" },
      { bg: "rgba(5,150,105,0.06)",   border: "rgba(5,150,105,0.18)",   label: "#065f46" },
      { bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)",  label: "#92400e" },
    ],
  },
  {
    id: "sunset",
    label: "Sunset",
    emoji: "🌅",
    gradient: "linear-gradient(135deg, #1e0900 0%, #7c2d00 42%, #c96400 72%, #f5c542 100%)",
    shadow: "rgba(124,45,0,0.30)",
    accent: "#d97706",
    accentLight: "rgba(217,119,6,0.07)",
    accentBorder: "rgba(217,119,6,0.20)",
    accentText: "#92400e",
    statCards: [
      { bg: "rgba(217,119,6,0.07)",   border: "rgba(217,119,6,0.20)",   label: "#92400e" },
      { bg: "rgba(5,150,105,0.06)",   border: "rgba(5,150,105,0.18)",   label: "#065f46" },
      { bg: "rgba(124,58,237,0.06)",  border: "rgba(124,58,237,0.18)",  label: "#5b21b6" },
    ],
  },
  {
    id: "pride",
    label: "Pride",
    emoji: "🏳️‍🌈",
    gradient: "linear-gradient(135deg, #e40303 0%, #ff8c00 20%, #ffed00 37%, #008026 55%, #004dff 73%, #750787 100%)",
    shadow: "rgba(100,40,120,0.28)",
    accent: "#7c3aed",
    accentLight: "rgba(124,58,237,0.07)",
    accentBorder: "rgba(124,58,237,0.20)",
    accentText: "#5b21b6",
    statCards: [
      { bg: "rgba(228,3,3,0.07)",     border: "rgba(228,3,3,0.20)",     label: "#991b1b" },
      { bg: "rgba(0,128,38,0.06)",    border: "rgba(0,128,38,0.18)",    label: "#166534" },
      { bg: "rgba(0,77,255,0.06)",    border: "rgba(0,77,255,0.18)",    label: "#1e3a8a" },
    ],
  },
] as const;
type ThemeId = typeof DASHBOARD_THEMES[number]["id"];

export function NDWDashboard({
  databases,
  criteria,
  onCriteriaUpdated,
  nicheId = "neurodivergent-wedding",
}: {
  databases: WorkspaceDatabase[];
  criteria: Record<string, unknown> | null;
  onCriteriaUpdated: (c: Record<string, unknown>) => void;
  nicheId?: string;
}) {
  const storageKey = `ndwDashboardTheme_${nicheId}`;
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "lavender";
    return (localStorage.getItem(storageKey) as ThemeId | null) ?? "lavender";
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const theme = DASHBOARD_THEMES.find((t) => t.id === themeId) ?? DASHBOARD_THEMES[0];

  function selectTheme(id: ThemeId) {
    setThemeId(id);
    localStorage.setItem(storageKey, id);
    setShowThemePicker(false);
  }

  const coupleNames = asText(criteria?.["couple-names"]) || "Your Wedding";
  const savedEnergy = asText(criteria?.["today-energy"]) as EnergyLevel | "";
  const weddingDate = parseWeddingDate(criteria?.["wedding-date"]);
  const totalBudget = asNumber(criteria?.["total-budget"]);

  const [energy, setEnergy]     = useState<EnergyLevel | "">(savedEnergy);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setEnergy(asText(criteria?.["today-energy"]) as EnergyLevel | "");
  }, [criteria]);

  const timelineDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "timeline") ?? null;
  const budgetDb   = databases.find((d) => d.nicheId === nicheId && d.dbId === "budget")   ?? null;
  const guestsDb   = databases.find((d) => d.nicheId === nicheId && d.dbId === "guests")   ?? null;

  const openTasks = (timelineDb?.rows ?? []).filter(
    (r) => asText(r.properties["Status"]) !== "Done" && asText(r.properties["Status"]) !== "Dropped",
  );
  const matchingTasks = energy
    ? openTasks.filter((r) => asText(r.properties["Energy Required"]) === energy).slice(0, 3)
    : openTasks.filter((r) => asText(r.properties["Priority"]) === "Urgent").slice(0, 3);

  const totalSpent      = (budgetDb?.rows ?? []).reduce((sum, r) => sum + (asNumber(r.properties["Actual Cost"]) ?? 0), 0);
  const confirmedGuests = (guestsDb?.rows ?? []).filter((r) => asText(r.properties["RSVP"]) === "Confirmed").length;
  const totalGuests     = guestsDb?.rows.length ?? 0;
  const days            = weddingDate ? daysUntil(weddingDate) : null;

  async function saveCriteria(patch: Record<string, unknown>) {
    setSaving(true);
    setSaveError(null);
    try {
      const next = { ...(criteria ?? {}), ...patch };
      const res = await fetch(`/api/members/criteria/${nicheId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria: next }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const body = await res.json() as { criteria?: Record<string, unknown> };
      onCriteriaUpdated(body.criteria ?? next);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function selectEnergy(level: EnergyLevel) {
    setEnergy(level);
    await saveCriteria({ "today-energy": level });
  }

  const _ = saving;
  const [s0, s1, s2] = theme.statCards;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>

      {/* HERO */}
      <div style={{ position: "relative" }}>
      <section style={{ borderRadius: "16px", background: theme.gradient, overflow: "hidden", boxShadow: `0 12px 40px ${theme.shadow}, 0 2px 8px rgba(0,0,0,0.10)`, padding: "22px 26px 20px" }}>
        <p style={{ margin: "0 0 6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
          💜 Neurodivergent Wedding Planner
        </p>
        <h2 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "white", textShadow: "0 1px 6px rgba(0,0,0,0.25)" }}>
          {coupleNames}
        </h2>

        {days !== null && (
          <p style={{ margin: "0 0 18px", fontSize: "13px", color: "rgba(255,255,255,0.70)" }}>
            {days > 0 ? `${days} days to go` : days === 0 ? "Today is the day! 🎉" : `${Math.abs(days)} days ago`}
            {weddingDate && ` · ${weddingDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`}
          </p>
        )}

        <div>
          <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            How&apos;s your energy right now?
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {ENERGY_LEVELS.map((level) => {
              const isActive = energy === level;
              return (
                <button key={level} type="button" onClick={() => void selectEnergy(level)}
                  style={{ padding: "7px 16px", borderRadius: "999px", border: isActive ? "2px solid rgba(255,255,255,0.9)" : "1px solid rgba(255,255,255,0.3)", background: isActive ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)", color: "white", fontSize: "13px", fontWeight: isActive ? 700 : 500, cursor: "pointer", fontFamily: N_FONT }}>
                  {level}
                </button>
              );
            })}
          </div>
          {saveError && <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#ffb3b3" }}>{saveError}</p>}
        </div>

      </section>

      {/* Theme picker — outside section so overflow:hidden doesn't clip the dropdown */}
      <div style={{ position: "absolute", top: "14px", right: "14px", zIndex: 10 }}>
        <button onClick={() => setShowThemePicker((v) => !v)} title="Change theme"
          style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.30)", borderRadius: "8px", padding: "6px 8px", cursor: "pointer", color: "white", display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 600, fontFamily: N_FONT }}>
          <Palette size={13} /> Theme
        </button>
        {showThemePicker && (
          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "white", border: `1px solid ${N_BORDER_MED}`, borderRadius: "12px", padding: "8px", boxShadow: "0 8px 30px rgba(0,0,0,0.14)", zIndex: 50, display: "flex", flexDirection: "column", gap: "4px", minWidth: "160px" }}>
            {DASHBOARD_THEMES.map((t) => (
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

      {/* STATS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
        <div style={{ borderRadius: "12px", background: s0!.bg, border: `1px solid ${s0!.border}`, padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: s0!.label }}>Open tasks</p>
          <p style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: N_FG }}>{openTasks.length}</p>
          {energy && <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>{matchingTasks.length} match your energy</p>}
        </div>

        {totalBudget !== null && (
          <div style={{ borderRadius: "12px", background: s1!.bg, border: `1px solid ${s1!.border}`, padding: "14px" }}>
            <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: s1!.label }}>Budget spent</p>
            <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: N_FG }}>£{totalSpent.toLocaleString()}</p>
            <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>of £{totalBudget.toLocaleString()}</p>
          </div>
        )}

        {totalGuests > 0 && (
          <div style={{ borderRadius: "12px", background: s2!.bg, border: `1px solid ${s2!.border}`, padding: "14px" }}>
            <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: s2!.label }}>Guests confirmed</p>
            <p style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: N_FG }}>{confirmedGuests}<span style={{ fontSize: "14px", fontWeight: 500, color: N_SUBTLE }}>/{totalGuests}</span></p>
          </div>
        )}
      </div>

      {/* TASKS MATCHED TO ENERGY */}
      <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}` }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>
            {energy ? `Planning tasks at ${energy.split(" ")[0]} energy` : "Urgent planning tasks"}
          </p>
          {!energy && <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>Set your energy above to see matched tasks</p>}
        </div>
        {matchingTasks.length === 0 ? (
          <div style={{ padding: "20px 16px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
              {energy ? "No tasks match this energy level." : "No urgent tasks. You can breathe."}
            </p>
          </div>
        ) : (
          <div>
            {matchingTasks.map((task, i) => {
              const name     = asText(task.properties["Task"]);
              const category = asText(task.properties["Category"]);
              const due      = asText(task.properties["Due Date"]);
              return (
                <div key={task.pageId} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 16px", borderBottom: i < matchingTasks.length - 1 ? `1px solid ${N_BORDER}` : "none" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${theme.accentBorder}`, background: "white", flexShrink: 0, marginTop: "1px" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: N_FG, lineHeight: 1.4 }}>{name || "Untitled"}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_SUBTLE }}>
                      {[category, due].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
