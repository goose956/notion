"use client";
import { useState } from "react";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { asText, ACCENT, ACCENT_LIGHT, ACCENT_BORDER, PLATFORM_EMOJI } from "./utils";

const N_FG     = "#111827";
const N_MUTED  = "#6b7280";
const N_BORDER = "#e5e7eb";
const N_BG     = "#f9fafb";

const ANGLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  "curiosity-gap":   { label: "🪤 Curiosity gap",    color: "#7c3aed", bg: "rgba(124,58,237,0.09)" },
  "how-to":          { label: "🔧 How-to",            color: "#1d4ed8", bg: "rgba(29,78,216,0.09)" },
  "personal-story":  { label: "💬 Personal story",    color: "#b45309", bg: "rgba(180,83,9,0.09)" },
  "list":            { label: "📋 List",               color: "#065f46", bg: "rgba(6,95,70,0.09)" },
  "controversy":     { label: "🔥 Controversy",       color: "#991b1b", bg: "rgba(153,27,27,0.09)" },
  "trend":           { label: "📈 Trending",          color: "#0369a1", bg: "rgba(3,105,161,0.09)" },
  "challenge":       { label: "⚡ Challenge",         color: "#7e22ce", bg: "rgba(126,34,206,0.09)" },
};

interface Idea { title: string; hook: string; format: string; angle: string }

export function CCIdeaGenerator({
  criteria,
  ideasDb,
  onRowAdded,
}: {
  criteria:  Record<string, unknown> | null;
  ideasDb:   WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const creatorName = asText(criteria?.["creator-name"]) || "My Channel";
  const defaultPlatform = asText(criteria?.["primary-platform"]) || "YouTube";
  const defaultNiche    = asText(criteria?.["niche"]) || "";
  const goal            = asText(criteria?.["content-goal"]) || "";

  const [platform,     setPlatform]     = useState(defaultPlatform);
  const [niche,        setNiche]        = useState(defaultNiche);
  const [trendKeyword, setTrendKeyword] = useState("");
  const [count,        setCount]        = useState("10");

  const [ideas,   setIdeas]   = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [saved,   setSaved]   = useState<Set<number>>(new Set());
  const [saving,  setSaving]  = useState<number | null>(null);

  const PLATFORMS = ["YouTube", "TikTok", "Instagram", "Twitter/X", "Blog", "Podcast", "Any"];

  async function generate() {
    if (!niche.trim()) { setError("Enter your content niche."); return; }
    setLoading(true); setError(""); setIdeas([]); setSaved(new Set());
    try {
      const res = await fetch("/api/members/cc-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorName,
          platform: platform === "Any" ? "" : platform,
          niche: niche.trim(),
          goal,
          trendKeyword: trendKeyword.trim(),
          count: parseInt(count) || 10,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setIdeas(data.ideas ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveIdea(idea: Idea, index: number) {
    if (!ideasDb) return;
    setSaving(index);
    const properties: Record<string, string | number | boolean | null> = {
      "Idea":     idea.title,
      "Platform": platform === "Any" ? "Any" : platform,
      "Format":   idea.format || "Short-form",
      "Hook":     idea.hook,
      "Priority": "High",
      "Status":   "New",
    };
    const propertyTypes: Record<string, string> = {
      "Idea": "title", "Platform": "select", "Format": "select",
      "Hook": "rich_text", "Priority": "select", "Status": "select",
    };
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: ideasDb.notionId, properties, propertyTypes }),
      });
      if (res.ok) {
        const data = await res.json() as { pageId?: string };
        if (data.pageId) { onRowAdded(ideasDb.notionId, { pageId: data.pageId, properties }); }
        setSaved((prev) => new Set([...prev, index]));
      }
    } catch { /* silently fail */ }
    finally { setSaving(null); }
  }

  async function saveAll() {
    if (!ideasDb) return;
    for (let i = 0; i < ideas.length; i++) {
      if (!saved.has(i)) {
        await saveIdea(ideas[i]!, i);
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: N_FG, margin: "0 0 4px 0" }}>💡 Idea Generator</h2>
        <p style={{ fontSize: "13px", color: N_MUTED, margin: 0 }}>
          AI generates high-performing content ideas with hooks, angles and format suggestions.
        </p>
      </div>

      <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", marginBottom: "14px" }}>
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

          {/* Count */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>How many ideas?</label>
            <select
              value={count}
              onChange={(e) => setCount(e.target.value)}
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, background: "white", outline: "none", boxSizing: "border-box" }}
            >
              {["5","10","15","20"].map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>

          {/* Trend keyword */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Trend / Angle (optional)</label>
            <input
              value={trendKeyword}
              onChange={(e) => setTrendKeyword(e.target.value)}
              placeholder="e.g. quiet quitting, AI tools, viral trend..."
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Niche */}
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>
              Your Niche <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. personal finance for millennials, budget travel, plant-based cooking..."
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#dc2626" }}>
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
          }}
        >
          {loading ? "Generating ideas…" : `✨ Generate ${count} Ideas (1 credit)`}
        </button>
      </div>

      {/* Results */}
      {ideas.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: N_FG, margin: 0 }}>
              {ideas.length} ideas generated
            </h3>
            {ideasDb && (
              <button
                onClick={saveAll}
                style={{
                  background: "transparent",
                  color: ACCENT,
                  border: `1px solid ${ACCENT_BORDER}`,
                  borderRadius: "8px",
                  padding: "7px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                💾 Save All to Ideas Bank
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {ideas.map((idea, i) => {
              const angleInfo = ANGLE_LABELS[idea.angle] ?? { label: idea.angle, color: N_MUTED, bg: N_BG };
              const isSaved   = saved.has(i);
              const isSaving  = saving === i;
              return (
                <div key={i} style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px", background: angleInfo.bg, color: angleInfo.color }}>
                          {angleInfo.label}
                        </span>
                        {idea.format && (
                          <span style={{ fontSize: "11px", color: N_MUTED, background: N_BG, border: `1px solid ${N_BORDER}`, borderRadius: "10px", padding: "2px 8px" }}>
                            {PLATFORM_EMOJI[platform] ?? "🎬"} {idea.format}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: N_FG, margin: "0 0 6px 0" }}>{idea.title}</p>
                      {idea.hook && (
                        <p style={{ fontSize: "12px", color: N_MUTED, margin: 0, fontStyle: "italic" }}>
                          Hook: "{idea.hook}"
                        </p>
                      )}
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {isSaved ? (
                        <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>✓ Saved</span>
                      ) : (
                        <button
                          onClick={() => saveIdea(idea, i)}
                          disabled={!ideasDb || isSaving}
                          style={{
                            background: ideasDb ? ACCENT_LIGHT : N_BG,
                            color: ideasDb ? ACCENT : N_MUTED,
                            border: `1px solid ${ideasDb ? ACCENT_BORDER : N_BORDER}`,
                            borderRadius: "8px",
                            padding: "6px 12px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: ideasDb ? "pointer" : "not-allowed",
                          }}
                        >
                          {isSaving ? "Saving…" : "💾 Save"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
