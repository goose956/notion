"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, resolveChildAge } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" as const };
const ta:  React.CSSProperties = { ...inp, resize: "vertical" as const, minHeight: "100px" };

const LETTER_TYPES = [
  "Request for EHCP Assessment",
  "Complaint About School Provision",
  "Request for School SENCO Meeting",
  "Response to EHCP Draft",
  "Request for Specialist Placement",
  "Letter to GP / Paediatrician",
  "Letter to CAMHS",
  "Request for OT / SALT Referral",
  "Disagreement with LA Decision",
  "Other",
];

interface LetterResult { letter: string; title: string; }

export function SENDLetterWriter({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const childName = String(criteria?.["child-name"] ?? "").trim();
  const childAge  = resolveChildAge(criteria?.["child-dob"] ?? criteria?.["child-age"]);
  const diagnosis = String(criteria?.["diagnosis"]  ?? "").trim();

  const [letterType,   setLetterType]   = useState(LETTER_TYPES[0]!);
  const [recipient,    setRecipient]    = useState("");
  const [parentName,   setParentName]   = useState("");
  const [situation,    setSituation]    = useState("");
  const [desired,      setDesired]      = useState("");
  const [tone,         setTone]         = useState("Firm but polite");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<LetterResult | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function generate() {
    if (!situation.trim()) { setError("Please describe the situation first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/send-letter-writer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letterType, recipient, parentName, situation, desired, tone, childName, childAge, diagnosis }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setResult(await res.json() as LetterResult);
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
          properties: { Title: result.title, Type: "Letter", Content: result.letter },
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
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#111;line-height:1.9;}
      pre{white-space:pre-wrap;font-family:inherit;font-size:13px;}
    </style></head><body><pre>${result.letter.replace(/</g,"&lt;")}</pre></body></html>`);
    w.document.close(); w.print();
  }

  function copyToClipboard() {
    if (!result) return;
    navigator.clipboard.writeText(result.letter).catch(() => null);
  }

  const label = (t: string) => <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{t}</label>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "720px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Letter Writer</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>AI writes formal letters to schools, councils, the NHS and other services. Professional language, the right tone, and all the key points covered.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Letter type")}
          <select style={sel} value={letterType} onChange={e => setLetterType(e.target.value)}>
            {LETTER_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          {label("Recipient (name / role / organisation)")}
          <input style={inp} value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="e.g. SENCO, Mrs Smith, Oakwood Primary" />
        </div>
        <div>
          {label("Your name")}
          <input style={inp} value={parentName} onChange={e => setParentName(e.target.value)} placeholder="e.g. Sarah Jones" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Describe the situation *")}
          <textarea style={ta} value={situation} onChange={e => setSituation(e.target.value)}
            placeholder="Explain what has happened, what the problem is, and any relevant history. Include dates if you have them." />
        </div>
        <div>
          {label("What outcome do you want?")}
          <textarea style={{ ...ta, minHeight: "70px" }} value={desired} onChange={e => setDesired(e.target.value)}
            placeholder="e.g. A meeting within 2 weeks, a written response, referral to be made" />
        </div>
        <div>
          {label("Tone")}
          <select style={sel} value={tone} onChange={e => setTone(e.target.value)}>
            {["Firm but polite", "Formal and assertive", "Conciliatory", "Urgent"].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button onClick={generate} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? ACCENT_LIGHT : ACCENT, color: loading ? ACCENT_TEXT : "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Writing letter…</> : "Write Letter"}
      </button>

      {result && (
        <div style={{ borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>{result.title}</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={copyToClipboard} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Copy</button>
              <button onClick={exportPdf} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>PDF</button>
              {documentsDb && (
                <button onClick={save} disabled={saving} style={{ padding: "6px 14px", borderRadius: "7px", border: "none", background: ACCENT, color: "white", fontSize: "12px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : saveMsg ?? "Save Letter"}
                </button>
              )}
            </div>
          </div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", color: N_FG, lineHeight: 1.9, fontFamily: "Georgia, serif", borderTop: `1px solid ${ACCENT_BORDER}`, paddingTop: "14px" }}>
            {result.letter}
          </pre>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
