"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" as const };
const ta:  React.CSSProperties = { ...inp, resize: "vertical" as const, minHeight: "140px" };

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"];

interface AnalysisResult {
  analysis: string;
  title: string;
  mealName: string;
  macros: { calories: number; netCarbs: number; protein: number; fat: number } | null;
}

export function KetoRecipeAnalyser({
  criteria,
  documentsDb,
  mealsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  mealsDb:     WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const _ = criteria;

  const [mealName,  setMealName]  = useState("");
  const [mealType,  setMealType]  = useState(MEAL_TYPES[2]!);
  const [servings,  setServings]  = useState("1");
  const [recipe,    setRecipe]    = useState("");

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [result,   setResult]   = useState<AnalysisResult | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState<string | null>(null);
  const [mealSaving,  setMealSaving]  = useState(false);
  const [mealSaveMsg, setMealSaveMsg] = useState<string | null>(null);

  async function generate() {
    if (!recipe.trim()) { setError("Paste your recipe first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null); setMealSaveMsg(null);
    try {
      const res = await fetch("/api/members/keto-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealName, mealType, servings, recipe }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setResult(await res.json() as AnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveToDocuments() {
    if (!result || !documentsDb) return;
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId:    documentsDb.notionId,
          properties:    { Title: result.title, Type: "Recipe Analysis", Content: result.analysis },
          propertyTypes: { Title: "title", Type: "select", Content: "rich_text" },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      onRowAdded(documentsDb.notionId, await res.json() as WorkspaceRow);
      setSaveMsg("Saved to Documents");
    } catch { setSaveMsg("Save failed — try again"); }
    finally  { setSaving(false); }
  }

  async function saveToMeals() {
    if (!result || !mealsDb) return;
    setMealSaving(true); setMealSaveMsg(null);
    const m = result.macros;
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId:    mealsDb.notionId,
          properties: {
            Title:       result.mealName,
            Type:        mealType,
            Calories:    m?.calories  ?? 0,
            "Net Carbs": m?.netCarbs  ?? 0,
            Protein:     m?.protein   ?? 0,
            Fat:         m?.fat       ?? 0,
            Ingredients: recipe,
            Notes:       result.analysis,
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
      setMealSaveMsg("Saved to My Meals");
    } catch { setMealSaveMsg("Save failed — try again"); }
    finally  { setMealSaving(false); }
  }

  function exportPdf() {
    if (!result) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${result.title}</title><style>
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#111;line-height:1.8;}
      h1{font-size:22px;color:#047857;}strong{color:#047857;}pre{white-space:pre-wrap;font-family:inherit;}
    </style></head><body><h1>${result.title}</h1><pre>${result.analysis.replace(/</g, "&lt;")}</pre></body></html>`);
    w.document.close(); w.print();
  }

  const label = (t: string) => <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{t}</label>;
  const m = result?.macros;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "720px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Recipe Analyser</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Paste any recipe — AI calculates the full macro breakdown, keto suitability score and suggests modifications to make it more keto-friendly.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div>
          {label("Meal Name")}
          <input style={inp} value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder="e.g. Creamy Garlic Butter Salmon" />
        </div>
        <div>
          {label("Meal Type")}
          <select style={sel} value={mealType} onChange={(e) => setMealType(e.target.value)}>
            {MEAL_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          {label("Servings this recipe makes")}
          <select style={sel} value={servings} onChange={(e) => setServings(e.target.value)}>
            {["1", "2", "3", "4", "6", "8"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Recipe (ingredients + method) *")}
          <textarea style={ta} value={recipe} onChange={(e) => setRecipe(e.target.value)}
            placeholder={"e.g.\n2 salmon fillets\n2 tbsp butter\n3 garlic cloves, minced\n100ml double cream\nSalt, pepper, fresh dill\n\nMethod: Pan-fry salmon in butter 4 mins each side. Add garlic, cook 1 min. Add cream, simmer 3 mins. Season and serve."} />
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button onClick={generate} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? "#d1fae5" : ACCENT, color: loading ? ACCENT_TEXT : "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Analysing recipe…</> : "Analyse Recipe"}
      </button>

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Macro summary chips */}
          {m && (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {[
                { label: "Calories",   value: `${m.calories} kcal`, bg: "#fef3c7", color: "#92400e" },
                { label: "Net Carbs",  value: `${m.netCarbs}g`,     bg: "#dcfce7", color: "#14532d" },
                { label: "Protein",    value: `${m.protein}g`,      bg: "#dbeafe", color: "#1e3a8a" },
                { label: "Fat",        value: `${m.fat}g`,          bg: "#fce7f3", color: "#831843" },
              ].map(({ label: l, value, bg, color }) => (
                <div key={l} style={{ background: bg, borderRadius: "10px", padding: "8px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: "16px", fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: "11px", color, opacity: 0.8 }}>{l}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>{result.title}</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button onClick={exportPdf} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>PDF</button>
                {mealsDb && (
                  <button onClick={saveToMeals} disabled={mealSaving} style={{ padding: "6px 14px", borderRadius: "7px", border: "none", background: ACCENT, color: "white", fontSize: "12px", fontWeight: 600, cursor: mealSaving ? "not-allowed" : "pointer" }}>
                    {mealSaving ? "Saving…" : mealSaveMsg ?? "Save to My Meals"}
                  </button>
                )}
                {documentsDb && (
                  <button onClick={saveToDocuments} disabled={saving} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                    {saving ? "Saving…" : saveMsg ?? "Save Analysis"}
                  </button>
                )}
              </div>
            </div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", color: N_FG, lineHeight: "1.8", fontFamily: "Georgia, serif", borderTop: `1px solid ${ACCENT_BORDER}`, paddingTop: "14px" }}>
              {result.analysis}
            </pre>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
