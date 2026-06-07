"use client";
import { useState, useEffect } from "react";
import { BookOpen, Users, FileText, ClipboardList, CalendarDays, Palette, Pencil, Check, X } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { asText } from "./utils";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";

// ─── Dashboard colour themes ────────────────────────────────────────────────
const DASHBOARD_THEMES = [
  {
    id: "scholar",
    label: "Scholar",
    emoji: "📘",
    gradient: "linear-gradient(135deg, #0a1628 0%, #0e3a5e 42%, #1a6a8a 72%, #38b2c8 100%)",
    shadow: "rgba(14,58,94,0.30)",
    innerBg: "rgba(6,16,32,0.85)",
    accent: "#38b2c8",
    cards: [
      { icon: "#0891b2", iconBg: "#0891b222", editBg: "#0891b218", bg: "linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)", border: "#a5f3fc", label: "#164e63", muted: "#0891b299" },
      { icon: "#1d4ed8", iconBg: "#1d4ed822", editBg: "#1d4ed818", bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", border: "#93c5fd", label: "#1e3a8a", muted: "#1d4ed899" },
      { icon: "#0e7490", iconBg: "#0e749022", editBg: "#0e749018", bg: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)", border: "#7dd3fc", label: "#0c4a6e", muted: "#0e749099" },
      { icon: "#4f46e5", iconBg: "#4f46e522", editBg: "#4f46e518", bg: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)", border: "#a5b4fc", label: "#3730a3", muted: "#4f46e599" },
    ],
  },
  {
    id: "forest",
    label: "Forest",
    emoji: "🌿",
    gradient: "linear-gradient(135deg, #071a0a 0%, #1a4d2a 42%, #2d7a4a 72%, #68c88a 100%)",
    shadow: "rgba(26,77,42,0.30)",
    innerBg: "rgba(6,18,8,0.85)",
    accent: "#4aba72",
    cards: [
      { icon: "#16a34a", iconBg: "#16a34a22", editBg: "#16a34a18", bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "#bbf7d0", label: "#166534", muted: "#16a34a99" },
      { icon: "#059669", iconBg: "#05966922", editBg: "#05966918", bg: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)", border: "#a7f3d0", label: "#064e3b", muted: "#05966999" },
      { icon: "#0d9488", iconBg: "#0d948822", editBg: "#0d948818", bg: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)", border: "#99f6e4", label: "#134e4a", muted: "#0d948899" },
      { icon: "#65a30d", iconBg: "#65a30d22", editBg: "#65a30d18", bg: "linear-gradient(135deg, #f7fee7 0%, #ecfccb 100%)", border: "#d9f99d", label: "#365314", muted: "#65a30d99" },
    ],
  },
  {
    id: "autumn",
    label: "Autumn",
    emoji: "🍂",
    gradient: "linear-gradient(135deg, #1e0900 0%, #7c2d00 42%, #c96400 72%, #f5c542 100%)",
    shadow: "rgba(124,45,0,0.30)",
    innerBg: "rgba(20,8,0,0.85)",
    accent: "#f59e0b",
    cards: [
      { icon: "#ea580c", iconBg: "#ea580c22", editBg: "#ea580c18", bg: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)", border: "#fed7aa", label: "#7c2d12", muted: "#ea580c99" },
      { icon: "#d97706", iconBg: "#d9770622", editBg: "#d9770618", bg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "#fde68a", label: "#92400e", muted: "#d9770699" },
      { icon: "#ca8a04", iconBg: "#ca8a0422", editBg: "#ca8a0418", bg: "linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)", border: "#fef08a", label: "#713f12", muted: "#ca8a0499" },
      { icon: "#dc2626", iconBg: "#dc262622", editBg: "#dc262618", bg: "linear-gradient(135deg, #fff5f5 0%, #fee2e2 100%)", border: "#fecaca", label: "#991b1b", muted: "#dc262699" },
    ],
  },
  {
    id: "twilight",
    label: "Twilight",
    emoji: "🌙",
    gradient: "linear-gradient(135deg, #120a2e 0%, #3b1a7a 42%, #7c3aed 72%, #c4b5fd 100%)",
    shadow: "rgba(59,26,122,0.30)",
    innerBg: "rgba(14,8,32,0.85)",
    accent: "#a78bfa",
    cards: [
      { icon: "#7c3aed", iconBg: "#7c3aed22", editBg: "#7c3aed18", bg: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)", border: "#c4b5fd", label: "#5b21b6", muted: "#7c3aed99" },
      { icon: "#9333ea", iconBg: "#9333ea22", editBg: "#9333ea18", bg: "linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)", border: "#d8b4fe", label: "#6b21a8", muted: "#9333ea99" },
      { icon: "#a21caf", iconBg: "#a21caf22", editBg: "#a21caf18", bg: "linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)", border: "#f0abfc", label: "#701a75", muted: "#a21caf99" },
      { icon: "#4f46e5", iconBg: "#4f46e522", editBg: "#4f46e518", bg: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)", border: "#a5b4fc", label: "#312e81", muted: "#4f46e599" },
    ],
  },
  {
    id: "crimson",
    label: "Crimson",
    emoji: "🎓",
    gradient: "linear-gradient(135deg, #1a0010 0%, #6b0f3a 42%, #b0254a 72%, #e87070 100%)",
    shadow: "rgba(107,15,58,0.30)",
    innerBg: "rgba(20,0,12,0.85)",
    accent: "#e87070",
    cards: [
      { icon: "#be185d", iconBg: "#be185d22", editBg: "#be185d18", bg: "linear-gradient(135deg, #fff0f5 0%, #ffe4ed 100%)", border: "#fecdd3", label: "#9d174d", muted: "#be185d99" },
      { icon: "#dc2626", iconBg: "#dc262622", editBg: "#dc262618", bg: "linear-gradient(135deg, #fff5f5 0%, #fee2e2 100%)", border: "#fecaca", label: "#991b1b", muted: "#dc262699" },
      { icon: "#7c3aed", iconBg: "#7c3aed22", editBg: "#7c3aed18", bg: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)", border: "#c4b5fd", label: "#5b21b6", muted: "#7c3aed99" },
      { icon: "#0891b2", iconBg: "#0891b222", editBg: "#0891b218", bg: "linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)", border: "#a5f3fc", label: "#164e63", muted: "#0891b299" },
    ],
  },
  {
    id: "slate",
    label: "Slate",
    emoji: "🪨",
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 42%, #334155 72%, #64748b 100%)",
    shadow: "rgba(15,23,42,0.35)",
    innerBg: "rgba(8,14,26,0.88)",
    accent: "#94a3b8",
    cards: [
      { icon: "#475569", iconBg: "#47556922", editBg: "#47556918", bg: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", border: "#cbd5e1", label: "#1e293b", muted: "#47556999" },
      { icon: "#0891b2", iconBg: "#0891b222", editBg: "#0891b218", bg: "linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)", border: "#a5f3fc", label: "#164e63", muted: "#0891b299" },
      { icon: "#0d9488", iconBg: "#0d948822", editBg: "#0d948818", bg: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)", border: "#99f6e4", label: "#134e4a", muted: "#0d948899" },
      { icon: "#6366f1", iconBg: "#6366f122", editBg: "#6366f118", bg: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)", border: "#c7d2fe", label: "#3730a3", muted: "#6366f199" },
    ],
  },
] as const;
type ThemeId = (typeof DASHBOARD_THEMES)[number]["id"];

// UK term end dates (approximate) — weeks until end of current term
const UK_TERMS = [
  { name: "Autumn 1",  end: new Date(new Date().getFullYear(), 9,  24) },  // ~24 Oct
  { name: "Autumn 2",  end: new Date(new Date().getFullYear(), 11, 19) },  // ~19 Dec
  { name: "Spring 1",  end: new Date(new Date().getFullYear(), 1,  14) },  // ~14 Feb
  { name: "Spring 2",  end: new Date(new Date().getFullYear(), 3,  11) },  // ~11 Apr
  { name: "Summer 1",  end: new Date(new Date().getFullYear(), 4,  23) },  // ~23 May
  { name: "Summer 2",  end: new Date(new Date().getFullYear(), 6,  18) },  // ~18 Jul
];

function getNextTermEnd(): { name: string; daysUntil: number } | null {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  for (const term of UK_TERMS) {
    const days = Math.ceil((term.end.getTime() - now.getTime()) / 86400000);
    if (days >= 0) return { name: term.name, daysUntil: days };
  }
  return null;
}

export function TeacherDashboard({
  databases,
  criteria,
}: {
  databases:  WorkspaceDatabase[];
  criteria:   Record<string, unknown> | null;
}) {
  const nicheId    = "teacher";
  const storageKey = `wsDashboardTheme_${nicheId}`;

  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "scholar";
    return (localStorage.getItem(storageKey) as ThemeId | null) ?? "scholar";
  });
  const [showThemePicker, setShowThemePicker] = useState(false);

  function selectTheme(id: ThemeId) {
    setThemeId(id);
    localStorage.setItem(storageKey, id);
    setShowThemePicker(false);
  }

  const theme = DASHBOARD_THEMES.find((t) => t.id === themeId) ?? DASHBOARD_THEMES[0]!;

  // Inline-edit school name
  const [editingName,    setEditingName]    = useState(false);
  const [schoolNameInput, setSchoolNameInput] = useState(String(criteria?.["school-name"] ?? "").trim());
  const [saving,         setSaving]         = useState(false);

  useEffect(() => {
    setSchoolNameInput(String(criteria?.["school-name"] ?? "").trim());
  }, [criteria]);

  async function saveSchoolName() {
    if (!criteria) return;
    setSaving(true);
    try {
      await fetch(`/api/members/criteria/${nicheId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria: { ...criteria, "school-name": schoolNameInput.trim() } }),
      });
    } finally {
      setSaving(false);
      setEditingName(false);
    }
  }

  // Stats from DBs
  const docsDb      = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents")    ?? null;
  const tasksDb     = databases.find((d) => d.nicheId === nicheId && d.dbId === "tasks")        ?? null;
  const keyDatesDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "key-dates")    ?? null;
  const yearPlanDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "year-planner") ?? null;

  const allDocs     = docsDb?.rows ?? [];
  const lessons     = allDocs.filter((r) => asText(r.properties["Type"]) === "Lesson Plan");
  const reports     = allDocs.filter((r) => asText(r.properties["Type"]) === "Report Comment");
  const assessments = allDocs.filter((r) => asText(r.properties["Type"]) === "Assessment");
  const activeTasks = (tasksDb?.rows ?? []).filter((r) => !r.properties["Done"]);
  const upcomingDates = (keyDatesDb?.rows ?? []).filter((r) => {
    const d = asText(r.properties["Date"]);
    if (!d) return false;
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 14;
  });

  const subject    = String(criteria?.["subject"]     ?? "").trim();
  const yearGroups = String(criteria?.["year-groups"] ?? "").trim();
  const schoolName = schoolNameInput || String(criteria?.["school-name"] ?? "").trim();

  const termEnd = getNextTermEnd();
  const countdownDays    = termEnd?.daysUntil ?? null;
  const countdownLabel   = termEnd ? `${termEnd.daysUntil} day${termEnd.daysUntil === 1 ? "" : "s"} until end of ${termEnd.name}` : "Summer holidays";
  const countdownPercent = termEnd ? Math.max(0, Math.min(100, Math.round((termEnd.daysUntil / 70) * 100))) : 100;
  const urgencyColor = countdownDays === null ? "rgb(107,114,128)" : countdownDays <= 7 ? "rgb(220,38,38)" : countdownDays <= 21 ? "rgb(249,115,22)" : countdownDays <= 42 ? "rgb(234,179,8)" : "rgb(22,163,74)";

  const statCards = [
    { label: "Lesson Plans",     value: lessons.length,      icon: BookOpen,      card: theme.cards[0] },
    { label: "Report Comments",  value: reports.length,      icon: FileText,      card: theme.cards[1] },
    { label: "Assessments",      value: assessments.length,  icon: ClipboardList, card: theme.cards[2] },
    { label: "Year Plan Entries",value: yearPlanDb?.rows.length ?? 0, icon: CalendarDays, card: theme.cards[3] },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>

      {/* ── HERO BANNER ─────────────────────────────────────────────── */}
      <section style={{
        borderRadius: "16px",
        background: theme.gradient,
        overflow: "hidden",
        boxShadow: `0 12px 40px ${theme.shadow}, 0 2px 8px rgba(0,0,0,0.10)`,
        display: "grid",
        gridTemplateColumns: "1fr auto",
      }}>
        {/* School name + subject */}
        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ margin: "0 0 10px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
            🎓 Teacher Planning OS
          </p>

          {/* Theme picker */}
          <div style={{ position: "relative", marginBottom: "10px" }}>
            <button type="button" onClick={() => setShowThemePicker((s) => !s)} title="Change theme"
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.12)", cursor: "pointer", fontSize: "11px", color: "rgba(255,255,255,0.85)", fontFamily: N_FONT }}>
              <Palette size={11} /> {theme.emoji} {theme.label}
            </button>
            {showThemePicker && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, background: "white", borderRadius: "10px", boxShadow: "0 8px 28px rgba(0,0,0,0.18)", padding: "10px 12px", display: "flex", gap: "8px", flexWrap: "wrap", minWidth: "240px", border: "1px solid rgba(0,0,0,0.08)" }}>
                {DASHBOARD_THEMES.map((t) => (
                  <button key={t.id} type="button" onClick={() => selectTheme(t.id)} title={t.label}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "6px 8px", borderRadius: "8px", border: t.id === themeId ? "2px solid #37352F" : "2px solid transparent", background: t.id === themeId ? "rgba(55,53,47,0.07)" : "transparent", cursor: "pointer", fontFamily: N_FONT }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: t.gradient, flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }} />
                    <span style={{ fontSize: "10px", color: "#37352F", fontWeight: t.id === themeId ? 700 : 400 }}>{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* School name inline edit */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            {editingName ? (
              <input value={schoolNameInput} onChange={(e) => setSchoolNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void saveSchoolName(); if (e.key === "Escape") setEditingName(false); }}
                placeholder="e.g. Oakwood Primary"
                style={{ height: "40px", padding: "0 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)", fontSize: "22px", fontWeight: 700, fontFamily: N_FONT, color: "white", minWidth: "260px" }}
                autoFocus />
            ) : (
              <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "white", textShadow: "0 1px 6px rgba(0,0,0,0.25)" }}>
                {schoolName || "Your School"}
              </h2>
            )}
            {editingName ? (
              <>
                <button type="button" onClick={() => void saveSchoolName()} disabled={saving} style={{ border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.18)", borderRadius: "6px", cursor: "pointer", padding: "4px 7px", color: "white" }}><Check size={13} /></button>
                <button type="button" onClick={() => setEditingName(false)} disabled={saving} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", borderRadius: "6px", cursor: "pointer", padding: "4px 7px", color: "rgba(255,255,255,0.6)" }}><X size={13} /></button>
              </>
            ) : (
              <button type="button" onClick={() => setEditingName(true)} style={{ border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.1)", borderRadius: "6px", cursor: "pointer", padding: "4px 7px", color: "rgba(255,255,255,0.65)" }}><Pencil size={12} /></button>
            )}
          </div>

          {/* Subject + year groups */}
          <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.80)", fontWeight: 500 }}>
            {subject && yearGroups ? `${subject} · ${yearGroups}` : subject || yearGroups || "Set up your profile in Settings"}
          </p>
        </div>

        {/* Countdown ring */}
        <div style={{ padding: "18px 28px", display: "flex", alignItems: "center", gap: "16px", borderLeft: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ width: "108px", height: "108px", borderRadius: "999px", background: `conic-gradient(${urgencyColor} ${countdownPercent * 3.6}deg, rgba(255,255,255,0.14) 0deg)`, display: "grid", placeItems: "center", boxShadow: `0 0 22px ${urgencyColor}66`, flexShrink: 0 }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "999px", background: theme.innerBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: countdownDays !== null && countdownDays >= 100 ? "20px" : "26px", fontWeight: 800, color: "white", lineHeight: 1 }}>{countdownDays ?? "—"}</span>
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>days</span>
            </div>
          </div>
          <div style={{ minWidth: "130px" }}>
            <p style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Term countdown</p>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "white", lineHeight: 1.4 }}>{countdownLabel}</p>
          </div>
        </div>
      </section>

      {/* ── STAT CARDS ──────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "10px" }}>
        {statCards.map(({ label, value, icon: Icon, card }) => (
          <div key={label} style={{ borderRadius: "12px", background: card.bg, border: `1px solid ${card.border}`, padding: "14px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: card.iconBg, marginBottom: "9px" }}>
              <Icon size={15} style={{ color: card.icon }} />
            </div>
            <p style={{ margin: "0 0 3px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: card.label }}>{label}</p>
            <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: N_FG }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── QUICK STATS ROW ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>

        {/* Active tasks */}
        <div style={{ borderRadius: "12px", background: theme.cards[0].bg, border: `1px solid ${theme.cards[0].border}`, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: theme.cards[0].iconBg }}>
              <span style={{ fontSize: "15px" }}>✅</span>
            </div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: theme.cards[0].label }}>Active Tasks</span>
          </div>
          {activeTasks.length === 0 ? (
            <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>No outstanding tasks.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {activeTasks.slice(0, 4).map((r) => {
                const prio = asText(r.properties["Priority"]);
                const prioColor = prio === "High" ? "#dc2626" : prio === "Medium" ? "#b45309" : "#64748b";
                return (
                  <div key={r.pageId} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ flexShrink: 0, width: "6px", height: "6px", borderRadius: "50%", background: prioColor }} />
                    <span style={{ fontSize: "12px", color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{asText(r.properties["Title"]) || "Untitled"}</span>
                    {asText(r.properties["Due Date"]) && <span style={{ fontSize: "10px", color: N_MUTED, flexShrink: 0 }}>{asText(r.properties["Due Date"])}</span>}
                  </div>
                );
              })}
              {activeTasks.length > 4 && <p style={{ margin: 0, fontSize: "11px", color: N_MUTED }}>+{activeTasks.length - 4} more</p>}
            </div>
          )}
        </div>

        {/* Upcoming key dates */}
        <div style={{ borderRadius: "12px", background: theme.cards[1].bg, border: `1px solid ${theme.cards[1].border}`, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: theme.cards[1].iconBg }}>
              <span style={{ fontSize: "15px" }}>📌</span>
            </div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: theme.cards[1].label }}>Next 14 Days</span>
          </div>
          {upcomingDates.length === 0 ? (
            <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>No key dates in the next two weeks.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {upcomingDates.slice(0, 4).map((r) => {
                const d = asText(r.properties["Date"]);
                const days = d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;
                return (
                  <div key={r.pageId} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ flexShrink: 0, fontSize: "11px", fontWeight: 700, color: theme.cards[1].icon, minWidth: "40px" }}>{days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}</span>
                    <span style={{ fontSize: "12px", color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{asText(r.properties["Title"]) || "Untitled"}</span>
                  </div>
                );
              })}
              {upcomingDates.length > 4 && <p style={{ margin: 0, fontSize: "11px", color: N_MUTED }}>+{upcomingDates.length - 4} more</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── GETTING STARTED ─────────────────────────────────────────── */}
      {allDocs.length === 0 && (
        <div style={{ padding: "20px", borderRadius: "12px", border: `1px solid ${theme.cards[0].border}`, background: theme.cards[0].bg }}>
          <p style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: theme.cards[0].label }}>Get started in 3 steps</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { n: "1", label: "Lesson Planner",  desc: "Give a topic and year group — AI builds your full lesson plan in seconds." },
              { n: "2", label: "Report Writer",   desc: "Enter a student name and grades — AI writes a professional report comment." },
              { n: "3", label: "My Documents",    desc: "All saved plans and reports in one place — export to PDF with one click." },
            ].map((s) => (
              <div key={s.n} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0, width: "22px", height: "22px", borderRadius: "50%", background: theme.cards[0].icon, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>{s.n}</span>
                <div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: theme.cards[0].label }}>{s.label}</span>
                  <span style={{ fontSize: "13px", color: N_MUTED }}> — {s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RECENT DOCUMENTS ────────────────────────────────────────── */}
      {allDocs.length > 0 && (
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER_MED}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Recent Documents</p>
          </div>
          {allDocs.slice(0, 6).map((row) => {
            const type    = asText(row.properties["Type"]);
            const title   = asText(row.properties["Title"]);
            const subject = asText(row.properties["Subject"]);
            const yr      = asText(row.properties["Year Group"]);
            const TYPE_COLORS: Record<string, string> = { "Lesson Plan": "#2563eb", "Report Comment": "#16a34a", "Assessment": "#ea580c", "Parent Email": "#7c3aed" };
            const color   = TYPE_COLORS[type] ?? theme.cards[0].icon;
            return (
              <div key={row.pageId} style={{ padding: "10px 16px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", background: `${color}18`, color, border: `1px solid ${color}30` }}>{type || "Document"}</span>
                <span style={{ flex: 1, fontSize: "13px", color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Untitled"}</span>
                {(subject || yr) && <span style={{ fontSize: "11px", color: N_MUTED, flexShrink: 0 }}>{[subject, yr].filter(Boolean).join(" · ")}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
