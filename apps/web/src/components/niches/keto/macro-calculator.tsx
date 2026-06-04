"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" as const };

interface MacroResult {
  targets: string;
  title: string;
  calories: number;
  protein: number;
  fat: number;
  netCarbs: number;
}

export function KetoMacroCalculator({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const defaultGoal = String(criteria?.["goal"] ?? "").trim();

  const [gender,   setGender]   = useState("Female");
  const [age,      setAge]      = useState("30");
  const [weight,   setWeight]   = useState("");
  const [height,   setHeight]   = useState("");
  const [unit,     setUnit]     = useState<"metric" | "imperial">("metric");
  const [activity, setActivity] = useState("Moderately Active");
  const [goal,     setGoal]     = useState(defaultGoal || "Weight Loss");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<MacroResult | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function calculate() {
    if (!weight.trim() || !height.trim()) { setError("Enter your weight and height."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/keto-macros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender, age, weight, height, unit, activity, goal }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setResult(await res.json() as MacroResult);
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
          properties:    { Title: result.title, Type: "Macro Targets", Content: result.targets },
          propertyTypes: { Title: "title", Type: "select", Content: "rich_text" },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      onRowAdded(documentsDb.notionId, await res.json() as WorkspaceRow);
      setSaveMsg("Saved to Documents");
    } catch { setSaveMsg("Save failed — try again"); }
    finally  { setSaving(false); }
  }

  const label = (t: string) => <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{t}</label>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "720px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Macro Calculator</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Get your personalised daily keto macro targets — calories, protein, fat and net carbs — based on your stats and goal.</p>
      </div>

      {/* Unit toggle */}
      <div style={{ display: "flex", gap: "6px" }}>
        {(["metric", "imperial"] as const).map((u) => (
          <button key={u} onClick={() => setUnit(u)} style={{ padding: "5px 14px", borderRadius: "7px", border: `1px solid ${unit === u ? ACCENT : N_BORDER}`, background: unit === u ? ACCENT_LIGHT : "white", color: unit === u ? ACCENT_TEXT : N_MUTED, fontSize: "12px", fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
            {u === "metric" ? "Metric (kg / cm)" : "Imperial (lbs / in)"}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div>
          {label("Gender")}
          <select style={sel} value={gender} onChange={(e) => setGender(e.target.value)}>
            {["Female", "Male"].map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          {label("Age")}
          <select style={sel} value={age} onChange={(e) => setAge(e.target.value)}>
            {Array.from({ length: 62 }, (_, i) => String(i + 18)).map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          {label(`Weight (${unit === "metric" ? "kg" : "lbs"})`)}
          <input style={inp} type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={unit === "metric" ? "e.g. 72" : "e.g. 158"} />
        </div>
        <div>
          {label(`Height (${unit === "metric" ? "cm" : "inches"})`)}
          <input style={inp} type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder={unit === "metric" ? "e.g. 165" : "e.g. 65"} />
        </div>
        <div>
          {label("Activity Level")}
          <select style={sel} value={activity} onChange={(e) => setActivity(e.target.value)}>
            {["Sedentary", "Lightly Active", "Moderately Active", "Very Active", "Extremely Active"].map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          {label("Goal")}
          <select style={sel} value={goal} onChange={(e) => setGoal(e.target.value)}>
            {["Weight Loss", "Maintenance", "Muscle Gain", "Mental Clarity / Energy", "Medical / Therapeutic"].map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button onClick={calculate} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? "#d1fae5" : ACCENT, color: loading ? ACCENT_TEXT : "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Calculating…</> : "Calculate My Macros"}
      </button>

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Macro chips */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {[
              { label: "Calories",   value: `${result.calories} kcal`, bg: "#fef3c7", color: "#92400e" },
              { label: "Net Carbs",  value: `${result.netCarbs}g`,     bg: "#dcfce7", color: "#14532d" },
              { label: "Protein",    value: `${result.protein}g`,      bg: "#dbeafe", color: "#1e3a8a" },
              { label: "Fat",        value: `${result.fat}g`,          bg: "#fce7f3", color: "#831843" },
            ].map(({ label: l, value, bg, color }) => (
              <div key={l} style={{ background: bg, borderRadius: "10px", padding: "8px 16px", textAlign: "center" }}>
                <div style={{ fontSize: "16px", fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: "11px", color, opacity: 0.8 }}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{ borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>{result.title}</p>
              {documentsDb && (
                <button onClick={save} disabled={saving} style={{ padding: "6px 14px", borderRadius: "7px", border: "none", background: ACCENT, color: "white", fontSize: "12px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : saveMsg ?? "Save Targets"}
                </button>
              )}
            </div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", color: N_FG, lineHeight: "1.8", fontFamily: "Georgia, serif", borderTop: `1px solid ${ACCENT_BORDER}`, paddingTop: "14px" }}>
              {result.targets}
            </pre>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
