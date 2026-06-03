"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const PERIODS = ["1 week", "2 weeks", "4 weeks", "6 weeks", "8 weeks", "3 months", "6 months"];
const TONES   = [
  { id: "motivational", label: "Motivational" },
  { id: "professional", label: "Professional" },
  { id: "friendly",     label: "Friendly"     },
  { id: "direct",       label: "Direct"       },
] as const;

const inp: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: "7px",
  border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG,
  fontFamily: N_FONT, background: "white", boxSizing: "border-box",
};
const sel: React.CSSProperties = { ...inp, appearance: "none" as const };
const ta: React.CSSProperties  = { ...inp, resize: "vertical" as const, minHeight: "72px" };

export function PTCheckinWriter({
  documentsDb,
  onRowAdded,
}: {
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const [clientName, setClientName] = useState("");
  const [period,     setPeriod]     = useState("4 weeks");
  const [goal,       setGoal]       = useState("");
  const [wins,       setWins]       = useState("");
  const [challenges, setChallenges] = useState("");
  const [nextFocus,  setNextFocus]  = useState("");
  const [tone,       setTone]       = useState<"motivational" | "professional" | "friendly" | "direct">("motivational");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<{ checkin: string; title: string; clientName: string } | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function generate() {
    if (!clientName.trim()) { setError("Enter a client name first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/pt-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, period, goal, wins, challenges, nextFocus, tone }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      const data = await res.json() as { checkin: string; title: string; clientName: string };
      setResult(data);
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
          properties:    { Title: result.title, Type: "Client Check-In", Client: result.clientName, Content: result.checkin },
          propertyTypes: { Title: "title", Type: "select", Client: "rich_text", Content: "rich_text" },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const saved = await res.json() as WorkspaceRow;
      onRowAdded(documentsDb.notionId, saved);
      setSaveMsg("Saved to Documents");
    } catch {
      setSaveMsg("Save failed — try again");
    } finally {
      setSaving(false);
    }
  }

  function exportPdf() {
    if (!result) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${result.title}</title><style>
      body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:0 24px;color:#111;line-height:1.8;}
      h1{font-size:20px;margin-bottom:4px;}
      strong{color:#15803d;}
      pre{white-space:pre-wrap;font-family:inherit;}
    </style></head><body>
      <h1>${result.title}</h1>
      <pre>${result.checkin.replace(/</g, "&lt;")}</pre>
    </body></html>`);
    w.document.close();
    w.print();
  }

  const label = (text: string) => (
    <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{text}</label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "680px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Client Check-In</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Write a professional progress check-in for any client — ready to copy and send.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div>
          {label("Client Name *")}
          <input style={inp} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Mark Davies" />
        </div>
        <div>
          {label("Check-In Period")}
          <select style={sel} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Client's Goal")}
          <input style={inp} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Lose 10kg, run a 5k, build muscle" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Wins This Period")}
          <textarea style={ta} value={wins} onChange={(e) => setWins(e.target.value)} placeholder="What did they achieve? e.g. Hit 3 sessions a week, lost 2kg, improved deadlift by 10kg" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Challenges or Obstacles")}
          <textarea style={ta} value={challenges} onChange={(e) => setChallenges(e.target.value)} placeholder="e.g. Missed two sessions due to work stress, struggling with nutrition on weekends" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Focus for the Next Period")}
          <input style={inp} value={nextFocus} onChange={(e) => setNextFocus(e.target.value)} placeholder="e.g. Consistency, increasing weights, improving diet quality" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Tone")}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {TONES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                style={{ padding: "6px 14px", borderRadius: "20px", border: `1px solid ${tone === t.id ? ACCENT : N_BORDER}`, background: tone === t.id ? ACCENT : "white", color: tone === t.id ? "white" : N_FG, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button
        onClick={generate}
        disabled={loading}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? "#d1fae5" : ACCENT, color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}
      >
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Writing check-in…</> : "Write Client Check-In"}
      </button>

      {result && (
        <div style={{ borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>{result.title}</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={exportPdf} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                Export PDF
              </button>
              {documentsDb && (
                <button onClick={save} disabled={saving} style={{ padding: "6px 14px", borderRadius: "7px", border: "none", background: ACCENT, color: "white", fontSize: "12px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : saveMsg ?? "Save to Documents"}
                </button>
              )}
            </div>
          </div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", color: N_FG, lineHeight: "1.8", fontFamily: "Georgia, serif", borderTop: `1px solid ${ACCENT_BORDER}`, paddingTop: "14px" }}>
            {result.checkin}
          </pre>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
