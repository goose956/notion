"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const GOALS      = ["Weight Loss & Fat Loss", "Muscle Building & Strength", "Athletic Performance", "General Fitness & Lifestyle", "Rehabilitation & Injury Recovery", "Endurance", "Flexibility & Mobility"];
const LEVELS     = ["Beginner", "Intermediate", "Advanced"];
const EQUIPMENT  = ["Full Gym", "Home Gym", "Dumbbells Only", "Bodyweight Only", "Resistance Bands", "Kettlebells"];
const DURATIONS  = ["30 minutes", "45 minutes", "60 minutes", "75 minutes", "90 minutes"];

const inp: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: "7px",
  border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG,
  fontFamily: N_FONT, background: "white", boxSizing: "border-box",
};
const sel: React.CSSProperties = { ...inp, appearance: "none" as const };

export function PTProgrammeBuilder({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const defaultGoal  = String(criteria?.["speciality"] ?? "General Fitness & Lifestyle").trim();

  const [clientName,    setClientName]    = useState("");
  const [goal,          setGoal]          = useState(defaultGoal);
  const [level,         setLevel]         = useState("Beginner");
  const [equipment,     setEquipment]     = useState("Full Gym");
  const [daysPerWeek,   setDaysPerWeek]   = useState(3);
  const [sessionLength, setSessionLength] = useState("60 minutes");
  const [injuries,      setInjuries]      = useState("");
  const [notes,         setNotes]         = useState("");

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [result,   setResult]   = useState<{ programme: string; title: string; clientName: string } | null>(null);

  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState<string | null>(null);

  async function generate() {
    if (!clientName.trim()) { setError("Enter a client name first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/pt-programme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, goal, level, equipment, daysPerWeek, sessionLength, injuries, notes }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      const data = await res.json() as { programme: string; title: string; clientName: string };
      setResult(data);
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
          properties:    { Title: result.title, Type: "Training Programme", Client: result.clientName, Content: result.programme },
          propertyTypes: { Title: "title", Type: "select", Client: "rich_text", Content: "rich_text" },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json() as WorkspaceRow;
      onRowAdded(documentsDb.notionId, saved);
      setSaveMsg("Saved to Documents");
    } catch {
      setSaveMsg("Save failed — try again");
    } finally {
      setSaving(false);
    }
  }

  function exportPdf() {
    if (!result) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${result.title}</title><style>
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#111;line-height:1.7;}
      h1{font-size:22px;margin-bottom:4px;}
      h2,h3,strong{color:#15803d;}
      pre{white-space:pre-wrap;font-family:inherit;}
      @media print{body{margin:20px;}}
    </style></head><body>
      <h1>${result.title}</h1>
      <pre>${result.programme.replace(/</g, "&lt;")}</pre>
    </body></html>`);
    w.document.close();
    w.print();
  }

  const label = (text: string) => (
    <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{text}</label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "720px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Programme Builder</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Generate a complete 4-week personalised training programme — ready to hand to your client.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Client Name *")}
          <input style={inp} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Sarah Johnson" />
        </div>

        <div>
          {label("Primary Goal")}
          <select style={sel} value={goal} onChange={(e) => setGoal(e.target.value)}>
            {GOALS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>

        <div>
          {label("Fitness Level")}
          <select style={sel} value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        <div>
          {label("Available Equipment")}
          <select style={sel} value={equipment} onChange={(e) => setEquipment(e.target.value)}>
            {EQUIPMENT.map((e) => <option key={e}>{e}</option>)}
          </select>
        </div>

        <div>
          {label("Session Length")}
          <select style={sel} value={sessionLength} onChange={(e) => setSessionLength(e.target.value)}>
            {DURATIONS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>

        <div>
          {label("Training Days per Week")}
          <select style={sel} value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))}>
            {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} days</option>)}
          </select>
        </div>

        <div>
          {label("Injuries / Restrictions")}
          <input style={inp} value={injuries} onChange={(e) => setInjuries(e.target.value)} placeholder="e.g. bad left knee, avoid heavy squats" />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          {label("Additional Notes")}
          <textarea
            style={{ ...inp, resize: "vertical", minHeight: "60px" }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any other context — lifestyle, preferences, previous training history..."
          />
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button
        onClick={generate}
        disabled={loading}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? "#d1fae5" : ACCENT, color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}
      >
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Generating programme…</> : "Generate 4-Week Programme"}
      </button>

      {result && (
        <div style={{ borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>{result.title}</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={exportPdf} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                Export PDF
              </button>
              {documentsDb && (
                <button onClick={save} disabled={saving} style={{ padding: "6px 14px", borderRadius: "7px", border: "none", background: ACCENT, color: "white", fontSize: "12px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : saveMsg ?? "Save to Documents"}
                </button>
              )}
            </div>
          </div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", color: N_FG, lineHeight: "1.7", fontFamily: "Georgia, serif", borderTop: `1px solid ${ACCENT_BORDER}`, paddingTop: "14px" }}>
            {result.programme}
          </pre>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
