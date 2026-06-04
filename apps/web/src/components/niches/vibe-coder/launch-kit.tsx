"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const ta:  React.CSSProperties = { ...inp, resize: "vertical" as const, minHeight: "72px" };

type Platform = "Product Hunt" | "Hacker News" | "Twitter/X" | "Reddit" | "LinkedIn";
const ALL_PLATFORMS: Platform[] = ["Product Hunt", "Hacker News", "Twitter/X", "Reddit", "LinkedIn"];
const PLATFORM_EMOJI: Record<Platform, string> = {
  "Product Hunt": "🐱",
  "Hacker News":  "🟠",
  "Twitter/X":    "🐦",
  "Reddit":       "🤖",
  "LinkedIn":     "💼",
};

export function VibeLaunchKit({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const _ = criteria;

  const [projectName,  setProjectName]  = useState("");
  const [tagline,      setTagline]      = useState("");
  const [whatItDoes,   setWhatItDoes]   = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [uniqueAngle,  setUniqueAngle]  = useState("");
  const [pricing,      setPricing]      = useState("");
  const [platforms,    setPlatforms]    = useState<Platform[]>(["Product Hunt", "Hacker News", "Twitter/X"]);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<{ kit: string; title: string; projectName: string } | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  function togglePlatform(p: Platform) {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  async function generate() {
    if (!projectName.trim() || !whatItDoes.trim()) { setError("Enter the project name and what it does first."); return; }
    if (platforms.length === 0) { setError("Select at least one platform."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/vibe-launch-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, tagline, whatItDoes, targetAudience, uniqueAngle, pricing, platforms }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setResult(await res.json() as { kit: string; title: string; projectName: string });
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
          properties:    { Title: result.title, Type: "Launch Kit", Project: result.projectName, Content: result.kit },
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
    </style></head><body><h1>${result.title}</h1><pre>${result.kit.replace(/</g, "&lt;")}</pre></body></html>`);
    w.document.close(); w.print();
  }

  function copyToClipboard() {
    if (!result) return;
    navigator.clipboard.writeText(result.kit).catch(() => null);
  }

  const label = (t: string) => <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{t}</label>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "720px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Launch Kit</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Generate a complete launch package — Product Hunt post, Show HN, Twitter/X thread, Reddit post and LinkedIn — ready to fire on launch day.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div>
          {label("Project Name *")}
          <input style={inp} value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. InvoiceZap" />
        </div>
        <div>
          {label("One-line Tagline")}
          <input style={inp} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Invoices in 30 seconds, no account needed" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("What Does It Do? *")}
          <textarea style={ta} value={whatItDoes} onChange={(e) => setWhatItDoes(e.target.value)} placeholder="Explain clearly what it does, the problem it solves and how it works — as if explaining to a friend." />
        </div>
        <div>
          {label("Target Audience")}
          <input style={inp} value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g. Solo freelancers who hate admin" />
        </div>
        <div>
          {label("Pricing")}
          <input style={inp} value={pricing} onChange={(e) => setPricing(e.target.value)} placeholder="e.g. Free tier + $9/month Pro, or free forever" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Unique Angle / Why Now?")}
          <input style={inp} value={uniqueAngle} onChange={(e) => setUniqueAngle(e.target.value)} placeholder="e.g. Built with Claude Code in 3 days, no login required, works in any browser" />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          {label("Platforms")}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {ALL_PLATFORMS.map((p) => {
              const active = platforms.includes(p);
              return (
                <button key={p} onClick={() => togglePlatform(p)}
                  style={{ padding: "6px 14px", borderRadius: "20px", border: `1px solid ${active ? ACCENT : N_BORDER_MED}`, background: active ? ACCENT : "white", color: active ? "white" : N_FG, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                  {PLATFORM_EMOJI[p]} {p}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button onClick={generate} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? "#f7fee7" : ACCENT, color: loading ? "#65a30d" : "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Generating launch kit…</> : "Generate Launch Kit"}
      </button>

      {result && (
        <div style={{ borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>{result.title}</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={copyToClipboard} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Copy All</button>
              <button onClick={exportPdf} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>PDF</button>
              {documentsDb && (
                <button onClick={save} disabled={saving} style={{ padding: "6px 14px", borderRadius: "7px", border: "none", background: ACCENT, color: "white", fontSize: "12px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : saveMsg ?? "Save to Documents"}
                </button>
              )}
            </div>
          </div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", color: N_FG, lineHeight: "1.8", fontFamily: "Georgia, serif", borderTop: `1px solid ${ACCENT_BORDER}`, paddingTop: "14px" }}>
            {result.kit}
          </pre>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
