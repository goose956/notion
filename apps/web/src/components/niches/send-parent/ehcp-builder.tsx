"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, resolveChildAge } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" as const };
const ta:  React.CSSProperties = { ...inp, resize: "vertical" as const, minHeight: "120px" };

const MODES = [
  { id: "new",      label: "📄 New EHCP Request",     desc: "Write a parental request for an EHCP assessment" },
  { id: "evidence", label: "✍️ Evidence Statement",    desc: "Turn your observations into professional EHCP evidence" },
  { id: "review",   label: "📋 Annual Review Prep",    desc: "Prepare your position for an annual review meeting" },
  { id: "iep",      label: "🇺🇸 IEP Builder (US/IE)",   desc: "Build evidence and goals for an IEP meeting" },
];

interface EHCPResult { document: string; reviewQuestions: string; title: string; }

export function SENDEHCPBuilder({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const childName  = String(criteria?.["child-name"]    ?? "").trim();
  const childAge   = resolveChildAge(criteria?.["child-dob"] ?? criteria?.["child-age"]);
  const diagnosis  = String(criteria?.["diagnosis"]      ?? "").trim();
  const focus      = String(criteria?.["current-focus"]  ?? "").trim();
  const country    = String(criteria?.["country"]        ?? "").trim();

  const [mode,           setMode]           = useState("evidence");
  const [observations,   setObservations]   = useState("");
  const [professionalEvidence, setProfessionalEvidence] = useState("");
  const [schoolConcerns, setSchoolConcerns] = useState("");
  const [currentSupport, setCurrentSupport] = useState("");
  const [childStrengths, setChildStrengths] = useState("");
  const [urgency,        setUrgency]        = useState("Not urgent");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<EHCPResult | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function generate() {
    if (!observations.trim()) { setError("Please describe your observations first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/send-ehcp-builder", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, observations, professionalEvidence, schoolConcerns, currentSupport, childStrengths, urgency, childName, childAge, diagnosis, focus, country }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setResult(await res.json() as EHCPResult);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
    finally { setLoading(false); }
  }

  async function save() {
    if (!result || !documentsDb) return;
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: documentsDb.notionId,
          properties: { Title: result.title, Type: "EHCP Evidence", Content: result.document },
          propertyTypes: { Title: "title", Type: "select", Content: "rich_text" },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      onRowAdded(documentsDb.notionId, await res.json() as WorkspaceRow);
      setSaveMsg("Saved to Documents");
    } catch { setSaveMsg("Save failed — try again"); }
    finally { setSaving(false); }
  }

  function exportPdf() {
    if (!result) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${result.title}</title><style>
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#111;line-height:1.8;}
      h1{font-size:20px;color:#6d28d9;}h2{font-size:15px;color:#7c3aed;border-bottom:1px solid #ede9fe;padding-bottom:4px;margin-top:24px;}
      pre{white-space:pre-wrap;font-family:inherit;font-size:13px;}.notice{font-size:11px;color:#888;margin-top:40px;border-top:1px solid #eee;padding-top:12px;}
    </style></head><body>
    <h1>${result.title}</h1>
    <pre>${result.document.replace(/</g,"&lt;")}</pre>
    <h2>Questions for Your Meeting</h2>
    <pre>${result.reviewQuestions.replace(/</g,"&lt;")}</pre>
    <p class="notice">This document was drafted with AI assistance. Always review and personalise before submission. This is not legal advice.</p>
    </body></html>`);
    w.document.close(); w.print();
  }

  const label = (t: string) => <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{t}</label>;
  const selectedMode = MODES.find(m => m.id === mode);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "720px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>EHCP / IEP Builder</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Turn your everyday observations and knowledge of your child into professional, evidence-based documentation that carries weight with schools, councils and tribunals.</p>
      </div>

      {/* Disclaimer */}
      <div style={{ borderRadius: "8px", background: "#fef9c3", border: "1px solid #fde047", padding: "10px 14px" }}>
        <p style={{ margin: 0, fontSize: "12px", color: "#713f12" }}>This tool helps you draft and structure your documentation. Always review before submitting. For complex disputes or tribunal cases, consider contacting your local SENDIASS service (free and impartial).</p>
      </div>

      {/* Mode selector */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setResult(null); setError(null); }} style={{ padding: "10px 14px", borderRadius: "8px", border: `1px solid ${mode === m.id ? ACCENT : N_BORDER}`, background: mode === m.id ? ACCENT_LIGHT : "white", textAlign: "left", cursor: "pointer" }}>
            <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: mode === m.id ? ACCENT_TEXT : N_FG }}>{m.label}</p>
            <p style={{ margin: 0, fontSize: "11px", color: N_MUTED }}>{m.desc}</p>
          </button>
        ))}
      </div>

      {selectedMode && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            {label("Your observations — describe your child in your own words *")}
            <textarea style={ta} value={observations} onChange={e => setObservations(e.target.value)}
              placeholder={`Describe what you see at home and in daily life. Include:\n• What ${childName || "your child"} struggles with\n• How it affects their day\n• What helps and what doesn't\n• Any regression or new concerns\n\nDon't worry about using the right language — that's what the AI is for.`} />
          </div>
          <div>
            {label("What professionals have said (reports, letters, verbal)")}
            <textarea style={{ ...ta, minHeight: "80px" }} value={professionalEvidence} onChange={e => setProfessionalEvidence(e.target.value)}
              placeholder="e.g. SALT report March 2024 said 18-month language delay. OT mentioned sensory processing difficulties. Paediatrician confirmed autism diagnosis Oct 2023." />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              {label("Concerns about school provision")}
              <textarea style={{ ...ta, minHeight: "70px" }} value={schoolConcerns} onChange={e => setSchoolConcerns(e.target.value)}
                placeholder="e.g. No 1:1 support. Sent home early 4 times. Struggles at transitions." />
            </div>
            <div>
              {label("Current support in place")}
              <textarea style={{ ...ta, minHeight: "70px" }} value={currentSupport} onChange={e => setCurrentSupport(e.target.value)}
                placeholder="e.g. 10 hrs TA support, weekly SALT, no OT." />
            </div>
            <div>
              {label("Your child's strengths & interests")}
              <input style={inp} value={childStrengths} onChange={e => setChildStrengths(e.target.value)} placeholder="e.g. loves trains, great memory, kind, creative" />
            </div>
            <div>
              {label("Urgency")}
              <select style={sel} value={urgency} onChange={e => setUrgency(e.target.value)}>
                {["Not urgent", "Annual review coming up", "Urgent — school placement at risk", "Tribunal / mediation pending"].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button onClick={generate} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? ACCENT_LIGHT : ACCENT, color: loading ? ACCENT_TEXT : "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Building your document…</> : `Build ${selectedMode?.label ?? "Document"}`}
      </button>

      {result && (
        <div style={{ borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>{result.title}</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={exportPdf} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>PDF</button>
              {documentsDb && (
                <button onClick={save} disabled={saving} style={{ padding: "6px 14px", borderRadius: "7px", border: "none", background: ACCENT, color: "white", fontSize: "12px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : saveMsg ?? "Save to Documents"}
                </button>
              )}
            </div>
          </div>
          {[
            { heading: "Your Document", text: result.document },
            { heading: "Questions to Ask at Your Meeting", text: result.reviewQuestions },
          ].map(({ heading, text }) => (
            <div key={heading} style={{ borderTop: `1px solid ${ACCENT_BORDER}`, paddingTop: "12px" }}>
              <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 700, color: ACCENT_TEXT, textTransform: "uppercase", letterSpacing: "0.05em" }}>{heading}</p>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", color: N_FG, lineHeight: 1.8, fontFamily: "Georgia, serif" }}>{text}</pre>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
