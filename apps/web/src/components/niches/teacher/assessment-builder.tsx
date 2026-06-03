"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const ASSESSMENT_TYPES = ["Multiple choice quiz", "Short answer questions", "Essay questions", "Exam paper", "Worksheet", "Marking rubric"];

export function TeacherAssessmentBuilder({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const defaultSubject = String(criteria?.["subject"] ?? "").split(",")[0]?.trim() ?? "";
  const curriculum     = String(criteria?.["curriculum"] ?? "England (National Curriculum)").trim();

  const [topic,       setTopic]       = useState("");
  const [subject,     setSubject]     = useState(defaultSubject);
  const [yearGroup,   setYearGroup]   = useState("");
  const [type,        setType]        = useState(ASSESSMENT_TYPES[0]!);
  const [numQ,        setNumQ]        = useState("10");
  const [markScheme,  setMarkScheme]  = useState(true);

  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [assessment, setAssessment] = useState<string | null>(null);
  const [assTitle,   setAssTitle]   = useState("");

  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState<string | null>(null);

  async function generate() {
    if (!topic.trim()) { setError("Please enter a topic."); return; }
    setLoading(true); setError(null); setAssessment(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/teacher-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, subject, yearGroup, type, numQuestions: Number(numQ) || 10, markScheme, curriculum }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      const data = await res.json() as { assessment: string; title: string };
      setAssessment(data.assessment);
      setAssTitle(data.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!assessment || !documentsDb) return;
    setSaving(true); setSaveMsg(null);
    try {
      const properties = { Title: assTitle, Type: "Assessment", Subject: subject || "Other", "Year Group": yearGroup || "", Content: assessment };
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
        setSaveMsg("Assessment saved to Documents");
      }
    } catch {
      setSaveMsg("Save failed — try again");
    } finally {
      setSaving(false);
    }
  }

  function exportPDF() {
    if (!assessment) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${assTitle}</title><style>
      body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#1a1a1a;line-height:1.7;}
      h1{font-size:20px;margin-bottom:4px;}
      .meta{font-size:13px;color:#666;margin-bottom:28px;}
      pre{white-space:pre-wrap;font-family:inherit;font-size:13px;}
      @media print{body{margin:20px;}}
    </style></head><body>
      <h1>${assTitle}</h1>
      <p class="meta">${[subject, yearGroup, type].filter(Boolean).join(" · ")}</p>
      <pre>${assessment.replace(/</g, "&lt;")}</pre>
    </body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: N_FONT }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>Assessment Builder</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
          AI creates a ready-to-use quiz, worksheet, exam paper or rubric — including a mark scheme. 1 credit.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label="Topic *" value={topic} onChange={setTopic} placeholder="e.g. Photosynthesis, The French Revolution, Quadratic equations" />
        <Field label="Subject" value={subject} onChange={setSubject} placeholder="e.g. Biology, History, Maths" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
        <Field label="Year Group" value={yearGroup} onChange={setYearGroup} placeholder="e.g. Year 9" />
        <SelectField label="Assessment type" value={type} onChange={setType} options={ASSESSMENT_TYPES} />
        <Field label="No. of questions" value={numQ} onChange={setNumQ} placeholder="10" />
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>Options</label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: N_FG, cursor: "pointer", marginTop: "10px" }}>
            <input type="checkbox" checked={markScheme} onChange={(e) => setMarkScheme(e.target.checked)} />
            Include mark scheme
          </label>
        </div>
      </div>

      <button onClick={generate} disabled={loading}
        style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", background: ACCENT, border: "none", color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: N_FONT }}>
        {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "✦"}
        {loading ? "Building assessment…" : "Generate Assessment"}
      </button>

      {error && <ErrorBox message={error} />}

      {assessment && (
        <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>{assTitle}</p>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>{[subject, yearGroup, type].filter(Boolean).join(" · ")}</p>
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
          <div style={{ padding: "16px 20px", fontSize: "13px", color: N_FG, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {assessment}
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
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
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
