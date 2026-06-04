"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" as const };
const ta:  React.CSSProperties = { ...inp, resize: "vertical" as const, minHeight: "80px" };

const BUILD_TIMES = ["Weekend hack", "1–2 weeks", "2–4 weeks", "1–2 months", "3+ months"];

export function VibeIdeaScorer({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const builderNiche = String(criteria?.["niche"]         ?? "").trim();
  const stage        = String(criteria?.["stage"]         ?? "").trim();
  const tool         = String(criteria?.["building-with"] ?? "").trim();

  const [idea,         setIdea]         = useState("");
  const [targetUser,   setTargetUser]   = useState("");
  const [buildTime,    setBuildTime]    = useState(BUILD_TIMES[1]!);
  const [monetisation, setMonetisation] = useState("");
  const [competitors,  setCompetitors]  = useState("");
  const [notes,        setNotes]        = useState("");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<{ score: string; title: string; ideaName: string } | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function generate() {
    if (!idea.trim()) { setError("Describe your idea first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/vibe-idea-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, targetUser, buildTime, monetisation, competitors, notes, builderNiche, stage, tool }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setResult(await res.json() as { score: string; title: string; ideaName: string });
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
          properties:    { Title: result.title, Type: "Idea Score", Project: result.ideaName, Content: result.score },
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
    </style></head><body><h1>${result.title}</h1><pre>${result.score.replace(/</g, "&lt;")}</pre></body></html>`);
    w.document.close(); w.print();
  }

  function copyToClipboard() {
    if (!result) return;
    navigator.clipboard.writeText(result.score).catch(() => null);
  }

  const label = (t: string) => <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{t}</label>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "720px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Idea Scorer</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Get an honest, scored verdict on any idea before you spend a week building it — market demand, build complexity, monetisation potential and a clear 🚀 BUILD IT / ⚠️ VALIDATE FIRST / 🚫 SKIP decision.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("The Idea *")}
          <textarea style={ta} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="Describe your idea clearly — what it does, what problem it solves, and who it's for. The more specific, the better the score." />
        </div>
        <div>
          {label("Target User")}
          <input style={inp} value={targetUser} onChange={(e) => setTargetUser(e.target.value)} placeholder="e.g. Freelance designers who hate invoicing" />
        </div>
        <div>
          {label("Estimated Build Time")}
          <select style={sel} value={buildTime} onChange={(e) => setBuildTime(e.target.value)}>
            {BUILD_TIMES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          {label("Monetisation Plan")}
          <input style={inp} value={monetisation} onChange={(e) => setMonetisation(e.target.value)} placeholder="e.g. $9/month subscription, one-time $29, free + paid tier" />
        </div>
        <div>
          {label("Known Competitors")}
          <input style={inp} value={competitors} onChange={(e) => setCompetitors(e.target.value)} placeholder="e.g. Notion, Linear, similar tools you'd be competing with" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Additional Context")}
          <input style={inp} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. I have an existing audience, this scratches my own itch, I already have 3 people interested" />
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button onClick={generate} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? "#f7fee7" : ACCENT, color: loading ? "#65a30d" : "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Scoring idea…</> : "Score This Idea"}
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
            {result.score}
          </pre>
        </div>
      )}

      <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
        <p style={{ margin: 0, fontSize: "12px", color: "#166534" }}>💡 After scoring, save the result and update the idea's status in your Idea Bank to <strong>Validated</strong> when you decide to pursue it.</p>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
