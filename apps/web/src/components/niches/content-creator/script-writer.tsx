"use client";
import { useState } from "react";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { asText, ACCENT, ACCENT_LIGHT, ACCENT_BORDER } from "./utils";

const N_FG     = "#111827";
const N_MUTED  = "#6b7280";
const N_BORDER = "#e5e7eb";

export function CCScriptWriter({
  criteria,
  scriptsDb,
  onRowAdded,
}: {
  criteria:   Record<string, unknown> | null;
  scriptsDb:  WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const creatorName     = asText(criteria?.["creator-name"]) || "My Channel";
  const defaultPlatform = asText(criteria?.["primary-platform"]) || "YouTube";
  const defaultNiche    = asText(criteria?.["niche"]) || "";

  const [platform,     setPlatform]     = useState(defaultPlatform);
  const [title,        setTitle]        = useState("");
  const [keyPoints,    setKeyPoints]    = useState("");
  const [tone,         setTone]         = useState("conversational");
  const [targetLength, setTargetLength] = useState("medium");

  const [script,  setScript]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [saved,   setSaved]   = useState(false);

  const PLATFORMS = ["YouTube", "TikTok", "Instagram", "Twitter/X", "Blog", "Podcast"];
  const TONES     = ["conversational", "educational", "entertaining", "inspirational", "professional", "humorous"];

  async function generate() {
    if (!title.trim()) { setError("Enter a topic or title."); return; }
    setLoading(true); setError(""); setScript(""); setSaved(false);
    try {
      const res = await fetch("/api/members/cc-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorName,
          platform,
          niche: defaultNiche,
          title: title.trim(),
          keyPoints: keyPoints.trim(),
          tone,
          targetLength,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setScript(data.script ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveToNotion() {
    if (!scriptsDb || !script) return;
    setSaved(false);
    const scriptType = platform === "YouTube" ? "Full Script" :
                       platform === "Twitter/X" ? "Thread" :
                       platform === "Blog" ? "Outline" :
                       platform === "Podcast" ? "Full Script" :
                       "Caption";
    const properties: Record<string, string | number | boolean | null> = {
      "Title":    title,
      "Platform": platform,
      "Type":     scriptType,
      "Content":  script,
      "Status":   "Draft",
    };
    const propertyTypes: Record<string, string> = {
      "Title": "title", "Platform": "select", "Type": "select",
      "Content": "rich_text", "Status": "select",
    };
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: scriptsDb.notionId, properties, propertyTypes }),
      });
      if (res.ok) {
        const data = await res.json() as { pageId?: string };
        if (data.pageId) { onRowAdded(scriptsDb.notionId, { pageId: data.pageId, properties }); }
        setSaved(true);
      }
    } catch { /* silently fail */ }
  }

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: N_FG, margin: "0 0 4px 0" }}>✍️ Script Writer</h2>
        <p style={{ fontSize: "13px", color: N_MUTED, margin: 0 }}>
          AI writes full scripts, threads, outlines and show notes — formatted for each platform.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "16px" }}>
        {/* Platform */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, background: "white", outline: "none", boxSizing: "border-box" }}
          >
            {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>

        {/* Tone */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, background: "white", outline: "none", boxSizing: "border-box" }}
          >
            {TONES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* Length */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Length</label>
          <select
            value={targetLength}
            onChange={(e) => setTargetLength(e.target.value)}
            style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, background: "white", outline: "none", boxSizing: "border-box" }}
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>

        {/* Title */}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>
            Topic / Title <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. How I paid off £30k debt in 2 years — 5 things I stopped buying"
            style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Key points */}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Key Points to Cover (optional)</label>
          <textarea
            value={keyPoints}
            onChange={(e) => setKeyPoints(e.target.value)}
            placeholder="e.g. cut subscriptions, meal prepped, stopped buying coffee, sold stuff on eBay, got a side hustle..."
            rows={3}
            style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, resize: "vertical", outline: "none", boxSizing: "border-box" }}
          />
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", fontSize: "13px", color: "#dc2626" }}>
          {error}
        </div>
      )}

      <button
        onClick={generate}
        disabled={loading}
        style={{
          background: loading ? "#d1d5db" : ACCENT,
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "10px 22px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: "24px",
        }}
      >
        {loading ? "Writing script…" : `✨ Write ${platform} Script (1 credit)`}
      </button>

      {script && (
        <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: N_FG, margin: 0 }}>
              {platform} Script — {title}
            </h3>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={() => navigator.clipboard?.writeText(script)}
                style={{ background: "transparent", color: ACCENT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: "7px", padding: "5px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                📋 Copy
              </button>
              <button
                onClick={saveToNotion}
                disabled={!scriptsDb}
                style={{ background: scriptsDb ? ACCENT : "#d1d5db", color: "white", border: "none", borderRadius: "7px", padding: "5px 12px", fontSize: "12px", fontWeight: 600, cursor: scriptsDb ? "pointer" : "not-allowed" }}
              >
                💾 Save
              </button>
              {saved && <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>✓ Saved!</span>}
            </div>
          </div>

          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={24}
            style={{
              width: "100%",
              border: `1px solid ${ACCENT_BORDER}`,
              borderRadius: "8px",
              padding: "12px 14px",
              fontSize: "13px",
              color: N_FG,
              background: ACCENT_LIGHT,
              resize: "vertical",
              outline: "none",
              fontFamily: "inherit",
              lineHeight: "1.6",
              boxSizing: "border-box",
            }}
          />

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button
              onClick={generate}
              disabled={loading}
              style={{ background: "transparent", color: ACCENT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: "8px", padding: "8px 16px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
            >
              🔄 Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
