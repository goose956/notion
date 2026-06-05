"use client";
import { useState, useEffect } from "react";
import { CheckCircle2, Pencil, Check, X, Palette } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";
import { asText, asNumber, ENERGY_LEVELS, type EnergyLevel } from "./utils";

// ─── Dashboard colour themes ──────────────────────────────────────────────────
const DASHBOARD_THEMES = [
  {
    id: "teal",
    label: "Teal",
    emoji: "🧠",
    gradient: "linear-gradient(135deg, #0a2e2c 0%, #0d4f4a 42%, #0f766e 72%, #5eead4 100%)",
    shadow: "rgba(13,79,74,0.30)",
    accent: "#0d9488",
    accentLight: "rgba(13,148,136,0.07)",
    accentBorder: "rgba(13,148,136,0.20)",
    accentText: "#0f766e",
    statCards: [
      { bg: "rgba(13,148,136,0.07)",  border: "rgba(13,148,136,0.20)",  label: "#0f766e" },
      { bg: "rgba(124,58,237,0.06)",  border: "rgba(124,58,237,0.18)",  label: "#6d28d9" },
      { bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)",  label: "#92400e" },
    ],
  },
  {
    id: "focus",
    label: "Focus",
    emoji: "🎯",
    gradient: "linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e3a5f 75%, #38bdf8 100%)",
    shadow: "rgba(15,23,42,0.50)",
    accent: "#0ea5e9",
    accentLight: "rgba(14,165,233,0.07)",
    accentBorder: "rgba(14,165,233,0.20)",
    accentText: "#0369a1",
    statCards: [
      { bg: "rgba(14,165,233,0.07)",  border: "rgba(14,165,233,0.20)",  label: "#0369a1" },
      { bg: "rgba(124,58,237,0.06)",  border: "rgba(124,58,237,0.18)",  label: "#6d28d9" },
      { bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)",  label: "#92400e" },
    ],
  },
  {
    id: "calm",
    label: "Calm",
    emoji: "🌸",
    gradient: "linear-gradient(135deg, #1a0030 0%, #4c1d95 40%, #7c3aed 75%, #c4b5fd 100%)",
    shadow: "rgba(76,29,149,0.30)",
    accent: "#7c3aed",
    accentLight: "rgba(124,58,237,0.07)",
    accentBorder: "rgba(124,58,237,0.20)",
    accentText: "#5b21b6",
    statCards: [
      { bg: "rgba(124,58,237,0.07)",  border: "rgba(124,58,237,0.20)",  label: "#5b21b6" },
      { bg: "rgba(13,148,136,0.06)",  border: "rgba(13,148,136,0.18)",  label: "#0f766e" },
      { bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)",  label: "#92400e" },
    ],
  },
  {
    id: "flow",
    label: "Flow",
    emoji: "🌿",
    gradient: "linear-gradient(135deg, #052e16 0%, #166534 40%, #16a34a 75%, #86efac 100%)",
    shadow: "rgba(22,101,52,0.30)",
    accent: "#16a34a",
    accentLight: "rgba(22,163,74,0.07)",
    accentBorder: "rgba(22,163,74,0.20)",
    accentText: "#166534",
    statCards: [
      { bg: "rgba(22,163,74,0.07)",   border: "rgba(22,163,74,0.20)",   label: "#166534" },
      { bg: "rgba(124,58,237,0.06)",  border: "rgba(124,58,237,0.18)",  label: "#6d28d9" },
      { bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)",  label: "#92400e" },
    ],
  },
  {
    id: "sunset",
    label: "Sunset",
    emoji: "🌅",
    gradient: "linear-gradient(135deg, #1e0900 0%, #7c2d00 42%, #c96400 72%, #f5c542 100%)",
    shadow: "rgba(124,45,0,0.30)",
    accent: "#f59e0b",
    accentLight: "rgba(245,158,11,0.07)",
    accentBorder: "rgba(245,158,11,0.20)",
    accentText: "#92400e",
    statCards: [
      { bg: "rgba(245,158,11,0.07)",  border: "rgba(245,158,11,0.20)",  label: "#92400e" },
      { bg: "rgba(124,58,237,0.06)",  border: "rgba(124,58,237,0.18)",  label: "#6d28d9" },
      { bg: "rgba(13,148,136,0.06)",  border: "rgba(13,148,136,0.18)",  label: "#0f766e" },
    ],
  },
  {
    id: "mono",
    label: "Mono",
    emoji: "🖤",
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 40%, #374151 75%, #9ca3af 100%)",
    shadow: "rgba(0,0,0,0.50)",
    accent: "#6b7280",
    accentLight: "rgba(107,114,128,0.07)",
    accentBorder: "rgba(107,114,128,0.20)",
    accentText: "#374151",
    statCards: [
      { bg: "rgba(107,114,128,0.07)", border: "rgba(107,114,128,0.20)", label: "#374151" },
      { bg: "rgba(124,58,237,0.06)",  border: "rgba(124,58,237,0.18)",  label: "#6d28d9" },
      { bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.18)",  label: "#92400e" },
    ],
  },
] as const;
type ThemeId = typeof DASHBOARD_THEMES[number]["id"];

