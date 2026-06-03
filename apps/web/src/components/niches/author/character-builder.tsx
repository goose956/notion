"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const ROLES = ["Protagonist", "Antagonist", "Love Interest", "Mentor", "Side Character", "Villain", "Anti-hero"] as const;

export function AuthorCharacterBuilder({
  criteria,
  charactersDb,
  onRowAdded,
}: {
  criteria:     Record<string, unknown> | null;
  charactersDb: WorkspaceDatabase | null;
  onRowAdded:   (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const [charName,   setCharName]  = useState("");
  const [role,       setRole]      = useState<string>("Protagonist");
  const [notes,      setNotes]     = useState("");
  const [loading,    setLoading]   = useState(false);
  const [error,      setError]     = useState<string | null>(null);
  const [result,     setResult]    = useState<{ name: string; profile: string } | null>(null);
  const [saving,     setSaving]    = useState(false);
  const [saveMsg,    setSaveMsg]   = useState<string | null>(null);

  const genre   = String(criteria?.["genre"]     ?? "").trim();
  const premise = String(criteria?.["premise"]   ?? "").trim();

  async function generate() {
    if (!charName.trim()) { setError("Enter a character name first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/author-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ charName, role, genre, premise, notes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as { name: string; profile: string };
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!result || !charactersDb) return;
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/workspace/add-row", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: charactersDb.notionId,
          properties: { Name: result.name, Role: role, Profile: result.profile },
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const row = await res.json() as WorkspaceRow;
      onRowAdded(charactersDb.notionId, row);
      setSaveMsg(`${result.name} saved to Characters`);
    } catch {
      setSaveMsg("Save failed — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: N_FONT }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>Character Builder</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
          AI builds a full character profile — backstory, motivation, arc, voice, and relationships — in seconds.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>Character name</label>
          <input
            value={charName}
            onChange={(e) => setCharName(e.target.value)}
            placeholder="e.g. Mara Voss"
            style={{ padding: "9px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white" }}
          >
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          What you already know <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. She's mid-40s, ex-military, haunted by a past mission gone wrong. Doesn't trust authority. Has a daughter she's estranged from."
          style={{ padding: "10px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, resize: "vertical" }}
        />
      </div>

      <button onClick={generate} disabled={loading}
        style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", background: ACCENT, border: "none", color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: N_FONT }}>
        {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "✦"}
        {loading ? "Building profile…" : "Build Character Profile"}
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
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>{result.name} — {role}</p>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>AI-generated character profile</p>
            </div>
            {charactersDb && (
              <button onClick={save} disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_TEXT, fontWeight: 600, fontSize: "12px", cursor: saving ? "not-allowed" : "pointer", fontFamily: N_FONT }}>
                {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "💾"}
                {saving ? "Saving…" : "Save to Characters"}
              </button>
            )}
          </div>
          {saveMsg && (
            <div style={{ padding: "8px 16px", background: ACCENT_LIGHT, borderBottom: `1px solid ${ACCENT_BORDER}`, fontSize: "12px", color: ACCENT_TEXT, fontWeight: 600 }}>
              {saveMsg}
            </div>
          )}
          <div style={{ padding: "16px 20px", fontSize: "13px", color: N_FG, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
            {result.profile}
          </div>
        </section>
      )}
    </div>
  );
}
