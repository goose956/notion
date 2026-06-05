"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" as const };
const ta:  React.CSSProperties = { ...inp, resize: "vertical" as const, minHeight: "100px" };

const APPT_TYPES = ["SALT", "OT", "CAMHS", "School", "GP / Paed", "Tribunal", "Other"];

interface PrepResult  { questions: string; title: string; }
interface SummaryResult { summary: string; handover: string; actions: string; title: string; }

export function SENDAppointmentManager({
  criteria,
  appointmentsDb,
  documentsDb,
  onRowAdded,
}: {
  criteria:       Record<string, unknown> | null;
  appointmentsDb: WorkspaceDatabase | null;
  documentsDb:    WorkspaceDatabase | null;
  onRowAdded:     (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const childName  = String(criteria?.["child-name"] ?? "").trim();
  const diagnosis  = String(criteria?.["diagnosis"]  ?? "").trim();

  const [mode,        setMode]        = useState<"prep" | "summary">("prep");
  const [apptType,    setApptType]    = useState(APPT_TYPES[0]!);
  const [professional, setProfessional] = useState("");
  const [notes,       setNotes]       = useState("");
  const [context,     setContext]     = useState("");

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [prep,     setPrep]     = useState<PrepResult | null>(null);
  const [summary,  setSummary]  = useState<SummaryResult | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState<string | null>(null);
  const [savingDoc, setSavingDoc] = useState(false);
  const [saveDocMsg, setSaveDocMsg] = useState<string | null>(null);

  async function generatePrep() {
    setLoading(true); setError(null); setPrep(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/send-appointment-prep", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apptType, professional, childName, diagnosis, context }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setPrep(await res.json() as PrepResult);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setLoading(false); }
  }

  async function generateSummary() {
    if (!notes.trim()) { setError("Add your appointment notes first."); return; }
    setLoading(true); setError(null); setSummary(null); setSaveMsg(null); setSaveDocMsg(null);
    try {
      const res = await fetch("/api/members/send-appointment-summary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apptType, professional, notes, childName, diagnosis }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setSummary(await res.json() as SummaryResult);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setLoading(false); }
  }

  async function saveToAppointments() {
    if (!summary || !appointmentsDb) return;
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: appointmentsDb.notionId,
          properties: { Title: summary.title, Type: apptType, Professional: professional, Summary: summary.summary, Actions: summary.actions, Notes: notes },
          propertyTypes: { Title: "title", Type: "select", Professional: "rich_text", Summary: "rich_text", Actions: "rich_text", Notes: "rich_text" },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      onRowAdded(appointmentsDb.notionId, await res.json() as WorkspaceRow);
      setSaveMsg("Saved to Appointments");
    } catch { setSaveMsg("Save failed — try again"); }
    finally { setSaving(false); }
  }

  async function saveToDocuments() {
    if (!summary || !documentsDb) return;
    setSavingDoc(true); setSaveDocMsg(null);
    const content = `SUMMARY\n${summary.summary}\n\nHANDOVER NOTE\n${summary.handover}\n\nACTIONS\n${summary.actions}`;
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: documentsDb.notionId,
          properties: { Title: summary.title, Type: "Appointment Summary", Content: content },
          propertyTypes: { Title: "title", Type: "select", Content: "rich_text" },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      onRowAdded(documentsDb.notionId, await res.json() as WorkspaceRow);
      setSaveDocMsg("Saved to Documents");
    } catch { setSaveDocMsg("Save failed — try again"); }
    finally { setSavingDoc(false); }
  }

  function exportPdf() {
    if (!summary) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${summary.title}</title><style>
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#111;line-height:1.8;}
      h1{font-size:20px;color:#6d28d9;}h2{font-size:15px;color:#7c3aed;border-bottom:1px solid #ede9fe;padding-bottom:4px;margin-top:24px;}
      pre{white-space:pre-wrap;font-family:inherit;font-size:13px;}
    </style></head><body>
    <h1>${summary.title}</h1>
    <h2>Summary</h2><pre>${summary.summary.replace(/</g,"&lt;")}</pre>
    <h2>Handover Note</h2><pre>${summary.handover.replace(/</g,"&lt;")}</pre>
    <h2>Actions &amp; Follow-ups</h2><pre>${summary.actions.replace(/</g,"&lt;")}</pre>
    </body></html>`);
    w.document.close(); w.print();
  }

  const label = (t: string) => <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{t}</label>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "720px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Appointment Manager</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Prepare for appointments with AI-generated questions, then document what happened in a professional summary you can share with other providers.</p>
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "6px" }}>
        {(["prep", "summary"] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setError(null); }} style={{ padding: "6px 16px", borderRadius: "7px", border: `1px solid ${mode === m ? ACCENT : N_BORDER}`, background: mode === m ? ACCENT_LIGHT : "white", color: mode === m ? ACCENT_TEXT : N_MUTED, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
            {m === "prep" ? "📋 Before — Prep Questions" : "📝 After — Document It"}
          </button>
        ))}
      </div>

      {/* Shared fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div>
          {label("Appointment Type")}
          <select style={sel} value={apptType} onChange={e => setApptType(e.target.value)}>
            {APPT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          {label("Professional / Organisation")}
          <input style={inp} value={professional} onChange={e => setProfessional(e.target.value)} placeholder="e.g. NHS SALT Team, Dr. Patel" />
        </div>
      </div>

      {mode === "prep" ? (
        <>
          <div>
            {label("What's the focus of this appointment?")}
            <textarea style={ta} value={context} onChange={e => setContext(e.target.value)}
              placeholder="e.g. 6-month SALT review, discussing progress with eye contact and functional communication. Last time they recommended Makaton." />
          </div>
          {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}
          <button onClick={generatePrep} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? ACCENT_LIGHT : ACCENT, color: loading ? ACCENT_TEXT : "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Generating questions…</> : "Generate Prep Questions"}
          </button>
          {prep && (
            <div style={{ borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, padding: "20px" }}>
              <p style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: 700, color: ACCENT_TEXT }}>{prep.title}</p>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", color: N_FG, lineHeight: 1.8, fontFamily: "Georgia, serif" }}>{prep.questions}</pre>
            </div>
          )}
        </>
      ) : (
        <>
          <div>
            {label("Your appointment notes (rough is fine)")}
            <textarea style={{ ...ta, minHeight: "160px" }} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={"e.g.\nSALT said Ethan has made good progress with Makaton signs — now using 15 words consistently.\nRecommended 2x daily practice sessions of 10 mins.\nNext appointment in 3 months.\nShe's going to send a home programme by email.\nAsked about school involvement — she will write to school SENCO."} />
          </div>
          {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}
          <button onClick={generateSummary} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? ACCENT_LIGHT : ACCENT, color: loading ? ACCENT_TEXT : "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Writing summary…</> : "Document This Appointment"}
          </button>
          {summary && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>{summary.title}</p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button onClick={exportPdf} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>PDF</button>
                    {appointmentsDb && (
                      <button onClick={saveToAppointments} disabled={saving} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                        {saving ? "Saving…" : saveMsg ?? "Save to Appointments"}
                      </button>
                    )}
                    {documentsDb && (
                      <button onClick={saveToDocuments} disabled={savingDoc} style={{ padding: "6px 14px", borderRadius: "7px", border: "none", background: ACCENT, color: "white", fontSize: "12px", fontWeight: 600, cursor: savingDoc ? "not-allowed" : "pointer" }}>
                        {savingDoc ? "Saving…" : saveDocMsg ?? "Save to Documents"}
                      </button>
                    )}
                  </div>
                </div>
                {[
                  { heading: "Summary", text: summary.summary },
                  { heading: "Handover Note (share with other professionals)", text: summary.handover },
                  { heading: "Actions & Follow-ups", text: summary.actions },
                ].map(({ heading, text }) => (
                  <div key={heading} style={{ borderTop: `1px solid ${ACCENT_BORDER}`, paddingTop: "12px" }}>
                    <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 700, color: ACCENT_TEXT, textTransform: "uppercase", letterSpacing: "0.05em" }}>{heading}</p>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", color: N_FG, lineHeight: 1.8, fontFamily: "Georgia, serif" }}>{text}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
