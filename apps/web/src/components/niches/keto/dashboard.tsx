"use client";
import { useState, useEffect, useRef } from "react";
import { Palette } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { asText, asNumber } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const DASHBOARD_THEMES = [
  { name: "Avocado",  gradient: "linear-gradient(135deg,#14532d 0%,#16a34a 55%,#86efac 100%)", shadow: "rgba(22,163,74,0.35)",  emoji: "🥑" },
  { name: "Steak",    gradient: "linear-gradient(135deg,#431407 0%,#9a3412 55%,#f97316 100%)", shadow: "rgba(154,52,18,0.35)",  emoji: "🥩" },
  { name: "Butter",   gradient: "linear-gradient(135deg,#78350f 0%,#d97706 55%,#fde68a 100%)", shadow: "rgba(217,119,6,0.35)",  emoji: "🧈" },
  { name: "Forest",   gradient: "linear-gradient(135deg,#052e16 0%,#065f46 55%,#059669 100%)", shadow: "rgba(5,150,105,0.35)",  emoji: "🌿" },
  { name: "Midnight", gradient: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 55%,#0ea5e9 100%)", shadow: "rgba(14,165,233,0.30)", emoji: "🌙" },
] as const;

const MEAL_TYPE_COLORS: Record<string, string> = {
  Breakfast: "#d97706", Lunch: "#059669", Dinner: "#2563eb", Snack: "#f97316", Dessert: "#db2777",
};

export function KetoDashboard({
  databases,
  criteria,
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
}) {
  const saved = typeof window !== "undefined" ? (localStorage.getItem("ketoDashboardTheme") ?? "0") : "0";
  const [themeIdx,   setThemeIdx]   = useState(() => Math.min(parseInt(saved, 10) || 0, DASHBOARD_THEMES.length - 1));
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem("ketoDashboardTheme", String(themeIdx)); }, [themeIdx]);
  useEffect(() => {
    function close(e: MouseEvent) { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const theme     = DASHBOARD_THEMES[themeIdx]!;
  const goal      = String(criteria?.["goal"]      ?? "").trim();
  const dietType  = String(criteria?.["diet-type"] ?? "").trim();

  const mealsDb     = databases.find((d) => d.nicheId === "keto" && d.dbId === "meals")     ?? null;
  const documentsDb = databases.find((d) => d.nicheId === "keto" && d.dbId === "documents") ?? null;

  const meals: WorkspaceRow[]     = mealsDb?.rows     ?? [];
  const documents: WorkspaceRow[] = documentsDb?.rows ?? [];

  const totalMeals  = meals.length;
  const totalPlans  = documents.filter((d) => asText(d.properties["Type"]) === "Meal Plan").length;
  const recentMeals = meals.slice(0, 5);
  const recentDocs  = documents.slice(0, 4);

  // Aggregate macros from saved meals for a quick overview
  const avgCarbs   = meals.length ? Math.round(meals.reduce((s, r) => s + (asNumber(r.properties["Net Carbs"]) ?? 0), 0) / meals.length) : null;
  const avgCals    = meals.length ? Math.round(meals.reduce((s, r) => s + (asNumber(r.properties["Calories"])  ?? 0), 0) / meals.length) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>
      {/* Hero */}
      <div style={{ position: "relative", borderRadius: "16px", background: theme.gradient, boxShadow: `0 8px 32px ${theme.shadow}`, padding: "22px 26px 20px", color: "white", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "12px", right: "14px" }} ref={pickerRef}>
          <button onClick={() => setPickerOpen((x) => !x)} style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px", padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", color: "white" }}>
            <Palette size={13} />
          </button>
          {pickerOpen && (
            <div style={{ position: "absolute", top: "34px", right: 0, background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "10px", padding: "8px", display: "flex", gap: "6px", zIndex: 50, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
              {DASHBOARD_THEMES.map((t, i) => (
                <button key={t.name} title={t.name} onClick={() => { setThemeIdx(i); setPickerOpen(false); }}
                  style={{ width: "22px", height: "22px", borderRadius: "50%", background: t.gradient, border: i === themeIdx ? "2px solid #111" : "2px solid transparent", cursor: "pointer" }} />
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: "28px", marginBottom: "6px" }}>{theme.emoji}</div>
        <h1 style={{ margin: "0 0 2px", fontSize: "20px", fontWeight: 800, textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>Keto OS</h1>
        {(goal || dietType) && (
          <p style={{ margin: "0 0 16px", fontSize: "13px", opacity: 0.85 }}>{[goal, dietType].filter(Boolean).join(" · ")}</p>
        )}

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {[
            { label: "Saved Meals",  value: totalMeals },
            { label: "Meal Plans",   value: totalPlans },
            { label: "Avg Net Carbs", value: avgCarbs !== null ? `${avgCarbs}g` : "—" },
            { label: "Avg Cal/Meal", value: avgCals   !== null ? avgCals : "—" },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)", borderRadius: "10px", padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: 800 }}>{value}</div>
              <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "1px" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Recent meals */}
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG }}>Recent Meals</span>
            <span style={{ fontSize: "11px", color: N_MUTED }}>{totalMeals} saved</span>
          </div>
          {recentMeals.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>No meals saved yet — use the Meal Planner or Recipe Analyser and save individual meals.</p>
            </div>
          ) : (
            <div>
              {recentMeals.map((row) => {
                const name    = asText(row.properties["Title"])    || "Untitled";
                const type    = asText(row.properties["Type"])     || "";
                const cals    = asNumber(row.properties["Calories"]);
                const carbs   = asNumber(row.properties["Net Carbs"]);
                const color   = MEAL_TYPE_COLORS[type] ?? "#059669";
                return (
                  <div key={row.pageId} style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    {type && <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px", background: `${color}15`, color, border: `1px solid ${color}25` }}>{type}</span>}
                    <span style={{ flex: 1, fontSize: "13px", fontWeight: 500, color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                    <span style={{ flexShrink: 0, fontSize: "11px", color: N_MUTED }}>
                      {[carbs !== null ? `${carbs}g carbs` : null, cals !== null ? `${cals} cal` : null].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent documents */}
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG }}>Recent Documents</span>
            <span style={{ fontSize: "11px", color: N_MUTED }}>{documents.length} saved</span>
          </div>
          {recentDocs.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Generate meal plans and analyses to see them here.</p>
            </div>
          ) : (
            <div>
              {recentDocs.map((row) => {
                const title = asText(row.properties["Title"]) || "Untitled";
                const type  = asText(row.properties["Type"])  || "";
                return (
                  <div key={row.pageId} style={{ padding: "8px 16px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
                    {type && <div style={{ fontSize: "11px", color: N_MUTED }}>{type}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
