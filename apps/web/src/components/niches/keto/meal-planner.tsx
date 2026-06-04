"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" as const };
const ta:  React.CSSProperties = { ...inp, resize: "vertical" as const, minHeight: "64px" };

const CALORIE_TARGETS = ["1200–1400 kcal", "1400–1600 kcal", "1600–1800 kcal", "1800–2000 kcal", "2000–2200 kcal", "2200–2500 kcal", "2500+ kcal"];

export function KetoMealPlanner({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const defaultDiet      = String(criteria?.["diet-type"]  ?? "").trim();
  const defaultGoal      = String(criteria?.["goal"]       ?? "").trim();
  const defaultAllergies = String(criteria?.["allergies"]  ?? "").trim();

  const [calories,    setCalories]    = useState(CALORIE_TARGETS[2]!);
  const [days,        setDays]        = useState("7");
  const [dietType,    setDietType]    = useState(defaultDiet);
  const [allergies,   setAllergies]   = useState(defaultAllergies);
  const [preferences, setPreferences] = useState("");
  const [notes,       setNotes]       = useState("");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<{ plan: string; title: string } | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function generate() {
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/keto-meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calories, days, dietType, allergies, preferences, notes, goal: defaultGoal }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setResult(await res.json() as { plan: string; title: string });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!result || !documentsDb) return;
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId:    documentsDb.notionId,
          properties:    { Title: result.title, Type: "Meal Plan", Content: result.plan },
          propertyTypes: { Title: "title", Type: "select", Content: "rich_text" },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      onRowAdded(documentsDb.notionId, await res.json() as WorkspaceRow);
      setSaveMsg("Saved to Documents");
    } catch { setSaveMsg("Save failed — try again"); }
    finally  { setSaving(false); }
  }

  function exportPdf() {
    if (!result) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${result.title}</title><style>
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#111;line-height:1.8;}
      h1{font-size:22px;color:#047857;}strong{color:#047857;}pre{white-space:pre-wrap;font-family:inherit;}
      h2{font-size:16px;color:#059669;border-bottom:1px solid #d1fae5;padding-bottom:4px;margin-top:28px;}
    </style></head><body><h1>${result.title}</h1><pre>${result.plan.replace(/</g, "&lt;")}</pre></body></html>`);
    w.document.close(); w.print();
  }

  function copyToClipboard() {
    if (!result) return;
    navigator.clipboard.writeText(result.plan).catch(() => null);
  }

  const label = (t: string) => <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{t}</label>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "720px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Meal Planner</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Generate a full keto meal plan with daily macro breakdowns, recipes and a complete shopping list.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div>
          {label("Daily Calorie Target")}
          <select style={sel} value={calories} onChange={(e) => setCalories(e.target.value)}>
            {CALORIE_TARGETS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          {label("Number of Days")}
          <select style={sel} value={days} onChange={(e) => setDays(e.target.value)}>
            {["3", "5", "7", "14"].map((d) => <option key={d}>{d} days</option>)}
          </select>
        </div>
        <div>
          {label("Diet Approach")}
          <select style={sel} value={dietType} onChange={(e) => setDietType(e.target.value)}>
            {["Standard Keto (SKD)", "Lazy Keto", "Strict / Clean Keto", "Carnivore-adjacent", "Dairy-Free Keto"].map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          {label("Allergies / Foods to Avoid")}
          <input style={inp} value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. dairy-free, no nuts, no shellfish" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Food Preferences")}
          <textarea style={ta} value={preferences} onChange={(e) => setPreferences(e.target.value)} placeholder="e.g. I love salmon and eggs, prefer simple meals under 30 mins, batch-cook friendly, no liver or offal" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Additional Notes")}
          <input style={inp} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. cooking for 2, budget-conscious, prefer Mediterranean flavours" />
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button onClick={generate} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? "#d1fae5" : ACCENT, color: loading ? ACCENT_TEXT : "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Building your meal plan…</> : "Generate Meal Plan"}
      </button>

      {result && (
        <div style={{ borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>{result.title}</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={copyToClipboard} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Copy</button>
              <button onClick={exportPdf} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Download PDF</button>
              {documentsDb && (
                <button onClick={save} disabled={saving} style={{ padding: "6px 14px", borderRadius: "7px", border: "none", background: ACCENT, color: "white", fontSize: "12px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : saveMsg ?? "Save Plan"}
                </button>
              )}
            </div>
          </div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", color: N_FG, lineHeight: "1.8", fontFamily: "Georgia, serif", borderTop: `1px solid ${ACCENT_BORDER}`, paddingTop: "14px" }}>
            {result.plan}
          </pre>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