export function NeurodivergentDashboard({
  databases,
  criteria,
  onCriteriaUpdated,
  nicheId = "neurodivergent",
}: {
  databases: WorkspaceDatabase[];
  criteria: Record<string, unknown> | null;
  onCriteriaUpdated: (c: Record<string, unknown>) => void;
  nicheId?: string;
}) {
  const storageKey = `ndDashboardTheme_${nicheId}`;
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "teal";
    return (localStorage.getItem(storageKey) as ThemeId | null) ?? "teal";
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const theme = DASHBOARD_THEMES.find((t) => t.id === themeId) ?? DASHBOARD_THEMES[0];

  function selectTheme(id: ThemeId) {
    setThemeId(id);
    localStorage.setItem(storageKey, id);
    setShowThemePicker(false);
  }

  const userName    = asText(criteria?.["name"]) || "You";
  const savedEnergy = asText(criteria?.["today-energy"]) as EnergyLevel | "" || "";

  const [energy, setEnergy]           = useState<EnergyLevel | "">(savedEnergy);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]     = useState(userName);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);

  useEffect(() => {
    setEnergy(asText(criteria?.["today-energy"]) as EnergyLevel | "");
    setNameInput(asText(criteria?.["name"]) || "");
  }, [criteria]);

  const tasksDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "tasks")     ?? null;
  const habitsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "habits")    ?? null;
  const dumpDb   = databases.find((d) => d.nicheId === nicheId && d.dbId === "brain-dump") ?? null;

  const openTasks = (tasksDb?.rows ?? []).filter(
    (r) => asText(r.properties["Status"]) !== "Done" && asText(r.properties["Status"]) !== "Dropped",
  );
  const matchingTasks = energy
    ? openTasks.filter((r) => asText(r.properties["Energy Required"]) === energy).slice(0, 3)
    : openTasks.filter((r) => asText(r.properties["Priority"]) === "Must do").slice(0, 3);

  const unprocessedDump = (dumpDb?.rows ?? []).filter((r) => !r.properties["Processed"]).length;
  const habitsTotal     = habitsDb?.rows.length ?? 0;
  const habitsDoneToday = (habitsDb?.rows ?? []).filter((r) => r.properties["Done Today"]).length;

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

  async function commitName() {
    await saveCriteria({ name: nameInput.trim() });
    setEditingName(false);
  }

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const [s0, s1, s2] = theme.statCards;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>

      {/* HERO */}
      <div style={{ position: "relative" }}>
      <section style={{ borderRadius: "16px", background: theme.gradient, overflow: "hidden", boxShadow: `0 12px 40px ${theme.shadow}, 0 2px 8px rgba(0,0,0,0.10)`, padding: "22px 26px 20px" }}>
        <p style={{ margin: "0 0 8px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
          🧠 Neurodivergent Life OS
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          {editingName ? (
            <>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
                style={{ height: "36px", padding: "0 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)", fontSize: "20px", fontWeight: 700, fontFamily: N_FONT, color: "white", minWidth: "180px" }}
              />
              <button type="button" onClick={() => void commitName()} disabled={saving} style={{ border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.18)", borderRadius: "6px", cursor: "pointer", padding: "4px 7px", color: "white" }}><Check size={13} /></button>
              <button type="button" onClick={() => setEditingName(false)} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", borderRadius: "6px", cursor: "pointer", padding: "4px 7px", color: "rgba(255,255,255,0.6)" }}><X size={13} /></button>
            </>
          ) : (
            <>
              <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "white", textShadow: "0 1px 6px rgba(0,0,0,0.25)" }}>
                Hey, {userName} 👋
              </h2>
              <button type="button" onClick={() => setEditingName(true)} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", borderRadius: "6px", cursor: "pointer", padding: "3px 6px", color: "rgba(255,255,255,0.6)" }}><Pencil size={11} /></button>
            </>
          )}
        </div>

        <p style={{ margin: "0 0 18px", fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>{todayLabel}</p>

        <div>
          <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            How&apos;s your energy right now?
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {ENERGY_LEVELS.map((level) => {
              const isActive = energy === level;
              return (
                <button key={level} type="button" onClick={() => void selectEnergy(level)}
                  style={{ padding: "7px 16px", borderRadius: "999px", border: isActive ? "2px solid rgba(255,255,255,0.9)" : "1px solid rgba(255,255,255,0.3)", background: isActive ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)", color: "white", fontSize: "13px", fontWeight: isActive ? 700 : 500, cursor: "pointer", fontFamily: N_FONT, transition: "all 0.15s" }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "10px" }}>
        <div style={{ borderRadius: "12px", background: s0!.bg, border: `1px solid ${s0!.border}`, padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: s0!.label }}>Open tasks</p>
          <p style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: N_FG }}>{openTasks.length}</p>
          {energy && <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>{matchingTasks.length} match your energy</p>}
        </div>

        <div style={{ borderRadius: "12px", background: s1!.bg, border: `1px solid ${s1!.border}`, padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: s1!.label }}>Habits today</p>
          <p style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: N_FG }}>{habitsDoneToday}<span style={{ fontSize: "14px", fontWeight: 500, color: N_SUBTLE }}>/{habitsTotal}</span></p>
          {habitsTotal > 0 && <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>{habitsTotal - habitsDoneToday} remaining</p>}
        </div>

        <div style={{ borderRadius: "12px", background: s2!.bg, border: `1px solid ${s2!.border}`, padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: s2!.label }}>Brain dump</p>
          <p style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: N_FG }}>{unprocessedDump}</p>
          <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>unprocessed items</p>
        </div>
      </div>

      {/* READY FOR YOU */}
      <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}` }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>
            {energy ? `Ready for you at ${energy.split(" ")[0]} energy` : "Top priorities"}
          </p>
          {!energy && <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>Set your energy above to get a personalised list</p>}
        </div>
        {matchingTasks.length === 0 ? (
          <div style={{ padding: "20px 16px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
              {energy ? "No tasks match this energy level — add some in the Tasks database." : "No must-do tasks right now. Nice."}
            </p>
          </div>
        ) : (
          <div>
            {matchingTasks.map((task, i) => {
              const name     = asText(task.properties["Task"]);
              const project  = asText(task.properties["Project"]);
              const priority = asText(task.properties["Priority"]);
              const isDone   = asText(task.properties["Status"]) === "Done";
              return (
                <div key={task.pageId} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 16px", borderBottom: i < matchingTasks.length - 1 ? `1px solid ${N_BORDER}` : "none" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${isDone ? theme.accent : N_BORDER_MED}`, background: isDone ? theme.accent : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
                    {isDone && <CheckCircle2 size={12} style={{ color: "white" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: N_FG, lineHeight: 1.4 }}>{name || "Untitled"}</p>
                    {project && <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_SUBTLE }}>{project}</p>}
                  </div>
                  {priority === "Must do" && (
                    <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: "rgba(239,68,68,0.08)", color: "#dc2626", fontWeight: 600, flexShrink: 0 }}>Must do</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* HABITS MINI */}
      {habitsTotal > 0 && (
        <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", padding: "14px 16px" }}>
          <p style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 700, color: N_FG }}>Today&apos;s habits</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {(habitsDb?.rows ?? []).map((h) => {
              const name   = asText(h.properties["Habit"]);
              const done   = !!h.properties["Done Today"];
              const streak = asNumber(h.properties["Current Streak"]) ?? 0;
              return (
                <div key={h.pageId} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "999px", border: `1px solid ${done ? theme.accentBorder : N_BORDER}`, background: done ? theme.accentLight : "rgba(55,53,47,0.03)" }}>
                  <span style={{ fontSize: "12px", color: done ? theme.accentText : N_SUBTLE }}>{done ? "✓" : "○"}</span>
                  <span style={{ fontSize: "12px", fontWeight: done ? 600 : 400, color: done ? theme.accentText : N_FG }}>{name}</span>
                  {streak > 1 && <span style={{ fontSize: "10px", color: N_MUTED }}>🔥 {streak}</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
