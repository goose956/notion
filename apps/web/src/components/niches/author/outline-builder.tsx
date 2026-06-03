"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, OUTLINE_SECTIONS, GENRE_LIST, type OutlineSection } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

export function AuthorOutlineBuilder({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const [section,    setSection]   = useState<OutlineSection>("Premise & Hook");
  const [extraNotes, setExtra]     = useState("");
  const [loading,    setLoading]   = useState(false);
  const [error,      setError]     = useState<string | null>(null);
  const [result,     setResult]    = useState<{ section: string; content: string } | null>(null);
  const [saving,     setSaving]    = useState(false);
  const [saveMsg,    setSaveMsg]   = useState<string | null>(null);

  const bookTitle = String(criteria?.["book-title"] ?? "").trim();
  const genre     = String(criteria?.["genre"]      ?? "").trim();
  const premise   = String(criteria?.["premise"]    ?? "").trim();
  const pov       = String(criteria?.["pov"]        ?? "").trim();
  const audience  = String(criteria?.["target-audience"] ?? "").trim();

  async function generate() {
    if (!bookTitle && !premise) { setError("Add your book title and premise in Setup first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/author-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, bookTitle, genre, premise, pov, audience, extraNotes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as { section: string; content: string };
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
      const properties = { Title: result.section, Section: result.section, Content: result.content, Book: bookTitle || "Untitled" };
      const propertyTypes = { Title: "title", Section: "select", Content: "rich_text", Book: "select" };
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: documentsDb.notionId, properties, propertyTypes }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json() as { pageId?: string };
      if (data.pageId) {
        onRowAdded(documentsDb.notionId, { pageId: data.pageId, properties });
        setSaveMsg("Saved to your Outline notebook");
      }
    } catch {
      setSaveMsg("Save failed — try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: N_FONT }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>Story Planner</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
          AI builds your full story outline section by section — from premise to resolution.
        </p>
      </div>

      {/* Section picker */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>Section</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {OUTLINE_SECTIONS.map((s) => (
            <button key={s} onClick={() => setSection(s)}
              style={{ padding: "6px 14px", borderRadius: "8px", border: `1px solid ${section === s ? ACCENT : N_BORDER_MED}`, background: section === s ? ACCENT_LIGHT : "white", color: section === s ? ACCENT_TEXT : N_FG, fontWeight: section === s ? 700 : 400, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Extra notes */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Extra context <span style={{ fontWeight: 400, textTransform: "none" }}>(optional — any specific ideas, constraints, character names)</span>
        </label>
        <textarea
          value={extraNotes}
          onChange={(e) => setExtra(e.target.value)}
          rows={3}
          placeholder="e.g. The protagonist is a disgraced detective. The twist involves a long-dead mentor. Keep the tone dark and gritty."
          style={{ padding: "10px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, resize: "vertical" }}
        />
      </div>

      <button onClick={generate} disabled={loading}
        style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", background: ACCENT, border: "none", color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: N_FONT }}>
        {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "✦"}
        {loading ? "Writing…" : `Generate ${section}`}
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
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>{result.section}</p>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>AI-generated outline section</p>
            </div>
            {documentsDb && (
              <button onClick={save} disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_TEXT, fontWeight: 600, fontSize: "12px", cursor: saving ? "not-allowed" : "pointer", fontFamily: N_FONT }}>
                {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "💾"}
                {saving ? "Saving…" : "Save to Outline"}
              </button>
            )}
          </div>
          {saveMsg && (
            <div style={{ padding: "8px 16px", background: ACCENT_LIGHT, borderBottom: `1px solid ${ACCENT_BORDER}`, fontSize: "12px", color: ACCENT_TEXT, fontWeight: 600 }}>
              {saveMsg}
            </div>
          )}
          <div style={{ padding: "16px 20px", fontSize: "13px", color: N_FG, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
            {result.content}
          </div>
        </section>
      )}
    </div>
  );
}
