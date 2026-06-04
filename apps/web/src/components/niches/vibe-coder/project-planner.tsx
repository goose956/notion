"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" as const };
const ta:  React.CSSProperties = { ...inp, resize: "vertical" as const, minHeight: "80px" };

const TIMELINES = ["1 week", "2 weeks", "1 month", "2 months", "3 months"];

export function VibeProjectPlanner({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const tool  = String(criteria?.["building-with"] ?? "").trim();
  const stage = String(criteria?.["stage"]         ?? "").trim();

  const [projectName, setProjectName] = useState("");
  const [idea,        setIdea]        = useState("");
  const [stack,       setStack]       = useState("");
  const [timeline,    setTimeline]    = useState(TIMELINES[2]!);
  const [mvpGoal,     setMvpGoal]     = useState("");
  const [targetUser,  setTargetUser]  = useState("");
  const [notes,       setNotes]       = useState("");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<{ plan: string; title: string; projectName: string } | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function generate() {
    if (!projectName.trim() || !idea.trim()) { setError("Enter the project name and idea description first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/vibe-project-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, idea, stack, timeline, mvpGoal, targetUser, notes, tool, stage }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setResult(await res.json() as { plan: string; title: string; projectName: string });
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
          properties:    { Title: result.title, Type: "Project Plan", Project: result.projectName, Content: result.plan },
          propertyTypes: { Title: "title", Type: "select", Project: "rich_text", Content: "rich_text" },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      onRowAdded(documentsDb.notionId, await res.json() as WorkspaceRow);
      setSaveMsg("Saved to Documents");
    } catch { setSaveMsg("Save failed — try again"); }
    finally  { setSaving(false); }
  }

  function exportPdf() {
    if (!result) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${result.title}</title><style>
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#111;line-height:1.8;}
      h1{font-size:22px;}strong{color:#65a30d;}pre{white-space:pre-wrap;font-family:inherit;}
    </style></head><body><h1>${result.title}</h1><pre>${result.plan.replace(/</g, "&lt;")}</pre></body></html>`);
    w.document.close(); w.print();
  }

  function copyToClipboard() {
    if (!result) return;
    navigator.clipboard.writeText(result.plan).catch(() => null);
  }

  const label = (t: string) => <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{t}</label>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "720px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Project Planner</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Turn a validated idea into a full build plan — recommended stack, scoped MVP, sprint breakdown and launch checklist.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div>
          {label("Project Name *")}
          <input style={inp} value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. InvoiceZap" />
        </div>
        <div>
          {label("Build Timeline")}
          <select style={sel} value={timeline} onChange={(e) => setTimeline(e.target.value)}>
            {TIMELINES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("What Does It Do? *")}
          <textarea style={ta} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. A Notion-based invoice generator for freelancers. User fills in client details, line items, and gets a branded PDF invoice with one click. No account required." />
        </div>
        <div>
          {label("Target User")}
          <input style={inp} value={targetUser} onChange={(e) => setTargetUser(e.target.value)} placeholder="e.g. Solo freelancers, designers, developers" />
        </div>
        <div>
          {label("Preferred Stack (leave blank for AI to suggest)")}
          <input style={inp} value={stack} onChange={(e) => setStack(e.target.value)} placeholder={`e.g. Next.js, Supabase, Tailwind${tool ? ` built with ${tool}` : ""}`} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("What Does a Working MVP Look Like?")}
          <input style={inp} value={mvpGoal} onChange={(e) => setMvpGoal(e.target.value)} placeholder="e.g. A user can fill in a form, generate an invoice PDF, and share a link — no auth required for v1" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Constraints / Additional Notes")}
          <input style={inp} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Solo builder, no budget for paid APIs, needs to work on mobile" />
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button onClick={generate} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? "#f7fee7" : ACCENT, color: loading ? "#65a30d" : "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Building your plan…</> : "Generate Project Plan"}
      </button>

      {result && (
        <div style={{ borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>{result.title}</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={copyToClipboard} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Copy</button>
              <button onClick={exportPdf} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>PDF</button>
              {documentsDb && (
                <button onClick={save} disabled={saving} style={{ padding: "6px 14px", borderRadius: "7px", border: "none", background: ACCENT, color: "white", fontSize: "12px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : saveMsg ?? "Save to Documents"}
                </button>
              )}
            </div>
          </div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", color: N_FG, lineHeight: "1.8", fontFamily: "Georgia, serif", borderTop: `1px solid ${ACCENT_BORDER}`, paddingTop: "14px" }}>
            {result.plan}
          </pre>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
