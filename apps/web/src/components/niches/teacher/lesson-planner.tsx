"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const DURATIONS   = ["30 minutes", "45 minutes", "1 hour", "1.5 hours", "2 hours"];
const YEAR_GROUPS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13", "Mixed"];

type Mode = "lesson" | "cover";

export function TeacherLessonPlanner({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const defaultSubject   = String(criteria?.["subject"]     ?? "").split(",")[0]?.trim() ?? "";
  const defaultYearGroup = String(criteria?.["year-groups"] ?? "").split(",")[0]?.trim() ?? "";
  const curriculum       = String(criteria?.["curriculum"]  ?? "England (National Curriculum)").trim();

  const [mode,       setMode]       = useState<Mode>("lesson");

  // Shared fields
  const [topic,      setTopic]      = useState("");
  const [subject,    setSubject]    = useState(defaultSubject);
  const [yearGroup,  setYearGroup]  = useState(defaultYearGroup);
  const [duration,   setDuration]   = useState("1 hour");

  // Lesson-only fields
  const [objectives, setObjectives] = useState("");
  const [diff,       setDiff]       = useState(false);

  // Cover-only fields
  const [abilityNote, setAbilityNote] = useState("");

  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [plan,       setPlan]       = useState<string | null>(null);
  const [planTitle,  setPlanTitle]  = useState("");

  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState<string | null>(null);

  function switchMode(m: Mode) {
    setMode(m);
    setPlan(null);
    setError(null);
    setSaveMsg(null);
  }

  async function generate() {
    if (!topic.trim()) { setError("Please enter a topic."); return; }
    setLoading(true); setError(null); setPlan(null); setSaveMsg(null);
    try {
      if (mode === "lesson") {
        const res = await fetch("/api/members/teacher-lesson", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, subject, yearGroup, duration, objectives, curriculum, differentiation: diff }),
        });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
        const data = await res.json() as { plan: string; title: string };
        setPlan(data.plan);
        setPlanTitle(data.title);
      } else {
        const res = await fetch("/api/members/teacher-substitute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, subject, yearGroup, duration, abilityNote, curriculum }),
        });
        if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
        const data = await res.json() as { plan: string; title: string };
        setPlan(data.plan);
        setPlanTitle(data.title);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!plan || !documentsDb) return;
    setSaving(true); setSaveMsg(null);
    try {
      const docType    = mode === "cover" ? "Lesson Plan" : "Lesson Plan";
      const properties = { Title: planTitle, Type: docType, Subject: subject || "Other", "Year Group": yearGroup || "", Content: plan };
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
        setSaveMsg(`${mode === "cover" ? "Cover lesson" : "Lesson plan"} saved to Documents`);
      }
    } catch {
      setSaveMsg("Save failed — try again");
    } finally {
      setSaving(false);
    }
  }

  function exportPDF() {
    if (!plan) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${planTitle}</title><style>
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#1a1a1a;line-height:1.7;}
      h1{font-size:22px;margin-bottom:4px;}
      .meta{font-size:13px;color:#666;margin-bottom:28px;}
      pre{white-space:pre-wrap;font-family:inherit;font-size:14px;}
      @media print{body{margin:20px;}}
    </style></head><body>
      <h1>${planTitle}</h1>
      <p class="meta">${[subject, yearGroup, duration].filter(Boolean).join(" · ")}${mode === "cover" ? " · Cover Lesson" : ""}</p>
      <pre>${plan.replace(/</g, "&lt;")}</pre>
    </body></html>`);
    win.document.close();
    win.print();
  }

  const isCover = mode === "cover";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: N_FONT }}>

      {/* Header + mode toggle */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>
            {isCover ? "Cover Lesson Generator" : "Lesson Planner"}
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
            {isCover
              ? "Generates a self-contained cover lesson a non-specialist substitute can deliver with no preparation. 1 credit."
              : "Give a topic and AI writes a complete, structured lesson plan — starter, main activities, differentiation, plenary and assessment. 1 credit."}
          </p>
        </div>
        <div style={{ display: "flex", borderRadius: "10px", border: `1px solid ${N_BORDER_MED}`, overflow: "hidden", flexShrink: 0 }}>
          {(["lesson", "cover"] as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => switchMode(m)}
              style={{ padding: "7px 18px", border: "none", cursor: "pointer", fontFamily: N_FONT, fontSize: "13px", fontWeight: 600,
                background: mode === m ? ACCENT : "white",
                color:      mode === m ? "white" : N_MUTED,
                transition: "all 0.15s",
              }}>
              {m === "lesson" ? "📋 Lesson Plan" : "🔄 Cover Lesson"}
            </button>
          ))}
        </div>
      </div>

      {/* Topic + subject */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label="Topic *" value={topic} onChange={setTopic} placeholder={isCover ? "e.g. The Water Cycle, Fractions, World War 2" : "e.g. The Water Cycle, Fractions, World War 2"} />
        <Field label="Subject" value={subject} onChange={setSubject} placeholder="e.g. Science, Maths, History" />
      </div>

      {/* Year group + duration + options */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
        <SelectField label="Year Group" value={yearGroup} onChange={setYearGroup} options={["", ...YEAR_GROUPS]} />
        <SelectField label="Duration" value={duration} onChange={setDuration} options={DURATIONS} />
        {!isCover && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>Options</label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: N_FG, cursor: "pointer", marginTop: "10px" }}>
              <input type="checkbox" checked={diff} onChange={(e) => setDiff(e.target.checked)} />
              Include differentiation (SEN / EAL / G&T)
            </label>
          </div>
        )}
        {isCover && (
          <Field label="Class notes (optional)" value={abilityNote} onChange={setAbilityNote} placeholder="e.g. mixed ability, some SEN students" />
        )}
      </div>

      {/* Lesson-only: objectives */}
      {!isCover && (
        <Field label="Learning objectives (optional)" value={objectives} onChange={setObjectives} placeholder="e.g. Students will be able to explain the stages of the water cycle" />
      )}

      <button onClick={generate} disabled={loading}
        style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", background: ACCENT, border: "none", color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: N_FONT }}>
        {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "✦"}
        {loading
          ? (isCover ? "Building cover lesson…" : "Building lesson plan…")
          : (isCover ? "Generate Cover Lesson" : "Generate Lesson Plan")}
      </button>

      {error && <ErrorBox message={error} />}

      {plan && (
        <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>{planTitle}</p>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>{[subject, yearGroup, duration].filter(Boolean).join(" · ")}{isCover ? " · Cover Lesson" : ""}</p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
            {plan}
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
