"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const SCENE_MODES = [
  { id: "write",    label: "Write a scene",     desc: "AI writes a full scene from your brief" },
  { id: "continue", label: "Continue my prose",  desc: "Paste what you have — AI continues in your voice" },
  { id: "rewrite",  label: "Rewrite / improve",  desc: "AI rewrites your passage to improve pacing or style" },
  { id: "dialogue", label: "Write dialogue",      desc: "AI writes a sharp dialogue exchange" },
] as const;

type SceneMode = typeof SCENE_MODES[number]["id"];

export function AuthorSceneWriter({
  criteria,
  scenesDb,
  onRowAdded,
}: {
  criteria: Record<string, unknown> | null;
  scenesDb: WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const [mode,      setMode]    = useState<SceneMode>("write");
  const [sceneDesc, setDesc]    = useState("");
  const [existing,  setExisting]= useState("");
  const [pov,       setPov]     = useState("");
  const [loading,   setLoading] = useState(false);
  const [error,     setError]   = useState<string | null>(null);
  const [result,    setResult]  = useState<string | null>(null);
  const [saving,    setSaving]  = useState(false);
  const [saveMsg,   setSaveMsg] = useState<string | null>(null);

  const genre    = String(criteria?.["genre"]     ?? "").trim();
  const bookPov  = String(criteria?.["pov"]       ?? pov).trim();
  const tone     = String(criteria?.["tone"]      ?? "").trim();

  async function generate() {
    const needsDesc = mode === "write" || mode === "dialogue";
    if (needsDesc && !sceneDesc.trim()) { setError("Describe the scene first."); return; }
    if ((mode === "continue" || mode === "rewrite") && !existing.trim()) { setError("Paste your existing prose first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/author-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, sceneDesc, existing, genre, pov: bookPov || pov, tone }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as { content: string };
      setResult(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!result || !scenesDb) return;
    const name = sceneDesc.trim().slice(0, 60) || "Scene";
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/workspace/add-row", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: scenesDb.notionId,
          properties: { Name: name, Mode: mode, Content: result },
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const row = await res.json() as WorkspaceRow;
      onRowAdded(scenesDb.notionId, row);
      setSaveMsg("Scene saved to Scene Library");
    } catch {
      setSaveMsg("Save failed — try again");
    } finally {
      setSaving(false);
    }
  }

  const needsExisting = mode === "continue" || mode === "rewrite";
  const activeMode = SCENE_MODES.find((m) => m.id === mode)!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: N_FONT }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>Scene Writer</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
          AI writes, continues, or rewrites scenes in your genre and voice. Paste context — get prose.
        </p>
      </div>

      {/* Mode picker */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
        {SCENE_MODES.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{ padding: "12px 14px", borderRadius: "10px", border: `1px solid ${mode === m.id ? ACCENT : N_BORDER_MED}`, background: mode === m.id ? ACCENT_LIGHT : "white", textAlign: "left", cursor: "pointer", fontFamily: N_FONT }}>
            <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 700, color: mode === m.id ? ACCENT_TEXT : N_FG }}>{m.label}</p>
            <p style={{ margin: 0, fontSize: "11px", color: N_MUTED }}>{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Scene description */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {needsExisting ? "Scene context / brief" : "Scene brief"}
        </label>
        <textarea
          value={sceneDesc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          placeholder={
            mode === "write"    ? "e.g. Mara confronts her estranged daughter at the hospital. It starts cold, almost professional, then cracks. It should end on an ambiguous note." :
            mode === "dialogue" ? "e.g. Detective Cole interrogates a suspect who is clearly hiding something but keeps their composure. The detective tries to rattle them." :
            "Optional — describe what this scene needs to achieve"
          }
          style={{ padding: "10px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, resize: "vertical" }}
        />
      </div>

      {/* Existing prose for continue/rewrite */}
      {needsExisting && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Your existing prose <span style={{ fontWeight: 400, textTransform: "none" }}>(paste here)</span>
          </label>
          <textarea
            value={existing}
            onChange={(e) => setExisting(e.target.value)}
            rows={6}
            placeholder="Paste the text you want AI to continue or rewrite…"
            style={{ padding: "10px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, resize: "vertical" }}
          />
        </div>
      )}

      {/* POV override if not set in criteria */}
      {!criteria?.["pov"] && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>POV</label>
          <select value={pov} onChange={(e) => setPov(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white" }}>
            <option value="">Select…</option>
            <option>First person</option>
            <option>Third person limited</option>
            <option>Third person omniscient</option>
            <option>Second person</option>
          </select>
        </div>
      )}

      <button onClick={generate} disabled={loading}
        style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", background: ACCENT, border: "none", color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: N_FONT }}>
        {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "✦"}
        {loading ? "Writing…" : activeMode.label}
      </button>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.20)", color: "#991b1b", fontSize: "13px" }}>
          {error}
        </div>
      )}

      {result && (
        <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>{activeMode.label}</p>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>AI-generated prose</p>
            </div>
            {scenesDb && (
              <button onClick={save} disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_TEXT, fontWeight: 600, fontSize: "12px", cursor: saving ? "not-allowed" : "pointer", fontFamily: N_FONT }}>
                {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "💾"}
                {saving ? "Saving…" : "Save Scene"}
              </button>
            )}
          </div>
          {saveMsg && (
            <div style={{ padding: "8px 16px", background: ACCENT_LIGHT, borderBottom: `1px solid ${ACCENT_BORDER}`, fontSize: "12px", color: ACCENT_TEXT, fontWeight: 600 }}>
              {saveMsg}
            </div>
          )}
          <div style={{ padding: "16px 20px", fontSize: "14px", color: N_FG, lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {result}
          </div>
        </section>
      )}
    </div>
  );
}
