"use client";
import { useState, useEffect, useRef, useMemo, type ChangeEvent } from "react";
import { CalendarDays, MapPin, Users, CheckCircle2, ListChecks, FileText, Pencil, Check, X, Palette } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_ACTIVE, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";
import { asText, asNumber, asCurrencyNumber, getCurrencyCode, formatCurrency, parseWeddingDate, findPropertyName } from "./utils";
// â”€â”€â”€ Dashboard colour themes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DASHBOARD_THEMES = [
  {
    id: "rose",
    label: "Rose",
    emoji: "🌹",
    gradient: "linear-gradient(135deg, #2a0f1e 0%, #6b2040 42%, #a85470 72%, #d4957a 100%)",
    shadow: "rgba(107,32,64,0.28)",
    innerBg: "rgba(30,8,20,0.85)",
    accent: "#c4597a",
    cards: [
      { icon: "#16a34a", iconBg: "#16a34a22", editBg: "#16a34a18", bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "#bbf7d0", label: "#166534", muted: "#16a34a99" },
      { icon: "#be185d", iconBg: "#be185d22", editBg: "#be185d18", bg: "linear-gradient(135deg, #fff0f5 0%, #ffe4ed 100%)", border: "#fecdd3", label: "#9d174d", muted: "#be185d99" },
      { icon: "#7c3aed", iconBg: "#7c3aed22", editBg: "#7c3aed18", bg: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)", border: "#c4b5fd", label: "#5b21b6", muted: "#7c3aed99" },
      { icon: "#d97706", iconBg: "#d9770622", editBg: "#d9770618", bg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "#fde68a", label: "#92400e", muted: "#d9770699" },
    ],
  },
  {
    id: "ocean",
    label: "Ocean",
    emoji: "🌊",
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
    id: "sunset",
    label: "Sunset",
    emoji: "🌅",
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
    id: "pride",
    label: "Pride",
    emoji: "🏳️‍🌈",
    gradient: "linear-gradient(135deg, #e40303 0%, #ff8c00 20%, #ffed00 37%, #008026 55%, #004dff 73%, #750787 100%)",
    shadow: "rgba(100,40,120,0.28)",
    innerBg: "rgba(20,0,30,0.88)",
    accent: "#ff8c00",
    cards: [
      { icon: "#e40303", iconBg: "#e4030322", editBg: "#e4030318", bg: "linear-gradient(135deg, #fff5f5 0%, #fee2e2 100%)", border: "#fca5a5", label: "#991b1b", muted: "#e4030399" },
      { icon: "#008026", iconBg: "#00802622", editBg: "#00802618", bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "#86efac", label: "#166534", muted: "#00802699" },
      { icon: "#004dff", iconBg: "#004dff22", editBg: "#004dff18", bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", border: "#93c5fd", label: "#1e3a8a", muted: "#004dff99" },
      { icon: "#ff8c00", iconBg: "#ff8c0022", editBg: "#ff8c0018", bg: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)", border: "#fed7aa", label: "#7c2d12", muted: "#ff8c0099" },
    ],
  },
] as const;
type ThemeId = (typeof DASHBOARD_THEMES)[number]["id"];

