"use client";
import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" as const };

interface SuggestedMeal {
  name:        string;
  mealType:    string;
  time:        string;
  description: string;
  ingredients: string;
  method:      string;
  macros:      { calories: number; netCarbs: number; protein: number; fat: number } | null;
}

interface SuggestResult {
  meals:  SuggestedMeal[];
  title:  string;
}

export function KetoIngredientMeals({
  criteria,
  mealsDb,
  onRowAdded,
}: {
  criteria:   Record<string, unknown> | null;
  mealsDb:    WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const defaultAllergies = String(criteria?.["allergies"] ?? "").trim();

  const [inputVal,   setInputVal]   = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [servings,   setServings]   = useState("1");
  const [mealCount,  setMealCount]  = useState("3");
  const [allergies,  setAllergies]  = useState(defaultAllergies);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<SuggestResult | null>(null);
  const [saving,  setSaving]  = useState<Record<number, boolean>>({});
  const [saved,   setSaved]   = useState<Record<number, string>>({});

  function addIngredient() {
    const val = inputVal.trim();
    if (!val) return;
    // allow comma-separated entry
    const parts = val.split(",").map((s) => s.trim()).filter(Boolean);
    setIngredients((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (!next.includes(p)) next.push(p);
      }
      return next;
    });
    setInputVal("");
  }

  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addIngredient(); }
  }

  async function suggest() {
    if (ingredients.length === 0) { setError("Add at least one ingredient."); return; }
    setLoading(true); setError(null); setResult(null); setSaving({}); setSaved({});
    try {
      const res = await fetch("/api/members/keto-ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, servings, mealCount, allergies }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setResult(await res.json() as SuggestResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveToMeals(meal: SuggestedMeal, idx: number) {
    if (!mealsDb) return;
    setSaving((s) => ({ ...s, [idx]: true }));
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: mealsDb.notionId,
          properties: {
            Title:       meal.name,
            Type:        meal.mealType,
            Calories:    meal.macros?.calories  ?? 0,
            "Net Carbs": meal.macros?.netCarbs  ?? 0,
            Protein:     meal.macros?.protein   ?? 0,
            Fat:         meal.macros?.fat       ?? 0,
            Ingredients: meal.ingredients,
            Notes:       meal.method,
          },
          propertyTypes: {
            Title: "title", Type: "select",
            Calories: "number", "Net Carbs": "number", Protein: "number", Fat: "number",
            Ingredients: "rich_text", Notes: "rich_text",
          },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      onRowAdded(mealsDb.notionId, await res.json() as WorkspaceRow);
      setSaved((s) => ({ ...s, [idx]: "Saved!" }));
    } catch {
      setSaved((s) => ({ ...s, [idx]: "Failed" }));
    } finally {
      setSaving((s) => ({ ...s, [idx]: false }));
    }
  }

  const label = (t: string) => <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{t}</label>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "720px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>What Can I Make?</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Tell the AI what ingredients you have and it will suggest keto meals you can make right now — with full recipes and macros.</p>
      </div>

      {/* Ingredient input */}
      <div>
        {label("Your Ingredients")}
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            style={{ ...inp, flex: 1 }}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. chicken breast, spinach, feta — press Enter or comma to add"
          />
          <button onClick={addIngredient} style={{ padding: "8px 16px", borderRadius: "7px", border: "none", background: ACCENT, color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", flexShrink: 0 }}>
            Add
          </button>
        </div>
        {ingredients.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
            {ingredients.map((ing, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: "4px", background: ACCENT_LIGHT, color: ACCENT_TEXT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: "99px", padding: "3px 10px", fontSize: "12px", fontWeight: 600 }}>
                {ing}
                <button onClick={() => removeIngredient(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: ACCENT_TEXT, opacity: 0.6 }}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
        <div>
          {label("Meals to suggest")}
          <select style={sel} value={mealCount} onChange={(e) => setMealCount(e.target.value)}>
            {["2", "3", "4", "5"].map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div>
          {label("Servings per meal")}
          <select style={sel} value={servings} onChange={(e) => setServings(e.target.value)}>
            {["1", "2", "3", "4"].map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div>
          {label("Avoid")}
          <input style={inp} value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. dairy, nuts" />
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button onClick={suggest} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? "#d1fae5" : ACCENT, color: loading ? ACCENT_TEXT : "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Finding meals…</> : "Suggest Keto Meals"}
      </button>

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: ACCENT_TEXT }}>{result.title}</p>
          {result.meals.map((meal, idx) => {
            const m = meal.macros;
            return (
              <div key={idx} style={{ borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>{meal.name}</p>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {meal.mealType && <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", background: "white", color: ACCENT_TEXT, border: `1px solid ${ACCENT_BORDER}` }}>{meal.mealType}</span>}
                      {meal.time     && <span style={{ fontSize: "11px", color: N_MUTED }}>⏱ {meal.time}</span>}
                    </div>
                  </div>
                  {mealsDb && (
                    <button
                      onClick={() => saveToMeals(meal, idx)}
                      disabled={saving[idx] ?? false}
                      style={{ padding: "6px 14px", borderRadius: "7px", border: "none", background: ACCENT, color: "white", fontSize: "12px", fontWeight: 600, cursor: saving[idx] ? "not-allowed" : "pointer", flexShrink: 0 }}
                    >
                      {saving[idx] ? "Saving…" : (saved[idx] ?? "Save to My Meals")}
                    </button>
                  )}
                </div>

                {/* Macro chips */}
                {m && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {[
                      { label: "Calories",  value: `${m.calories} kcal`, bg: "#fef3c7", color: "#92400e" },
                      { label: "Net Carbs", value: `${m.netCarbs}g`,     bg: "#dcfce7", color: "#14532d" },
                      { label: "Protein",   value: `${m.protein}g`,      bg: "#dbeafe", color: "#1e3a8a" },
                      { label: "Fat",       value: `${m.fat}g`,          bg: "#fce7f3", color: "#831843" },
                    ].map(({ label, value, bg, color }) => (
                      <div key={label} style={{ background: bg, borderRadius: "8px", padding: "5px 12px", textAlign: "center" }}>
                        <div style={{ fontSize: "14px", fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: "10px", color, opacity: 0.8 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                )}

                <p style={{ margin: 0, fontSize: "13px", color: N_MUTED, fontStyle: "italic" }}>{meal.description}</p>

                {meal.ingredients && (
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ingredients</p>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "12px", color: N_FG, lineHeight: 1.7, fontFamily: "Georgia, serif" }}>{meal.ingredients}</pre>
                  </div>
                )}

                {meal.method && (
                  <div style={{ borderTop: `1px solid ${ACCENT_BORDER}`, paddingTop: "10px" }}>
                    <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>Method</p>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "12px", color: N_FG, lineHeight: 1.7, fontFamily: "Georgia, serif" }}>{meal.method}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
