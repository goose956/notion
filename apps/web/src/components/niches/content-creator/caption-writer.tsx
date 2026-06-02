"use client";
import { useState } from "react";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { asText, ACCENT, ACCENT_LIGHT, ACCENT_BORDER } from "./utils";

const N_FG     = "#111827";
const N_MUTED  = "#6b7280";
const N_BORDER = "#e5e7eb";
const N_BG     = "#f9fafb";

interface CaptionResult { caption: string; hook: string; cta: string; hashtags: string[] }

export function CCCaptionWriter({
  criteria,
  scriptsDb,
  onRowAdded,
}: {
  criteria:   Record<string, unknown> | null;
  scriptsDb:  WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const creatorName     = asText(criteria?.["creator-name"]) || "My Channel";
  const defaultPlatform = asText(criteria?.["primary-platform"]) || "Instagram";
  const defaultNiche    = asText(criteria?.["niche"]) || "";

  const [platform,    setPlatform]    = useState(defaultPlatform);
  const [topic,       setTopic]       = useState("");
  const [keyMessage,  setKeyMessage]  = useState("");
  const [tone,        setTone]        = useState("conversational");
  const [includeHook, setIncludeHook] = useState(true);
  const [includeCTA,  setIncludeCTA]  = useState(true);

  const [result,  setResult]  = useState<CaptionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [saved,   setSaved]   = useState(false);

  // Editable fields
  const [editCaption,  setEditCaption]  = useState("");
  const [editHashtags, setEditHashtags] = useState("");

  const PLATFORMS = ["Instagram", "TikTok", "Twitter/X", "YouTube", "LinkedIn", "Blog"];
  const TONES     = ["conversational", "educational", "entertaining", "inspirational", "professional", "humorous"];

  async function generate() {
    if (!topic.trim()) { setError("Enter a topic."); return; }
    setLoading(true); setError(""); setResult(null); setSaved(false);
    try {
      const res = await fetch("/api/members/cc-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorName,
          platform,
          niche: defaultNiche,
          topic: topic.trim(),
          keyMessage: keyMessage.trim(),
          tone,
          includeHook,
          includeCTA,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data);
      setEditCaption(data.caption ?? "");
      setEditHashtags((data.hashtags ?? []).map((h: string) => `#${h}`).join(" "));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveToNotion() {
    if (!scriptsDb || !result) return;
    setSaved(false);
    const fullCaption = editCaption + (editHashtags ? "\n\n" + editHashtags : "");
    const properties: Record<string, string | number | boolean | null> = {
      "Title":    topic,
      "Platform": platform,
      "Type":     "Caption",
      "Content":  fullCaption,
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

  const hashtagList = editHashtags.split(/[\s,]+/).filter((h) => h.startsWith("#")).slice(0, 30);

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: N_FG, margin: "0 0 4px 0" }}>🖊️ Caption Writer</h2>
        <p style={{ fontSize: "13px", color: N_MUTED, margin: 0 }}>
          AI writes platform-optimised captions, hooks and hashtags for any piece of content.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
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

        {/* Topic */}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>
            Content Topic <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. 5 free tools I use every day to stay productive"
            style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Key message */}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Key Message / Angle (optional)</label>
          <input
            value={keyMessage}
            onChange={(e) => setKeyMessage(e.target.value)}
            placeholder="What's the main takeaway or angle you want to lead with?"
            style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: N_FG }}>
            <input type="checkbox" checked={includeHook} onChange={(e) => setIncludeHook(e.target.checked)} />
            Include hook
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: N_FG }}>
            <input type="checkbox" checked={includeCTA} onChange={(e) => setIncludeCTA(e.target.checked)} />
            Include CTA
          </label>
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
        {loading ? "Writing caption…" : "✨ Generate Caption (1 credit)"}
      </button>

      {result && (
        <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: N_FG, margin: "0 0 16px 0" }}>
            {platform} Caption
          </h3>

          {/* Hook callout */}
          {result.hook && (
            <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#3730a3", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>Hook</p>
              <p style={{ fontSize: "13px", color: N_FG, margin: 0, fontStyle: "italic" }}>"{result.hook}"</p>
            </div>
          )}

          {/* Caption */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Caption</label>
            <textarea
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
              rows={8}
              style={{ width: "100%", border: `1px solid ${ACCENT_BORDER}`, borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: N_FG, resize: "vertical", outline: "none", background: ACCENT_LIGHT, boxSizing: "border-box", lineHeight: "1.6", fontFamily: "inherit" }}
            />
          </div>

          {/* CTA */}
          {result.cta && (
            <div style={{ background: N_BG, border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "10px 14px", marginBottom: "14px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>Call to Action</p>
              <p style={{ fontSize: "13px", color: N_FG, margin: 0 }}>{result.cta}</p>
            </div>
          )}

          {/* Hashtags */}
          {hashtagList.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px" }}>
                Hashtags ({hashtagList.length})
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                {hashtagList.map((tag, i) => (
                  <span key={i} style={{ background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: "20px", padding: "2px 10px", fontSize: "11px", color: ACCENT, fontWeight: 500 }}>
                    {tag}
                  </span>
                ))}
              </div>
              <input
                value={editHashtags}
                onChange={(e) => setEditHashtags(e.target.value)}
                placeholder="Edit hashtags..."
                style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: N_FG, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => {
                const full = editCaption + (editHashtags ? "\n\n" + editHashtags : "");
                navigator.clipboard?.writeText(full);
              }}
              style={{ background: "transparent", color: ACCENT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: "8px", padding: "8px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
            >
              📋 Copy All
            </button>
            <button
              onClick={saveToNotion}
              disabled={!scriptsDb}
              style={{ background: scriptsDb ? ACCENT : "#d1d5db", color: "white", border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "12px", fontWeight: 600, cursor: scriptsDb ? "pointer" : "not-allowed" }}
            >
              💾 Save to Scripts
            </button>
            <button
              onClick={generate}
              disabled={loading}
              style={{ background: "transparent", color: ACCENT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: "8px", padding: "8px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
            >
              🔄 Regenerate
            </button>
            {saved && <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>✓ Saved!</span>}
          </div>
        </div>
      )}
    </div>
  );
}
