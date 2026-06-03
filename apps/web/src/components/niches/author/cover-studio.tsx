"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

type Mode = "brief" | "concept";

export function AuthorCoverStudio({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const [mode, setMode] = useState<Mode>("brief");

  const bookTitle = String(criteria?.["book-title"] ?? "").trim();
  const genre     = String(criteria?.["genre"]      ?? "").trim();
  const audience  = String(criteria?.["target-audience"] ?? "").trim();

  // Shared form state
  const [mood,       setMood]      = useState("");
  const [compTitles, setComps]     = useState("");
  const [imagery,    setImagery]   = useState("");
  const [avoid,      setAvoid]     = useState("");
  const [palette,    setPalette]   = useState("");
  const [style,      setStyle]     = useState("");

  // Brief state
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError,   setBriefError]   = useState<string | null>(null);
  const [brief,        setBrief]        = useState<string | null>(null);
  const [savingBrief,  setSavingBrief]  = useState(false);
  const [briefSaved,   setBriefSaved]   = useState<string | null>(null);

  // Concept state
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError,   setImgError]   = useState<string | null>(null);
  const [imgUrl,     setImgUrl]     = useState<string | null>(null);

  async function generateBrief() {
    setBriefLoading(true); setBriefError(null); setBrief(null); setBriefSaved(null);
    try {
      const res = await fetch("/api/members/author-cover-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookTitle, genre, audience, mood, compTitles, keyImagery: imagery, avoid }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      const data = await res.json() as { brief: string };
      setBrief(data.brief);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBriefLoading(false);
    }
  }

  async function saveBrief() {
    if (!brief || !documentsDb) return;
    setSavingBrief(true); setBriefSaved(null);
    try {
      const properties = { Title: `Cover Brief — ${bookTitle || "Untitled"}`, Section: "Cover Brief", Content: brief, Book: bookTitle || "Untitled" };
      const propertyTypes = { Title: "title", Section: "select", Content: "rich_text", Book: "select" };
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: documentsDb.notionId, properties, propertyTypes }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { pageId?: string };
      if (data.pageId) {
        onRowAdded(documentsDb.notionId, { pageId: data.pageId, properties });
        setBriefSaved("Cover brief saved to Documents");
      }
    } catch {
      setBriefSaved("Save failed — try again");
    } finally {
      setSavingBrief(false);
    }
  }

  async function generateConcept() {
    setImgLoading(true); setImgError(null); setImgUrl(null);
    try {
      const res = await fetch("/api/members/author-cover-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookTitle, genre, mood, imagery, palette, style }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      const data = await res.json() as { url: string };
      setImgUrl(data.url);
    } catch (err) {
      setImgError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setImgLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: N_FONT }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>Cover Studio</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
          Write a professional cover brief for a designer, or generate a concept image with DALL-E.
        </p>
      </div>

      {/* Mode toggle */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {([
          { id: "brief" as Mode,   label: "Cover Brief",      desc: "AI writes a detailed brief to hand to a designer" },
          { id: "concept" as Mode, label: "Concept Generator", desc: "DALL-E visualises your cover idea (3 credits)" },
        ] as const).map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{ padding: "12px 14px", borderRadius: "10px", border: `1px solid ${mode === m.id ? ACCENT : N_BORDER_MED}`, background: mode === m.id ? ACCENT_LIGHT : "white", textAlign: "left", cursor: "pointer", fontFamily: N_FONT }}>
            <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 700, color: mode === m.id ? ACCENT_TEXT : N_FG }}>{m.label}</p>
            <p style={{ margin: 0, fontSize: "11px", color: N_MUTED }}>{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Shared fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <InputField label="Mood / tone" value={mood} onChange={setMood} placeholder="e.g. dark and atmospheric, hopeful, tense thriller" />
        <InputField label="Key imagery from your story" value={imagery} onChange={setImagery} placeholder="e.g. a lighthouse, a single red flower, two silhouettes" />
      </div>

      {mode === "brief" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <InputField label="Comp titles (covers that inspired you)" value={compTitles} onChange={setComps} placeholder="e.g. The Silent Patient, Gone Girl" />
            <InputField label="What to avoid" value={avoid} onChange={setAvoid} placeholder="e.g. cliché romance clinch, overly bright colours" />
          </div>
          <button onClick={generateBrief} disabled={briefLoading}
            style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", background: ACCENT, border: "none", color: "white", fontWeight: 700, fontSize: "14px", cursor: briefLoading ? "not-allowed" : "pointer", opacity: briefLoading ? 0.7 : 1, fontFamily: N_FONT }}>
            {briefLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "✦"}
            {briefLoading ? "Writing brief…" : "Generate Cover Brief"}
          </button>
          {briefError && <ErrorBox message={briefError} />}
          {brief && (
            <ResultCard
              title={`Cover Brief — ${bookTitle || "Untitled"}`}
              subtitle="AI-generated cover design brief"
              onSave={documentsDb ? saveBrief : undefined}
              saving={savingBrief}
              saveMsg={briefSaved}
            >
              <div style={{ padding: "16px 20px", fontSize: "13px", color: N_FG, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                {brief}
              </div>
            </ResultCard>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <InputField label="Colour palette" value={palette} onChange={setPalette} placeholder="e.g. deep navy, gold, blood red" />
            <InputField label="Design style" value={style} onChange={setStyle} placeholder="e.g. photographic, illustrated, minimalist, typographic" />
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: N_MUTED }}>
            ⚠️ DALL-E URLs expire after ~1 hour. Right-click the image and save it to your device.
          </p>
          <button onClick={generateConcept} disabled={imgLoading}
            style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", background: ACCENT, border: "none", color: "white", fontWeight: 700, fontSize: "14px", cursor: imgLoading ? "not-allowed" : "pointer", opacity: imgLoading ? 0.7 : 1, fontFamily: N_FONT }}>
            {imgLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : "✦"}
            {imgLoading ? "Generating…" : "Generate Cover Concept"}
          </button>
          {imgError && <ErrorBox message={imgError} />}
          {imgUrl && (
            <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, overflow: "hidden", background: "white" }}>
              <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Cover Concept</p>
                  <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>DALL-E 3 — right-click to save</p>
                </div>
                <a href={imgUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "12px", color: ACCENT_TEXT, fontWeight: 600, textDecoration: "underline" }}>
                  Open full size ↗
                </a>
              </div>
              <div style={{ padding: "16px", display: "flex", justifyContent: "center", background: "#f8f8f8" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl} alt="Cover concept" style={{ maxHeight: "480px", borderRadius: "6px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ padding: "9px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT }} />
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.20)", color: "#991b1b", fontSize: "13px" }}>
      {message}
    </div>
  );
}

function ResultCard({ title, subtitle, onSave, saving, saveMsg, children }: {
  title: string; subtitle: string; onSave?: () => void; saving?: boolean; saveMsg?: string | null; children: React.ReactNode;
}) {
  return (
    <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>{title}</p>
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>{subtitle}</p>
        </div>
        {onSave && (
          <button onClick={onSave} disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "8px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_TEXT, fontWeight: 600, fontSize: "12px", cursor: saving ? "not-allowed" : "pointer", fontFamily: N_FONT }}>
            {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : "💾"}
            {saving ? "Saving…" : "Save to Documents"}
          </button>
        )}
      </div>
      {saveMsg && (
        <div style={{ padding: "8px 16px", background: ACCENT_LIGHT, borderBottom: `1px solid ${ACCENT_BORDER}`, fontSize: "12px", color: ACCENT_TEXT, fontWeight: 600 }}>
          {saveMsg}
        </div>
      )}
      {children}
    </section>
  );
}
