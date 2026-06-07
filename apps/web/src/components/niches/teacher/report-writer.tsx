"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, T_SURFACE, T_SURFACE2, T_SHADOW } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const GRADES    = ["", "A*", "A", "B", "C", "D", "E", "F", "9", "8", "7", "6", "5", "4", "3", "2", "1", "Distinction*", "Distinction", "Merit", "Pass", "Working towards", "Expected", "Exceeding", "Emerging"];
const TONES     = ["Professional & encouraging", "Formal & academic", "Warm & supportive", "Direct & concise"];
const EMAIL_TONES = ["Friendly & professional", "Formal", "Warm & empathetic", "Direct & concise"];
const LENGTHS   = ["Short (80–100 words)", "Standard (120–150 words)", "Detailed (180–220 words)"];
const EMAIL_TYPES = ["Progress Update", "Praise", "Concern", "Meeting Request", "General Update"];

type Mode = "report" | "email";

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

  const [mode,          setMode]          = useState<Mode>("report");

  // Shared fields
  const [studentName,   setStudentName]   = useState("");
  const [subject,       setSubject]       = useState(defaultSubject);
  const [yearGroup,     setYearGroup]     = useState("");
  const [strengths,     setStrengths]     = useState("");

  // Report-only fields
  const [currentGrade,  setCurrentGrade]  = useState("");
  const [targetGrade,   setTargetGrade]   = useState("");
  const [improvements,  setImprovements]  = useState("");
  const [behaviour,     setBehaviour]     = useState("");
  const [tone,          setTone]          = useState(TONES[0]!);
  const [length,        setLength]        = useState(LENGTHS[1]!);

  // Email-only fields
  const [parentName,    setParentName]    = useState("");
  const [teacherName,   setTeacherName]   = useState("");
  const [emailType,     setEmailType]     = useState(EMAIL_TYPES[0]!);
  const [concerns,      setConcerns]      = useState("");
  const [emailContext,  setEmailContext]  = useState("");
  const [emailTone,     setEmailTone]     = useState(EMAIL_TONES[0]!);

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [output,   setOutput]   = useState<string | null>(null);

  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState<string | null>(null);

  function switchMode(m: Mode) {
    setMode(m);
    setOutput(null);
    setError(null);
    setSaveMsg(null);
  }

  async function generate() {
    if (!studentName.trim()) { setError("Please enter the student name."); return; }
    setLoading(true); setError(null); setOutput(null); setSaveMsg(null);
    try {
      if (mode === "report") {
        const res = await fetch("/api/members/teacher-report", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentName, subject, yearGroup, currentGrade, targetGrade, strengths, improvements, behaviour, tone, length }),
        });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
        const data = await res.json() as { comment: string };
        setOutput(data.comment);
      } else {
        const res = await fetch("/api/members/teacher-parent-email", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentName, parentName, subject, yearGroup, emailType, strengths, concerns, context: emailContext, tone: emailTone, teacherName }),
        });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
        const data = await res.json() as { email: string };
        setOutput(data.email);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!output || !documentsDb) return;
    setSaving(true); setSaveMsg(null);
    try {
      const docType = mode === "report" ? "Report Comment" : "Parent Email";
      const title   = mode === "report"
        ? `Report — ${studentName}${subject ? ` (${subject})` : ""}`
        : `Email — ${studentName}${emailType ? ` · ${emailType}` : ""}`;
      const properties     = { Title: title, Type: docType, Subject: subject || "Other", "Year Group": yearGroup || "", Content: output };
      const propertyTypes  = { Title: "title", Type: "select", Subject: "select", "Year Group": "select", Content: "rich_text" };
      const res = await fetch("/api/members/workspace", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: documentsDb.notionId, properties, propertyTypes }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { pageId?: string };
      if (data.pageId) {
        onRowAdded(documentsDb.notionId, { pageId: data.pageId, properties });
        setSaveMsg(`${docType} saved to Documents`);
      }
    } catch {
      setSaveMsg("Save failed — try again");
    } finally {
      setSaving(false);
    }
  }

  function exportPDF() {
    if (!output) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const title = mode === "report"
      ? `Report — ${studentName}${subject ? ` (${subject})` : ""}`
      : `Parent Email — ${studentName}`;
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      body{font-family:${mode === "email" ? "Arial, sans-serif" : "Georgia, serif"};max-width:800px;margin:40px auto;padding:0 24px;color:#1a1a1a;line-height:1.7;}
      h1{font-size:20px;margin-bottom:4px;} .meta{font-size:13px;color:#666;margin-bottom:28px;}
      p{font-size:14px;} @media print{body{margin:20px;}}
    </style></head><body>
      <h1>${title}</h1>
      <p class="meta">${[subject, yearGroup].filter(Boolean).join(" · ")}</p>
      <p style="white-space:pre-wrap">${output.replace(/</g, "&lt;")}</p>
    </body></html>`);
    win.document.close(); win.print();
  }

  const isEmail = mode === "email";
  const outputLabel = isEmail
    ? `${emailType} — ${studentName}`
    : `Report Comment — ${studentName}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: N_FONT }}>

      {/* Header + mode toggle */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>
            {isEmail ? "Parent Email Writer" : "Report Writer"}
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
            {isEmail
              ? "AI drafts a professional parent email — progress updates, praise, concerns or meeting requests. 1 credit."
              : "Enter a student's details and AI writes a personalised report comment in your chosen tone. 1 credit."}
          </p>
        </div>
        {/* Mode toggle */}
        <div style={{ display: "flex", borderRadius: "10px", border: `1px solid ${N_BORDER_MED}`, overflow: "hidden", flexShrink: 0 }}>
          {(["report", "email"] as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => switchMode(m)}
              style={{ padding: "7px 18px", border: "none", cursor: "pointer", fontFamily: N_FONT, fontSize: "13px", fontWeight: 600,
                background: mode === m ? ACCENT : T_SURFACE2,
                color: mode === m ? "white" : N_MUTED,
                transition: "all 0.15s",
              }}>
              {m === "report" ? "📝 Report Comment" : "✉️ Parent Email"}
            </button>
          ))}
        </div>
      </div>

      {/* Shared fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        <Field label="Student name *" value={studentName} onChange={setStudentName} placeholder="e.g. Sarah" />
        <Field label="Subject" value={subject} onChange={setSubject} placeholder="e.g. English" />
        <Field label="Year Group" value={yearGroup} onChange={setYearGroup} placeholder="e.g. Year 10" />
      </div>

      {/* Report-only fields */}
      {!isEmail && (<>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <SelectField label="Current grade" value={currentGrade} onChange={setCurrentGrade} options={GRADES} />
          <SelectField label="Target grade" value={targetGrade} onChange={setTargetGrade} options={GRADES} />
          <Field label="Behaviour / attitude" value={behaviour} onChange={setBehaviour} placeholder="e.g. enthusiastic, hard-working" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Field label="Key strengths" value={strengths} onChange={setStrengths} placeholder="e.g. strong analytical writing, creative thinking" />
          <Field label="Areas for improvement" value={improvements} onChange={setImprovements} placeholder="e.g. needs to proof-read, timed exam practice" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <SelectField label="Tone" value={tone} onChange={setTone} options={TONES} />
          <SelectField label="Length" value={length} onChange={setLength} options={LENGTHS} />
        </div>
      </>)}

      {/* Email-only fields */}
      {isEmail && (<>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <SelectField label="Email type" value={emailType} onChange={setEmailType} options={EMAIL_TYPES} />
          <Field label="Parent / guardian name" value={parentName} onChange={setParentName} placeholder="e.g. Mrs Johnson (optional)" />
          <Field label="Your name (sign-off)" value={teacherName} onChange={setTeacherName} placeholder="e.g. Mr Smith (optional)" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Field label="Positives to mention" value={strengths} onChange={setStrengths} placeholder="e.g. improved effort, great attitude in class" />
          <Field label={emailType === "Concern" ? "Concern details" : "Context / notes"} value={emailType === "Concern" ? concerns : emailContext} onChange={emailType === "Concern" ? setConcerns : setEmailContext} placeholder="e.g. missed 3 homeworks, grade has dropped" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
          <SelectField label="Tone" value={emailTone} onChange={setEmailTone} options={EMAIL_TONES} />
        </div>
      </>)}

      <button onClick={generate} disabled={loading}
        style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", background: ACCENT, border: "none", color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: N_FONT }}>
        {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "✦"}
        {loading ? (isEmail ? "Writing email…" : "Writing report comment…") : (isEmail ? "Generate Parent Email" : "Generate Report Comment")}
      </button>

      {error && <ErrorBox message={error} />}

      {output && (
        <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: T_SURFACE, overflow: "hidden", boxShadow: T_SHADOW }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>{outputLabel}</p>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>{[subject, yearGroup].filter(Boolean).join(" · ")}</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={exportPDF}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", background: T_SURFACE2, border: `1px solid ${N_BORDER_MED}`, color: N_FG, fontWeight: 600, fontSize: "12px", cursor: "pointer", fontFamily: N_FONT }}>
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
          <div style={{ padding: "20px", fontSize: "14px", color: N_FG, lineHeight: 1.8, fontFamily: isEmail ? "Arial, sans-serif" : "Georgia, 'Times New Roman', serif", whiteSpace: "pre-wrap" }}>
            {output}
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
        style={{ padding: "9px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: T_SURFACE2 }}>
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
