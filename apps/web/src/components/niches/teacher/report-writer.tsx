"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const GRADES = ["", "A*", "A", "B", "C", "D", "E", "F", "9", "8", "7", "6", "5", "4", "3", "2", "1", "Distinction*", "Distinction", "Merit", "Pass", "Working towards", "Expected", "Exceeding", "Emerging"];
const TONES  = ["Professional & encouraging", "Formal & academic", "Warm & supportive", "Direct & concise"];
const LENGTHS = ["Short (80–100 words)", "Standard (120–150 words)", "Detailed (180–220 words)"];

export function TeacherReportWriter({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const defaultSubject = String(criteria?.["subject"] ?? "").split(",")[0]?.trim() ?? "";

  const [studentName,    setStudentName]    = useState("");
  const [subject,        setSubject]        = useState(defaultSubject);
  const [yearGroup,      setYearGroup]      = useState("");
  const [currentGrade,   setCurrentGrade]   = useState("");
  const [targetGrade,    setTargetGrade]    = useState("");
  const [strengths,      setStrengths]      = useState("");
  const [improvements,   setImprovements]   = useState("");
  const [behaviour,      setBehaviour]      = useState("");
  const [tone,           setTone]           = useState(TONES[0]!);
  const [length,         setLength]         = useState(LENGTHS[1]!);

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [comment,  setComment]  = useState<string | null>(null);

  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function generate() {
    if (!studentName.trim()) { setError("Please enter the student name."); return; }
    setLoading(true); setError(null); setComment(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/teacher-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, subject, yearGroup, currentGrade, targetGrade, strengths, improvements, behaviour, tone, length }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      const data = await res.json() as { comment: string };
      setComment(data.comment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!comment || !documentsDb) return;
    setSaving(true); setSaveMsg(null);
    try {
      const title = `Report — ${studentName}${subject ? ` (${subject})` : ""}`;
      const properties = { Title: title, Type: "Report Comment", Subject: subject || "Other", "Year Group": yearGroup || "", Content: comment };
      const propertyTypes = { Title: "title", Type: "select", Subject: "select", "Year Group": "select", Content: "rich_text" };
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: documentsDb.notionId, properties, propertyTypes }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { pageId?: string };
      if (data.pageId) {
        onRowAdded(documentsDb.notionId, { pageId: data.pageId, properties });
        setSaveMsg("Report comment saved to Documents");
      }
    } catch {
      setSaveMsg("Save failed — try again");
    } finally {
      setSaving(false);
    }
  }

  function exportPDF() {
    if (!comment) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const title = `Report — ${studentName}${subject ? ` (${subject})` : ""}`;
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#1a1a1a;line-height:1.7;}
      h1{font-size:20px;margin-bottom:4px;}
      .meta{font-size:13px;color:#666;margin-bottom:28px;}
      p{font-size:14px;}
      @media print{body{margin:20px;}}
    </style></head><body>
      <h1>${title}</h1>
      <p class="meta">${[subject, yearGroup, currentGrade ? `Grade: ${currentGrade}` : ""].filter(Boolean).join(" · ")}</p>
      <p>${comment.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>
    </body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: N_FONT }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>Report Writer</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
          Enter a student's details and AI writes a professional, personalised report comment in your chosen tone and length. 1 credit.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        <Field label="Student name *" value={studentName} onChange={setStudentName} placeholder="e.g. Sarah" />
        <Field label="Subject" value={subject} onChange={setSubject} placeholder="e.g. English" />
        <Field label="Year Group" value={yearGroup} onChange={setYearGroup} placeholder="e.g. Year 10" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        <SelectField label="Current grade" value={currentGrade} onChange={setCurrentGrade} options={GRADES} />
        <SelectField label="Target grade" value={targetGrade} onChange={setTargetGrade} options={GRADES} />
        <Field label="Behaviour / attitude (optional)" value={behaviour} onChange={setBehaviour} placeholder="e.g. enthusiastic, disruptive at times, hard-working" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label="Key strengths" value={strengths} onChange={setStrengths} placeholder="e.g. strong analytical writing, excellent class contributions, creative thinking" />
        <Field label="Areas for improvement" value={improvements} onChange={setImprovements} placeholder="e.g. needs to proof-read, should attempt more exam questions under timed conditions" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <SelectField label="Tone" value={tone} onChange={setTone} options={TONES} />
        <SelectField label="Length" value={length} onChange={setLength} options={LENGTHS} />
      </div>

      <button onClick={generate} disabled={loading}
        style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", background: ACCENT, border: "none", color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: N_FONT }}>
        {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "✦"}
        {loading ? "Writing report comment…" : "Generate Report Comment"}
      </button>

      {error && <ErrorBox message={error} />}

      {comment && (
        <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Report Comment — {studentName}</p>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>{[subject, yearGroup].filter(Boolean).join(" · ")}</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={exportPDF}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", background: "white", border: `1px solid ${N_BORDER_MED}`, color: N_FG, fontWeight: 600, fontSize: "12px", cursor: "pointer", fontFamily: N_FONT }}>
                📄 Export PDF
              </button>
              {documentsDb && (
                <button onClick={save} disabled={saving}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_TEXT, fontWeight: 600, fontSize: "12px", cursor: saving ? "not-allowed" : "pointer", fontFamily: N_FONT }}>
                  {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "💾"}
                  {saving ? "Saving…" : "Save to Documents"}
                </button>
              )}
            </div>
          </div>
          {saveMsg && (
            <div style={{ padding: "8px 16px", background: ACCENT_LIGHT, borderBottom: `1px solid ${ACCENT_BORDER}`, fontSize: "12px", color: ACCENT_TEXT, fontWeight: 600 }}>
              {saveMsg}
            </div>
          )}
          <div style={{ padding: "20px", fontSize: "14px", color: N_FG, lineHeight: 1.8, fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {comment}
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ padding: "9px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT }} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ padding: "9px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white" }}>
        {options.map((o) => <option key={o} value={o}>{o || "Select…"}</option>)}
      </select>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.20)", color: "#991b1b", fontSize: "13px" }}>
      {message}
    </div>
  );
}
