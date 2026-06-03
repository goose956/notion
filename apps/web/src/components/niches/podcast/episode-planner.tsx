"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" as const };
const ta:  React.CSSProperties = { ...inp, resize: "vertical" as const, minHeight: "72px" };

const FORMATS = ["Interview", "Solo", "Co-hosted", "Narrative / Storytelling"];

export function PodcastEpisodePlanner({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const defaultFormat = String(criteria?.["format"] ?? "").trim();
  const defaultNiche  = String(criteria?.["niche"]  ?? "").trim();

  const [topic,       setTopic]       = useState("");
  const [guest,       setGuest]       = useState("");
  const [guestBio,    setGuestBio]    = useState("");
  const [format,      setFormat]      = useState(defaultFormat || FORMATS[0]!);
  const [length,      setLength]      = useState(String(criteria?.["episode-length"] ?? "20–45 mins").trim());
  const [angle,       setAngle]       = useState("");
  const [notes,       setNotes]       = useState("");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<{ plan: string; title: string; episodeTopic: string } | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const isInterview = format.toLowerCase().includes("interview");

  async function generate() {
    if (!topic.trim()) { setError("Enter the episode topic first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/podcast-episode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, guest, guestBio, format, length, angle, notes, podcastNiche: defaultNiche }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setResult(await res.json() as { plan: string; title: string; episodeTopic: string });
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
          properties:    { Title: result.title, Type: "Episode Plan", Episode: result.episodeTopic, Content: result.plan },
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
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Episode Planner</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Generate a complete episode plan — hook, intro, segments, talking points, interview questions and outro.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Episode Topic *")}
          <input style={inp} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. How to grow a podcast from 0 to 10k listeners in 12 months" />
        </div>
        <div>
          {label("Format")}
          <select style={sel} value={format} onChange={(e) => setFormat(e.target.value)}>
            {FORMATS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          {label("Episode Length")}
          <select style={sel} value={length} onChange={(e) => setLength(e.target.value)}>
            {["Under 20 mins", "20–45 mins", "45–60 mins", "60+ mins"].map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        {isInterview && (
          <>
            <div>
              {label("Guest Name")}
              <input style={inp} value={guest} onChange={(e) => setGuest(e.target.value)} placeholder="e.g. Sarah Johnson" />
            </div>
            <div>
              {label("Guest Background / Bio")}
              <input style={inp} value={guestBio} onChange={(e) => setGuestBio(e.target.value)} placeholder="e.g. Podcast growth coach, host of 'Scale Your Show', 8 years in audio" />
            </div>
          </>
        )}
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Angle / Hook Idea (optional)")}
          <input style={inp} value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="e.g. Contrarian take — most growth advice is wrong, here's what actually works" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Additional Notes")}
          <textarea style={ta} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Mention our sponsor mid-roll, end with listener Q&A, tie in last week's episode" />
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button onClick={generate} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? "#ede9fe" : ACCENT, color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Planning episode…</> : "Plan This Episode"}
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
