"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const ta:  React.CSSProperties = { ...inp, resize: "vertical" as const, minHeight: "160px" };

export function PodcastTranscriptSummary({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const _ = criteria;

  const [episodeTitle, setEpisodeTitle] = useState("");
  const [transcript,   setTranscript]   = useState("");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<{ summary: string; title: string; episodeName: string } | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function generate() {
    if (!transcript.trim()) { setError("Paste the episode transcript first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/podcast-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeTitle, transcript }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setResult(await res.json() as { summary: string; title: string; episodeName: string });
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
          properties:    { Title: result.title, Type: "Transcript Summary", Episode: result.episodeName, Content: result.summary },
          propertyTypes: { Title: "title", Type: "select", Episode: "rich_text", Content: "rich_text" },
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
      h1{font-size:22px;}strong{color:#6d28d9;}pre{white-space:pre-wrap;font-family:inherit;}
    </style></head><body><h1>${result.title}</h1><pre>${result.summary.replace(/</g, "&lt;")}</pre></body></html>`);
    w.document.close(); w.print();
  }

  function copyToClipboard() {
    if (!result) return;
    navigator.clipboard.writeText(result.summary).catch(() => null);
  }

  const label = (t: string) => <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{t}</label>;
  const charCount = transcript.length;
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "720px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Transcript Summary</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Paste your episode transcript and get a full summary, key quotes, chapter markers, 3 social media clips and a blog post intro.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          {label("Episode Title (optional)")}
          <input style={inp} value={episodeTitle} onChange={(e) => setEpisodeTitle(e.target.value)} placeholder="e.g. Growing a Podcast from 0 to 10k Listeners" />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            {label("Episode Transcript *")}
            {wordCount > 0 && <span style={{ fontSize: "11px", color: N_MUTED }}>{wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars</span>}
          </div>
          <textarea
            style={{ ...ta, minHeight: "220px" }}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste your full episode transcript here. Works with auto-generated transcripts from Descript, Riverside, Otter.ai, etc. Longer transcripts produce richer outputs."
          />
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: N_MUTED }}>Tip: export a plain-text transcript from your recording tool and paste it here. Speaker labels are fine to include.</p>
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button onClick={generate} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? "#ede9fe" : ACCENT, color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Processing transcript…</> : "Process Transcript"}
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
            {result.summary}
          </pre>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
