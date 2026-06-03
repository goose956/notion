"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const ta:  React.CSSProperties = { ...inp, resize: "vertical" as const, minHeight: "72px" };

const TONES = ["Professional", "Warm & Friendly", "Concise", "Enthusiastic"] as const;
type Tone = typeof TONES[number];

export function PodcastGuestOutreach({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const podcastName = String(criteria?.["podcast-name"] ?? "").trim();
  const podcastNiche = String(criteria?.["niche"]       ?? "").trim();

  const [guestName,    setGuestName]    = useState("");
  const [guestExpert,  setGuestExpert]  = useState("");
  const [guestWhy,     setGuestWhy]     = useState("");
  const [episodeTopic, setEpisodeTopic] = useState("");
  const [audience,     setAudience]     = useState("");
  const [tone,         setTone]         = useState<Tone>("Professional");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<{ outreach: string; title: string; guestName: string } | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function generate() {
    if (!guestName.trim()) { setError("Enter the guest name first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/podcast-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestName, guestExpert, guestWhy, episodeTopic, audience, tone, podcastName, podcastNiche }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setResult(await res.json() as { outreach: string; title: string; guestName: string });
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
          properties:    { Title: result.title, Type: "Guest Outreach", Episode: result.guestName, Content: result.outreach },
          propertyTypes: { Title: "title", Type: "select", Episode: "rich_text", Content: "rich_text" },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      onRowAdded(documentsDb.notionId, await res.json() as WorkspaceRow);
      setSaveMsg("Saved to Documents");
    } catch { setSaveMsg("Save failed — try again"); }
    finally  { setSaving(false); }
  }

  function copyToClipboard() {
    if (!result) return;
    navigator.clipboard.writeText(result.outreach).catch(() => null);
  }

  const label = (t: string) => <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{t}</label>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "720px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Guest Outreach</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Write a personalised outreach email that gets replies — with subject line, body, and a follow-up template.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div>
          {label("Guest Name *")}
          <input style={inp} value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="e.g. Sarah Johnson" />
        </div>
        <div>
          {label("Guest's Expertise / Role")}
          <input style={inp} value={guestExpert} onChange={(e) => setGuestExpert(e.target.value)} placeholder="e.g. Podcast growth coach, host of Scale Your Show" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Why this guest? What's the connection?")}
          <input style={inp} value={guestWhy} onChange={(e) => setGuestWhy(e.target.value)} placeholder="e.g. I loved your recent post on podcast SEO, your approach aligns perfectly with what my audience needs" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Episode Topic / Angle")}
          <textarea style={ta} value={episodeTopic} onChange={(e) => setEpisodeTopic(e.target.value)} placeholder="e.g. The real reason most podcasts never grow past 100 listeners — and the 3 things that actually move the needle" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Your Audience")}
          <input style={inp} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. Early-stage entrepreneurs and side-hustlers looking to build a content brand" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Tone")}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {TONES.map((t) => (
              <button key={t} onClick={() => setTone(t)}
                style={{ padding: "6px 14px", borderRadius: "20px", border: `1px solid ${tone === t ? ACCENT : N_BORDER_MED}`, background: tone === t ? ACCENT : "white", color: tone === t ? "white" : N_FG, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button onClick={generate} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? "#ede9fe" : ACCENT, color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Writing outreach…</> : "Write Guest Outreach"}
      </button>

      {result && (
        <div style={{ borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>{result.title}</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={copyToClipboard} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Copy</button>
              {documentsDb && (
                <button onClick={save} disabled={saving} style={{ padding: "6px 14px", borderRadius: "7px", border: "none", background: ACCENT, color: "white", fontSize: "12px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : saveMsg ?? "Save to Documents"}
                </button>
              )}
            </div>
          </div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", color: N_FG, lineHeight: "1.8", fontFamily: "Georgia, serif", borderTop: `1px solid ${ACCENT_BORDER}`, paddingTop: "14px" }}>
            {result.outreach}
          </pre>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
