"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, asText } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" as const };
const ta:  React.CSSProperties = { ...inp, resize: "vertical" as const, minHeight: "80px" };

const INTENSITY_COLORS: Record<string, string> = { Low: "#16a34a", Medium: "#d97706", High: "#dc2626" };

export function SENDBehaviourLog({
  criteria,
  behaviourDb,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  behaviourDb: WorkspaceDatabase | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const childName = String(criteria?.["child-name"] ?? "").trim();
  const diagnosis = String(criteria?.["diagnosis"]  ?? "").trim();

  // Log form
  const [title,      setTitle]      = useState("");
  const [location,   setLocation]   = useState("Home");
  const [intensity,  setIntensity]  = useState("Medium");
  const [trigger,    setTrigger]    = useState("");
  const [resolution, setResolution] = useState("");
  const [notes,      setNotes]      = useState("");
  const [logSaving,  setLogSaving]  = useState(false);
  const [logMsg,     setLogMsg]     = useState<string | null>(null);

  // Analysis
  const [analysing,  setAnalysing]  = useState(false);
  const [analysisErr, setAnalysisErr] = useState<string | null>(null);
  const [analysis,   setAnalysis]   = useState<{ report: string; title: string } | null>(null);
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [analysisSaveMsg, setAnalysisSaveMsg] = useState<string | null>(null);

  const rows: WorkspaceRow[] = behaviourDb?.rows ?? [];

  async function logIncident() {
    if (!title.trim() || !trigger.trim()) { setLogMsg("Title and trigger are required."); return; }
    if (!behaviourDb) return;
    setLogSaving(true); setLogMsg(null);
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: behaviourDb.notionId,
          properties: { Title: title, Location: location, Intensity: intensity, Trigger: trigger, Resolution: resolution, Notes: notes },
          propertyTypes: { Title: "title", Location: "select", Intensity: "select", Trigger: "rich_text", Resolution: "rich_text", Notes: "rich_text" },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      onRowAdded(behaviourDb.notionId, await res.json() as WorkspaceRow);
      setLogMsg("Logged ✓");
      setTitle(""); setTrigger(""); setResolution(""); setNotes("");
    } catch { setLogMsg("Failed — try again"); }
    finally { setLogSaving(false); }
  }

  async function analysePatterns() {
    if (rows.length < 2) { setAnalysisErr("Log at least 2 incidents to run a pattern analysis."); return; }
    setAnalysing(true); setAnalysisErr(null); setAnalysis(null); setAnalysisSaveMsg(null);
    const logData = rows.slice(0, 30).map(r => ({
      title:      asText(r.properties["Title"]),
      location:   asText(r.properties["Location"]),
      intensity:  asText(r.properties["Intensity"]),
      trigger:    asText(r.properties["Trigger"]),
      resolution: asText(r.properties["Resolution"]),
    }));
    try {
      const res = await fetch("/api/members/send-behaviour-analysis", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs: logData, childName, diagnosis }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setAnalysis(await res.json() as { report: string; title: string });
    } catch (err) { setAnalysisErr(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setAnalysing(false); }
  }

  async function saveAnalysis() {
    if (!analysis || !documentsDb) return;
    setSavingAnalysis(true); setAnalysisSaveMsg(null);
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: documentsDb.notionId,
          properties: { Title: analysis.title, Type: "Behaviour Profile", Content: analysis.report },
          propertyTypes: { Title: "title", Type: "select", Content: "rich_text" },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      onRowAdded(documentsDb.notionId, await res.json() as WorkspaceRow);
      setAnalysisSaveMsg("Saved to Documents");
    } catch { setAnalysisSaveMsg("Save failed — try again"); }
    finally { setSavingAnalysis(false); }
  }

  const label = (t: string) => <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{t}</label>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: N_FONT, maxWidth: "720px" }}>
      {/* Log new incident */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Behaviour Log</h2>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Log incidents quickly, then use AI to analyse patterns and generate a behaviour profile for schools and professionals.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            {label("What happened? (brief title)")}
            <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Meltdown before school, refused food at dinner" />
          </div>
          <div>
            {label("Location")}
            <select style={sel} value={location} onChange={e => setLocation(e.target.value)}>
              {["Home", "School", "Out & About", "Other"].map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            {label("Intensity")}
            <select style={sel} value={intensity} onChange={e => setIntensity(e.target.value)}>
              {["Low", "Medium", "High"].map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div />
          <div style={{ gridColumn: "1 / -1" }}>
            {label("What triggered it?")}
            <textarea style={ta} value={trigger} onChange={e => setTrigger(e.target.value)} placeholder="e.g. Routine change — swimming was cancelled. Loud noise in the corridor. Transition between activities." />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            {label("How did it resolve?")}
            <textarea style={{ ...ta, minHeight: "60px" }} value={resolution} onChange={e => setResolution(e.target.value)} placeholder="e.g. Calmed after 20 mins in quiet room with weighted blanket." />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            {label("Additional notes")}
            <input style={inp} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Tired from poor sleep the night before" />
          </div>
        </div>

        {logMsg && <p style={{ margin: 0, fontSize: "13px", color: logMsg.includes("✓") ? "#16a34a" : "#dc2626" }}>{logMsg}</p>}

        <button onClick={logIncident} disabled={logSaving} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: logSaving ? ACCENT_LIGHT : ACCENT, color: logSaving ? ACCENT_TEXT : "white", fontWeight: 700, fontSize: "14px", cursor: logSaving ? "not-allowed" : "pointer", alignSelf: "flex-start" }}>
          {logSaving ? "Saving…" : "Log Incident"}
        </button>
      </div>

      {/* Recent logs */}
      {rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>{rows.length} incident{rows.length !== 1 ? "s" : ""} logged</p>
          {rows.slice(0, 8).map(row => {
            const t  = asText(row.properties["Title"])     || "Untitled";
            const i  = asText(row.properties["Intensity"]) || "";
            const l  = asText(row.properties["Location"])  || "";
            const tr = asText(row.properties["Trigger"])   || "";
            const ic = INTENSITY_COLORS[i] ?? "#6b7280";
            return (
              <div key={row.pageId} style={{ borderRadius: "8px", border: `1px solid ${N_BORDER}`, background: "white", padding: "10px 14px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                {i && <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px", background: `${ic}15`, color: ic, border: `1px solid ${ic}25`, marginTop: "2px" }}>{i}</span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: N_FG }}>{t}</p>
                  {l  && <span style={{ fontSize: "11px", color: N_MUTED, marginRight: "8px" }}>📍 {l}</span>}
                  {tr && <p style={{ margin: "4px 0 0", fontSize: "12px", color: N_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Trigger: {tr}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pattern analysis */}
      <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER}`, padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: N_FG }}>AI Pattern Analysis</h3>
          <p style={{ margin: 0, fontSize: "12px", color: N_MUTED }}>Once you have several incidents logged, AI will identify common triggers, times, locations and patterns — and generate a behaviour profile you can share with school.</p>
        </div>
        {analysisErr && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{analysisErr}</p>}
        <button onClick={analysePatterns} disabled={analysing} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 18px", borderRadius: "7px", border: "none", background: analysing ? ACCENT_LIGHT : ACCENT, color: analysing ? ACCENT_TEXT : "white", fontWeight: 700, fontSize: "13px", cursor: analysing ? "not-allowed" : "pointer", alignSelf: "flex-start" }}>
          {analysing ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Analysing…</> : `Analyse ${rows.length} Incident${rows.length !== 1 ? "s" : ""}`}
        </button>
        {analysis && (
          <div style={{ borderRadius: "10px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: ACCENT_TEXT }}>{analysis.title}</p>
              {documentsDb && (
                <button onClick={saveAnalysis} disabled={savingAnalysis} style={{ padding: "5px 12px", borderRadius: "6px", border: "none", background: ACCENT, color: "white", fontSize: "12px", fontWeight: 600, cursor: savingAnalysis ? "not-allowed" : "pointer" }}>
                  {savingAnalysis ? "Saving…" : analysisSaveMsg ?? "Save Profile"}
                </button>
              )}
            </div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", color: N_FG, lineHeight: 1.8, fontFamily: "Georgia, serif", borderTop: `1px solid ${ACCENT_BORDER}`, paddingTop: "12px" }}>
              {analysis.report}
            </pre>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
