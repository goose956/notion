"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const CHANNELS = [
  { id: "email",     label: "Cold Email",    emoji: "📧" },
  { id: "linkedin",  label: "LinkedIn",      emoji: "💼" },
  { id: "instagram", label: "Instagram DM",  emoji: "📸" },
  { id: "twitter",   label: "Twitter/X DM",  emoji: "🐦" },
] as const;

const TONES = [
  { id: "professional", label: "Professional" },
  { id: "friendly",     label: "Friendly"     },
  { id: "bold",         label: "Bold"         },
  { id: "concise",      label: "Concise"      },
] as const;

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };

type Channel = typeof CHANNELS[number]["id"];
type Tone    = typeof TONES[number]["id"];

export function FreelancerOutreachWriter({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const yourName    = String(criteria?.["your-name"] ?? "").trim();
  const yourService = String(criteria?.["service"]   ?? "").trim();

  const [prospectName,    setProspectName]    = useState("");
  const [prospectCompany, setProspectCompany] = useState("");
  const [industry,        setIndustry]        = useState("");
  const [pain,            setPain]            = useState("");
  const [channel,         setChannel]         = useState<Channel>("email");
  const [tone,            setTone]            = useState<Tone>("professional");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<{ outreach: string; title: string; clientName: string } | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function generate() {
    if (!prospectName.trim()) { setError("Enter a prospect name first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/freelancer-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectName, prospectCompany, industry, pain, channel, yourName, yourService, tone, country: String(criteria?.["country"] ?? "") }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setResult(await res.json() as { outreach: string; title: string; clientName: string });
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
          properties:    { Title: result.title, Type: "Outreach", Client: result.clientName, Content: result.outreach },
          propertyTypes: { Title: "title", Type: "select", Client: "rich_text", Content: "rich_text" },
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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "680px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Outreach Writer</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>AI writes cold outreach that sounds human — not spammy. Pick your channel, tone, and go.</p>
      </div>

      {/* Channel selector */}
      <div>
        {label("Channel")}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {CHANNELS.map((c) => (
            <button key={c.id} onClick={() => setChannel(c.id)}
              style={{ padding: "7px 14px", borderRadius: "8px", border: `1px solid ${channel === c.id ? ACCENT : "#e5e7eb"}`, background: channel === c.id ? ACCENT : "white", color: channel === c.id ? "white" : N_FG, fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div>
          {label("Prospect Name *")}
          <input style={inp} value={prospectName} onChange={(e) => setProspectName(e.target.value)} placeholder="e.g. Sarah Chen" />
        </div>
        <div>
          {label("Company")}
          <input style={inp} value={prospectCompany} onChange={(e) => setProspectCompany(e.target.value)} placeholder="e.g. Bloom Agency" />
        </div>
        <div>
          {label("Industry")}
          <input style={inp} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. E-commerce, SaaS, Hospitality" />
        </div>
        <div>
          {label("Angle / Problem to Address")}
          <input style={inp} value={pain} onChange={(e) => setPain(e.target.value)} placeholder="e.g. Their website looks outdated, missing SEO" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Tone")}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {TONES.map((t) => (
              <button key={t.id} onClick={() => setTone(t.id)}
                style={{ padding: "6px 14px", borderRadius: "20px", border: `1px solid ${tone === t.id ? ACCENT : "#e5e7eb"}`, background: tone === t.id ? ACCENT : "white", color: tone === t.id ? "white" : N_FG, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button onClick={generate} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? "#e0e7ff" : ACCENT, color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Writing outreach…</> : "Write Outreach Message"}
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
