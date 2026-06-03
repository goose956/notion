"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const ta:  React.CSSProperties = { ...inp, resize: "vertical" as const, minHeight: "80px" };

export function PodcastShowNotes({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const podcastName = String(criteria?.["podcast-name"] ?? "").trim();

  const [episodeTitle,    setEpisodeTitle]    = useState("");
  const [episodeNumber,   setEpisodeNumber]   = useState("");
  const [guest,           setGuest]           = useState("");
  const [summary,         setSummary]         = useState("");
  const [keyPoints,       setKeyPoints]       = useState("");
  const [links,           setLinks]           = useState("");
  const [cta,             setCta]             = useState("");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<{ notes: string; title: string; episodeName: string } | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function generate() {
    if (!episodeTitle.trim()) { setError("Enter the episode title first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/podcast-shownotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeTitle, episodeNumber, guest, summary, keyPoints, links, cta, podcastName }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setResult(await res.json() as { notes: string; title: string; episodeName: string });
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
          properties:    { Title: result.title, Type: "Show Notes", Episode: result.episodeName, Content: result.notes },
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
    </style></head><body><h1>${result.title}</h1><pre>${result.notes.replace(/</g, "&lt;")}</pre></body></html>`);
    w.document.close(); w.print();
  }

  function copyToClipboard() {
    if (!result) return;
    navigator.clipboard.writeText(result.notes).catch(() => null);
  }

  const label = (t: string) => <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{t}</label>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "720px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Show Notes Writer</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Generate SEO-optimised show notes ready to paste into your podcast host — summary, timestamps, key takeaways, links and CTA.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Episode Title *")}
          <input style={inp} value={episodeTitle} onChange={(e) => setEpisodeTitle(e.target.value)} placeholder="e.g. Growing a Podcast from 0 to 10k Listeners with Sarah Johnson" />
        </div>
        <div>
          {label("Episode Number")}
          <input style={inp} value={episodeNumber} onChange={(e) => setEpisodeNumber(e.target.value)} placeholder="e.g. 47" />
        </div>
        <div>
          {label("Guest Name (if applicable)")}
          <input style={inp} value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="e.g. Sarah Johnson" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Episode Summary")}
          <textarea style={ta} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Describe what this episode covers in 2–4 sentences" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Key Points / Timestamps")}
          <textarea style={ta} value={keyPoints} onChange={(e) => setKeyPoints(e.target.value)} placeholder="e.g. 00:00 Intro&#10;05:30 Sarah's backstory&#10;12:00 The biggest podcast growth mistakes&#10;28:45 The daily habit that changed everything" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Links to Include")}
          <textarea style={{ ...ta, minHeight: "56px" }} value={links} onChange={(e) => setLinks(e.target.value)} placeholder="e.g. Sarah's website: sarahjohnson.com&#10;Free podcast audit: sarahjohnson.com/audit&#10;Mentioned tool: Riverside.fm" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Call to Action")}
          <input style={inp} value={cta} onChange={(e) => setCta(e.target.value)} placeholder="e.g. Subscribe, leave a 5-star review, join our free community at growthfiles.com/community" />
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button onClick={generate} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? "#ede9fe" : ACCENT, color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Writing show notes…</> : "Generate Show Notes"}
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
            {result.notes}
          </pre>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