export function WeddingWorkspaceDashboard({
  databases,
  weddingCriteria,
  onWeddingCriteriaUpdated,
  liveSeatedCount,
}: {
  databases: WorkspaceDatabase[];
  weddingCriteria: Record<string, unknown> | null;
  onWeddingCriteriaUpdated: (criteria: Record<string, unknown>) => void;
  liveSeatedCount: number;
}) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "rose";
    return (localStorage.getItem("wsDashboardTheme") as ThemeId | null) ?? "rose";
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const theme = DASHBOARD_THEMES.find((t) => t.id === themeId) ?? DASHBOARD_THEMES[0];

  function selectTheme(id: ThemeId) {
    setThemeId(id);
    localStorage.setItem("wsDashboardTheme", id);
    setShowThemePicker(false);
  }
  const [coupleNamesInput, setCoupleNamesInput] = useState(asText(weddingCriteria?.["couple-names"]) ?? "");
  const [venueInput, setVenueInput] = useState(asText(weddingCriteria?.["wedding-location"]) ?? "");
  const [guestCountInput, setGuestCountInput] = useState(String(asNumber(weddingCriteria?.["guest-count"]) ?? ""));
  const [budgetInput, setBudgetInput] = useState(String(asNumber(weddingCriteria?.["total-budget"]) ?? ""));
  const [costPerGuestInput, setCostPerGuestInput] = useState(String(asNumber(weddingCriteria?.["cost-per-guest"]) ?? 100));
  const [daysToGoInput, setDaysToGoInput] = useState(String(asNumber(weddingCriteria?.["countdown-days"]) ?? ""));
  const [editingField, setEditingField] = useState<null | "couple" | "venue" | "guest" | "budget" | "costPerGuest" | "days">(null);
  const [guestScenarioCount, setGuestScenarioCount] = useState(100);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [headerImageDataUrl, setHeaderImageDataUrl] = useState(asText(weddingCriteria?.["dashboard-header-image"]));
  const headerImageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCoupleNamesInput(asText(weddingCriteria?.["couple-names"]) ?? "");
    setVenueInput(asText(weddingCriteria?.["wedding-location"]) ?? "");
    setGuestCountInput(String(asNumber(weddingCriteria?.["guest-count"]) ?? ""));
    setBudgetInput(String(asNumber(weddingCriteria?.["total-budget"]) ?? ""));
    setCostPerGuestInput(String(asNumber(weddingCriteria?.["cost-per-guest"]) ?? 100));
    setDaysToGoInput(String(asNumber(weddingCriteria?.["countdown-days"]) ?? ""));
    setHeaderImageDataUrl(asText(weddingCriteria?.["dashboard-header-image"]));
  }, [weddingCriteria]);

  const guestsDb = databases.find((d) => d.nicheId === "wedding-planner" && d.dbId === "guests") ?? null;
  const timelineDb =
    databases.find(
      (d) => d.nicheId === "wedding-planner" && /planning\s*(timeline|timetable)/i.test(d.dbName),
    ) ?? null;
  const budgetDb = databases.find((d) => d.nicheId === "wedding-planner" && d.dbId === "budget") ?? null;
  const documentsDb = databases.find((d) => d.nicheId === "wedding-planner" && d.dbId === "documents") ?? null;

  const coupleNames = asText(weddingCriteria?.["couple-names"]);
  const weddingDate = parseWeddingDate(weddingCriteria?.["wedding-date"]);
  const venue = asText(weddingCriteria?.["wedding-location"]);
  const plannedGuests = asNumber(weddingCriteria?.["guest-count"]);
  const totalBudget = asNumber(weddingCriteria?.["total-budget"]);
  const savedCostPerGuest = asNumber(weddingCriteria?.["cost-per-guest"]);
  const costPerGuest = savedCostPerGuest ?? 100;
  const currencyCode = getCurrencyCode(weddingCriteria);
  const countdownMode = asText(weddingCriteria?.["countdown-mode"]);
  const manualCountdownDays = asNumber(weddingCriteria?.["countdown-days"]);

  const seatedGuestIds = useMemo<Set<string>>(() => {
    const layout = weddingCriteria?.["seating-layout-v1"] as { tables?: Array<{ guestIds?: Array<string | null> }> } | null | undefined;
    const ids = new Set<string>();
    for (const table of layout?.tables ?? []) {
      for (const id of table.guestIds ?? []) {
        if (id) ids.add(id);
      }
    }
    return ids;
  }, [weddingCriteria]);

  const trackedGuests = guestsDb?.rows.length ?? 0;
  const targetGuests = plannedGuests ?? trackedGuests;
  const guestSpend = targetGuests > 0 ? targetGuests * costPerGuest : 0;
  const budgetActualFieldName = budgetDb
    ? findPropertyName(budgetDb.properties, ["Actual Cost", "Actual", "Spent", "Total"])
    : null;
  const budgetEstimatedFieldName = budgetDb
    ? findPropertyName(budgetDb.properties, ["Estimated Cost", "Estimated"])
    : null;
  const budgetDepositFieldName = budgetDb
    ? findPropertyName(budgetDb.properties, ["Deposit"])
    : null;
  const budgetTotalsSpend = budgetDb
    ? budgetDb.rows.reduce((sum, row) => {
        const actual = budgetActualFieldName
          ? asCurrencyNumber(row.properties[budgetActualFieldName])
          : null;
        const estimated = budgetEstimatedFieldName
          ? asCurrencyNumber(row.properties[budgetEstimatedFieldName])
          : null;
        const deposit = budgetDepositFieldName
          ? asCurrencyNumber(row.properties[budgetDepositFieldName])
          : null;
        const next = actual ?? estimated ?? deposit ?? 0;
        return sum + next;
      }, 0)
    : 0;
  const hasAddedExpenses = budgetTotalsSpend > 0;
  const totalSpent = guestSpend + budgetTotalsSpend;
  const remainingBudget = totalBudget !== null ? totalBudget - totalSpent : null;
  const budgetUsedPercent =
    totalBudget && totalBudget > 0
      ? Math.max(0, Math.min(100, Math.round((totalSpent / totalBudget) * 100)))
      : 0;


  useEffect(() => {
    setGuestScenarioCount(targetGuests > 0 ? targetGuests : 100);
  }, [targetGuests]);

  const scenarioSpend = guestScenarioCount * costPerGuest;
  const scenarioDelta = scenarioSpend - guestSpend;

  const seatingStarted = liveSeatedCount > 0;
  const seatingProgress = trackedGuests > 0 ? Math.round((liveSeatedCount / trackedGuests) * 100) : 0;

  const [today, setToday] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Refresh `today` at midnight so the countdown ticks down daily
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    const t = setTimeout(() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      setToday(d);
    }, msUntilMidnight);
    return () => clearTimeout(t);
  }, [today]); // re-schedules after each midnight tick

  const now = today;
  const computedFromDate = weddingDate
    ? Math.ceil((weddingDate.getTime() - now.getTime()) / 86_400_000)
    : null;
  const useManualCountdown =
    countdownMode === "manual" && manualCountdownDays !== null;
  const countdownDays = useManualCountdown ? manualCountdownDays : computedFromDate;

  const countdownLabel =
    countdownDays === null
      ? "Set your wedding date"
      : countdownDays >= 0
        ? `${countdownDays} day${countdownDays === 1 ? "" : "s"} to go`
        : `${Math.abs(countdownDays)} day${Math.abs(countdownDays) === 1 ? "" : "s"} since your wedding date`;

  const normalizedDays = countdownDays === null ? null : Math.max(0, countdownDays);
  const countdownPercent =
    normalizedDays === null ? 0 : Math.min(100, Math.max(0, Math.round(((365 - Math.min(365, normalizedDays)) / 365) * 100)));
  const urgencyColor =
    normalizedDays === null
      ? "rgb(107,114,128)"
      : normalizedDays <= 30
        ? "rgb(220,38,38)"
        : normalizedDays <= 90
          ? "rgb(249,115,22)"
          : normalizedDays <= 180
            ? "rgb(234,179,8)"
            : "rgb(22,163,74)";

  async function saveTopDetails(nextHeaderImageDataUrl: string | null = headerImageDataUrl): Promise<boolean> {
    setSavingDetails(true);
    setDetailsError(null);
    try {
      const parsedGuestCount = Number(guestCountInput);
      const parsedBudget = Number(budgetInput);
      const parsedCostPerGuest = Number(costPerGuestInput);
      const parsedCountdownDays = Number(daysToGoInput);

      const nextCriteria = {
        ...(weddingCriteria ?? {}),
        "couple-names": coupleNamesInput.trim(),
        "wedding-location": venueInput.trim(),
        "guest-count":
          guestCountInput.trim() === "" || !Number.isFinite(parsedGuestCount)
            ? null
            : Math.max(0, Math.round(parsedGuestCount)),
        "total-budget":
          budgetInput.trim() === "" || !Number.isFinite(parsedBudget)
            ? null
            : Math.max(0, Math.round(parsedBudget)),
        "cost-per-guest":
          costPerGuestInput.trim() === "" || !Number.isFinite(parsedCostPerGuest)
            ? 100
            : Math.max(0, Math.round(parsedCostPerGuest)),
        "countdown-days":
          daysToGoInput.trim() === "" || !Number.isFinite(parsedCountdownDays)
            ? null
            : Math.max(0, Math.round(parsedCountdownDays)),
        "countdown-mode":
          daysToGoInput.trim() === "" || !Number.isFinite(parsedCountdownDays)
            ? "date"
            : "manual",
        "dashboard-header-image": nextHeaderImageDataUrl,
      };

      const res = await fetch("/api/members/criteria/wedding-planner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria: nextCriteria }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save wedding details");
      }
      const body = (await res.json().catch(() => ({}))) as { criteria?: Record<string, unknown> };
      onWeddingCriteriaUpdated(body.criteria ?? nextCriteria);
      return true;
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Failed to save wedding details");
      return false;
    } finally {
      setSavingDetails(false);
    }
  }

  async function commitInlineEdit(field: "couple" | "venue" | "guest" | "budget" | "costPerGuest" | "days") {
    const ok = await saveTopDetails();
    if (ok) setEditingField((prev) => (prev === field ? null : prev));
  }

  function cancelInlineEdit(field: "couple" | "venue" | "guest" | "budget" | "costPerGuest" | "days") {
    setCoupleNamesInput(asText(weddingCriteria?.["couple-names"]) ?? "");
    setVenueInput(asText(weddingCriteria?.["wedding-location"]) ?? "");
    setGuestCountInput(String(asNumber(weddingCriteria?.["guest-count"]) ?? ""));
    setBudgetInput(String(asNumber(weddingCriteria?.["total-budget"]) ?? ""));
    setCostPerGuestInput(String(asNumber(weddingCriteria?.["cost-per-guest"]) ?? 100));
    setDaysToGoInput(String(asNumber(weddingCriteria?.["countdown-days"]) ?? ""));
    setEditingField((prev) => (prev === field ? null : prev));
  }

  function onHeaderImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const nextImage = reader.result;
        setHeaderImageDataUrl(nextImage);
        void saveTopDetails(nextImage);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* Ã”Ã¶Ã‡Ã”Ã¶Ã‡ HERO BANNER Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡ */}
      <section
        style={{
          borderRadius: "16px",
          background: theme.gradient,
          overflow: "hidden",
          boxShadow: `0 12px 40px ${theme.shadow}, 0 2px 8px rgba(0,0,0,0.10)`,
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
        }}
      >
        {/* Names + Venue */}
        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ margin: "0 0 10px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
            🌸 Wedding Dashboard
          </p>
          {/* Theme picker */}
          <div style={{ position: "relative", marginBottom: "10px" }}>
            <button
              type="button"
              onClick={() => setShowThemePicker((s) => !s)}
              title="Change theme"
              style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.12)", cursor: "pointer", fontSize: "11px", color: "rgba(255,255,255,0.85)", fontFamily: N_FONT }}
            >
              <Palette size={11} /> {theme.emoji} {theme.label}
            </button>
            {showThemePicker && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, background: "white", borderRadius: "10px", boxShadow: "0 8px 28px rgba(0,0,0,0.18)", padding: "10px 12px", display: "flex", gap: "8px", flexWrap: "wrap", minWidth: "220px", border: "1px solid rgba(0,0,0,0.08)" }}>
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
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: t.gradient, flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }} />
                    <span style={{ fontSize: "10px", color: "#37352F", fontWeight: t.id === themeId ? 700 : 400 }}>{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            {editingField === "couple" ? (
              <input
                value={coupleNamesInput}
                onChange={(e) => setCoupleNamesInput(e.target.value)}
                placeholder="e.g. Olivia & James"
                style={{ height: "40px", padding: "0 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)", fontSize: "22px", fontWeight: 700, fontFamily: N_FONT, color: "white", minWidth: "260px" }}
              />
            ) : (
              <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "white", textShadow: "0 1px 6px rgba(0,0,0,0.25)" }}>
                {coupleNames ?? "Your Wedding Plan"}
              </h2>
            )}
            {editingField === "couple" ? (
              <>
                <button type="button" onClick={() => void commitInlineEdit("couple")} disabled={savingDetails} style={{ border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.18)", borderRadius: "6px", cursor: "pointer", padding: "4px 7px", color: "white" }}><Check size={13} /></button>
                <button type="button" onClick={() => cancelInlineEdit("couple")} disabled={savingDetails} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", borderRadius: "6px", cursor: "pointer", padding: "4px 7px", color: "rgba(255,255,255,0.6)" }}><X size={13} /></button>
              </>
            ) : (
              <button type="button" onClick={() => setEditingField("couple")} style={{ border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.1)", borderRadius: "6px", cursor: "pointer", padding: "4px 7px", color: "rgba(255,255,255,0.65)" }}><Pencil size={12} /></button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <MapPin size={13} style={{ color: "rgba(255,255,255,0.55)", flexShrink: 0 }} />
            {editingField === "venue" ? (
              <>
                <input
                  value={venueInput}
                  onChange={(e) => setVenueInput(e.target.value)}
                  placeholder="e.g. The Barn, Cotswolds"
                  style={{ height: "28px", padding: "0 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)", fontSize: "13px", fontFamily: N_FONT, color: "white", minWidth: "220px" }}
                />
                <button type="button" onClick={() => void commitInlineEdit("venue")} disabled={savingDetails} style={{ border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.18)", borderRadius: "6px", cursor: "pointer", padding: "3px 6px", color: "white" }}><Check size={12} /></button>
                <button type="button" onClick={() => cancelInlineEdit("venue")} disabled={savingDetails} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", borderRadius: "6px", cursor: "pointer", padding: "3px 6px", color: "rgba(255,255,255,0.6)" }}><X size={12} /></button>
              </>
            ) : (
              <>
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.82)", fontWeight: 500 }}>{venue ?? "Add venue →"}</span>
                <button type="button" onClick={() => setEditingField("venue")} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", borderRadius: "6px", cursor: "pointer", padding: "3px 6px", color: "rgba(255,255,255,0.6)" }}><Pencil size={11} /></button>
              </>
            )}
          </div>

          {detailsError && <span style={{ fontSize: "12px", color: "#ffb3b3", marginTop: "8px" }}>{detailsError}</span>}
        </div>

        {/* Header image slot */}
        <div style={{ padding: "18px 20px", borderLeft: "1px solid rgba(255,255,255,0.10)", display: "flex", flexDirection: "column", justifyContent: "center", gap: "8px", minWidth: "180px" }}>
          <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
            Happy couple
          </p>
          <input
            ref={headerImageInputRef}
            type="file"
            accept="image/*"
            onChange={onHeaderImageSelected}
            style={{ display: "none" }}
          />
          <div
            style={{
              width: "140px",
              height: "92px",
              borderRadius: "10px",
              border: "1px dashed rgba(255,255,255,0.35)",
              background: "rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {headerImageDataUrl ? (
              <img
                src={headerImageDataUrl}
                alt="Wedding header"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", textAlign: "center", padding: "0 8px" }}>No image selected</span>
            )}
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => headerImageInputRef.current?.click()}
              style={{ border: "1px solid rgba(255,255,255,0.26)", background: "rgba(255,255,255,0.12)", borderRadius: "6px", cursor: "pointer", padding: "4px 8px", color: "white", fontSize: "11px", fontWeight: 600, fontFamily: N_FONT }}
            >
              {headerImageDataUrl ? "Change" : "Add"}
            </button>
            {headerImageDataUrl && (
              <button
                type="button"
                onClick={() => {
                  setHeaderImageDataUrl(null);
                  void saveTopDetails(null);
                }}
                style={{ border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)", borderRadius: "6px", cursor: "pointer", padding: "4px 8px", color: "rgba(255,255,255,0.78)", fontSize: "11px", fontWeight: 600, fontFamily: N_FONT }}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Countdown ring */}
        <div style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: "16px", borderLeft: "1px solid rgba(255,255,255,0.10)" }}>
          <div
            style={{
              width: "108px",
              height: "108px",
              borderRadius: "999px",
              background: `conic-gradient(${urgencyColor} ${countdownPercent * 3.6}deg, rgba(255,255,255,0.14) 0deg)`,
              display: "grid",
              placeItems: "center",
              boxShadow: `0 0 22px ${urgencyColor}66`,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "999px",
                background: theme.innerBg,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "26px", fontWeight: 800, color: "white", lineHeight: 1 }}>{countdownDays ?? "—"}</span>
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>days</span>
            </div>
          </div>

          <div style={{ minWidth: "130px" }}>
            <p style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Countdown</p>
            <p style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 700, color: "white", lineHeight: 1.3 }}>{countdownLabel}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
              {editingField === "days" ? (
                <>
                  <input
                    type="number"
                    min={0}
                    value={daysToGoInput}
                    onChange={(e) => setDaysToGoInput(e.target.value)}
                    placeholder="Days"
                    style={{ height: "26px", width: "80px", padding: "0 7px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)", fontSize: "12px", fontFamily: N_FONT, color: "white" }}
                  />
                  <button type="button" onClick={() => void commitInlineEdit("days")} disabled={savingDetails} style={{ border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.18)", borderRadius: "6px", cursor: "pointer", padding: "3px 5px", color: "white" }}><Check size={12} /></button>
                  <button type="button" onClick={() => cancelInlineEdit("days")} disabled={savingDetails} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", borderRadius: "6px", cursor: "pointer", padding: "3px 5px", color: "rgba(255,255,255,0.6)" }}><X size={12} /></button>
                </>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.52)", lineHeight: 1.3 }}>
                    {weddingDate
                      ? weddingDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
                      : "Set a wedding date"}
                  </p>
                  <button type="button" onClick={() => setEditingField("days")} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", borderRadius: "6px", cursor: "pointer", padding: "3px 5px", color: "rgba(255,255,255,0.6)" }}><Pencil size={11} /></button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Ã”Ã¶Ã‡Ã”Ã¶Ã‡ STAT CARDS Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "10px" }}>

        {/* Location */}
        <div style={{ borderRadius: "12px", background: theme.cards[0].bg, border: `1px solid ${theme.cards[0].border}`, padding: "14px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: theme.cards[0].iconBg, marginBottom: "9px" }}>
            <MapPin size={15} style={{ color: theme.cards[0].icon }} />
          </div>
          <p style={{ margin: "0 0 3px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: theme.cards[0].label }}>Location</p>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: N_FG }}>{venue ?? "Not set yet"}</p>
        </div>

        {/* Guest Plan */}
        <div style={{ borderRadius: "12px", background: theme.cards[1].bg, border: `1px solid ${theme.cards[1].border}`, padding: "14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: theme.cards[1].iconBg, marginBottom: "9px" }}>
              <Users size={15} style={{ color: theme.cards[1].icon }} />
            </div>
            {editingField === "guest" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <input type="number" min={0} value={guestCountInput} onChange={(e) => setGuestCountInput(e.target.value)} style={{ height: "24px", width: "68px", padding: "0 6px", borderRadius: "5px", border: `1px solid ${N_BORDER_MED}`, fontSize: "12px", fontFamily: N_FONT }} />
                <button type="button" onClick={() => void commitInlineEdit("guest")} disabled={savingDetails} style={{ border: "none", background: theme.cards[1].iconBg, borderRadius: "5px", cursor: "pointer", padding: "3px 5px", color: theme.cards[1].icon }}><Check size={11} /></button>
                <button type="button" onClick={() => cancelInlineEdit("guest")} disabled={savingDetails} style={{ border: "none", background: "transparent", borderRadius: "5px", cursor: "pointer", padding: "3px", color: N_SUBTLE }}><X size={11} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => setEditingField("guest")} style={{ border: "none", background: theme.cards[1].editBg, borderRadius: "6px", cursor: "pointer", padding: "3px 7px", color: theme.cards[1].icon, fontSize: "11px", display: "flex", alignItems: "center", gap: "3px" }}><Pencil size={10} /></button>
            )}
          </div>
          <p style={{ margin: "0 0 3px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: theme.cards[1].label }}>Guest Plan</p>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: N_FG }}>{targetGuests > 0 ? `${targetGuests} planned` : "No target set"}</p>
          <p style={{ margin: "3px 0 0", fontSize: "12px", color: theme.cards[1].muted }}>{trackedGuests} in guest list</p>
        </div>

        {/* Planning Timeline */}
        <div style={{ borderRadius: "12px", background: theme.cards[2].bg, border: `1px solid ${theme.cards[2].border}`, padding: "14px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: theme.cards[2].iconBg, marginBottom: "9px" }}>
            <CalendarDays size={15} style={{ color: theme.cards[2].icon }} />
          </div>
          <p style={{ margin: "0 0 3px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: theme.cards[2].label }}>Planning Timeline</p>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: N_FG }}>{timelineDb?.rows.length ?? 0} milestones</p>
        </div>

        {/* Draft Letters */}
        <div style={{ borderRadius: "12px", background: theme.cards[3].bg, border: `1px solid ${theme.cards[3].border}`, padding: "14px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: theme.cards[3].iconBg, marginBottom: "9px" }}>
            <FileText size={15} style={{ color: theme.cards[3].icon }} />
          </div>
          <p style={{ margin: "0 0 3px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: theme.cards[3].label }}>Draft Letters</p>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: N_FG }}>{documentsDb?.rows.length ?? 0} saved drafts</p>
        </div>
      </div>

      {/* Ã”Ã¶Ã‡Ã”Ã¶Ã‡ BUDGET PANEL Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>

        {/* Budget overview */}
        <div style={{ borderRadius: "12px", background: theme.cards[1].bg, border: `1px solid ${theme.cards[1].border}`, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: theme.cards[1].iconBg }}>
                <span style={{ fontSize: "15px", fontWeight: 800, color: theme.cards[1].icon }}>💰</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: theme.cards[1].label }}>Budget Overview</span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Currency: {currencyCode}
                </span>
              </div>
            </div>
            {editingField === "budget" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <input type="number" min={0} value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} style={{ height: "26px", width: "96px", padding: "0 7px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "12px", fontFamily: N_FONT }} />
                <button type="button" onClick={() => void commitInlineEdit("budget")} disabled={savingDetails} style={{ border: "none", background: theme.cards[1].iconBg, borderRadius: "6px", cursor: "pointer", padding: "3px 5px", color: theme.cards[1].icon }}><Check size={12} /></button>
                <button type="button" onClick={() => cancelInlineEdit("budget")} disabled={savingDetails} style={{ border: "none", background: "transparent", borderRadius: "6px", cursor: "pointer", padding: "3px", color: N_SUBTLE }}><X size={12} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => setEditingField("budget")} style={{ border: "none", background: theme.cards[1].editBg, borderRadius: "6px", cursor: "pointer", padding: "3px 9px", color: theme.cards[1].icon, fontSize: "11px", display: "flex", alignItems: "center", gap: "3px" }}><Pencil size={10} /> Edit</button>
            )}
          </div>

          <p style={{ margin: "0 0 1px", fontSize: "30px", fontWeight: 800, color: N_FG, letterSpacing: "-0.02em" }}>{formatCurrency(totalBudget, currencyCode)}</p>
          <p style={{ margin: "0 0 12px", fontSize: "10px", color: theme.cards[1].muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total budget</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
            <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "8px", padding: "9px 11px", border: "1px solid rgba(190,24,93,0.1)" }}>
              <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: N_SUBTLE }}>Spent</p>
              <p style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: theme.cards[1].icon }}>{formatCurrency(totalSpent, currencyCode)}</p>
              <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "3px" }}>
                <p style={{ margin: 0, fontSize: "10px", color: N_SUBTLE }}>
                  Guest plan: {formatCurrency(guestSpend, currencyCode)}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "10px",
                    fontWeight: 700,
                    color: hasAddedExpenses ? "#6d28d9" : N_SUBTLE,
                    background: hasAddedExpenses ? "rgba(109,40,217,0.12)" : "transparent",
                    borderRadius: "999px",
                    padding: hasAddedExpenses ? "2px 8px" : "0",
                    width: "fit-content",
                  }}
                >
                  Added expenses: {formatCurrency(budgetTotalsSpend, currencyCode)}
                </p>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "8px", padding: "9px 11px", border: "1px solid rgba(21,128,61,0.12)" }}>
              <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: N_SUBTLE }}>Remaining</p>
              <p style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: remainingBudget !== null && remainingBudget < 0 ? "rgb(220,38,38)" : "#15803d" }}>
                {remainingBudget === null ? "—" : formatCurrency(remainingBudget, currencyCode)}
              </p>
            </div>
          </div>

          {totalBudget !== null && totalBudget > 0 && (
            <>
              <div style={{ height: "9px", borderRadius: "999px", background: theme.cards[1].iconBg, overflow: "hidden", marginBottom: "5px" }}>
                <div style={{ height: "100%", width: `${budgetUsedPercent}%`, background: budgetUsedPercent >= 100 ? "rgb(220,38,38)" : theme.cards[1].icon, borderRadius: "999px", transition: "width 0.4s ease" }} />
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: theme.cards[1].label, fontWeight: 600 }}>{budgetUsedPercent}% of budget used</p>
            </>
          )}
        </div>

        {/* Guest cost planner */}
        <div style={{ borderRadius: "12px", background: "white", border: `1px solid ${N_BORDER_MED}`, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG }}>Guest Cost Planner</span>
            {editingField === "costPerGuest" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <input type="number" min={0} value={costPerGuestInput} onChange={(e) => setCostPerGuestInput(e.target.value)} style={{ height: "26px", width: "76px", padding: "0 7px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "12px", fontFamily: N_FONT }} />
                <button type="button" onClick={() => void commitInlineEdit("costPerGuest")} disabled={savingDetails} style={{ border: "none", background: N_ACTIVE, borderRadius: "6px", cursor: "pointer", padding: "3px 5px", color: N_FG }}><Check size={12} /></button>
                <button type="button" onClick={() => cancelInlineEdit("costPerGuest")} disabled={savingDetails} style={{ border: "none", background: "transparent", borderRadius: "6px", cursor: "pointer", padding: "3px", color: N_SUBTLE }}><X size={12} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => setEditingField("costPerGuest")} style={{ border: "none", background: N_ACTIVE, borderRadius: "6px", cursor: "pointer", padding: "3px 9px", color: N_SUBTLE, fontSize: "11px", display: "flex", alignItems: "center", gap: "3px" }}><Pencil size={10} /> Edit</button>
            )}
          </div>

          <div style={{ background: "rgba(55,53,47,0.04)", borderRadius: "10px", padding: "10px 13px", marginBottom: "12px", border: `1px solid ${N_BORDER}` }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ fontSize: "12px", color: N_SUBTLE, fontWeight: 600 }}>Per guest</span>
              <span style={{ fontSize: "22px", fontWeight: 800, color: N_FG, letterSpacing: "-0.02em" }}>{formatCurrency(costPerGuest, currencyCode)}</span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: N_MUTED }}>
              {targetGuests} guests × {formatCurrency(costPerGuest, currencyCode)} = <strong style={{ color: N_FG }}>{formatCurrency(guestSpend, currencyCode)}</strong>
            </p>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: N_SUBTLE }}>Guest Scenario</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG }}>{guestScenarioCount} guests</span>
            </div>
            <input
              type="range"
              min={50}
              max={200}
              step={1}
              value={guestScenarioCount}
              onChange={(e) => setGuestScenarioCount(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#be185d" }}
            />
            <div style={{ marginTop: "7px", padding: "9px 11px", borderRadius: "9px", background: scenarioDelta > 0 ? "#fff0f5" : scenarioDelta < 0 ? "#f0fdf4" : "rgba(55,53,47,0.04)", border: `1px solid ${scenarioDelta > 0 ? "#fecdd3" : scenarioDelta < 0 ? "#bbf7d0" : N_BORDER}` }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: N_SUBTLE }}>Projected spend</span>
                <span style={{ fontSize: "16px", fontWeight: 800, color: N_FG }}>{formatCurrency(scenarioSpend, currencyCode)}</span>
              </div>
              {scenarioDelta !== 0 && (
                <p style={{ margin: "3px 0 0", fontSize: "11px", fontWeight: 700, color: scenarioDelta > 0 ? "#be185d" : "#15803d" }}>
                  {scenarioDelta > 0 ? "↑" : "↓"} {formatCurrency(Math.abs(scenarioDelta), currencyCode)} {scenarioDelta > 0 ? "more" : "less"} than current plan
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ã”Ã¶Ã‡Ã”Ã¶Ã‡ TABLE PLAN Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡Ã”Ã¶Ã‡ */}
      <section
        style={{
          borderRadius: "12px",
          background: seatingStarted ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" : "linear-gradient(135deg, #fafafa 0%, #f3f4f6 100%)",
          border: seatingStarted ? "1px solid #86efac" : `1px solid ${N_BORDER_MED}`,
          padding: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: seatingStarted ? "#16a34a22" : "rgba(55,53,47,0.06)" }}>
              <ListChecks size={16} style={{ color: seatingStarted ? "#16a34a" : N_SUBTLE }} />
            </div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG }}>Table Plan</span>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: seatingStarted ? "#15803d" : N_SUBTLE, background: seatingStarted ? "#dcfce7" : "rgba(55,53,47,0.06)", borderRadius: "999px", padding: "4px 12px" }}>
            <CheckCircle2 size={12} />
            {seatingStarted ? "In progress" : "Not started"}
          </span>
        </div>

        <div style={{ height: "10px", borderRadius: "999px", background: seatingStarted ? "#86efac44" : "rgba(55,53,47,0.08)", overflow: "hidden", marginBottom: "7px" }}>
          <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, seatingProgress))}%`, background: "linear-gradient(90deg, #16a34a, #22c55e)", borderRadius: "999px", transition: "width 0.4s ease" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: "12px", color: seatingStarted ? "#166534" : N_MUTED }}>
            {liveSeatedCount} of {trackedGuests} guests assigned to tables
          </p>
          {trackedGuests > 0 && (
            <span style={{ fontSize: "13px", fontWeight: 800, color: seatingStarted ? "#16a34a" : N_SUBTLE }}>{seatingProgress}%</span>
          )}
        </div>
      </section>
    </div>
  );
}


