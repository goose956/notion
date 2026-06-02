"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, PLAN_SECTIONS, type PlanSection } from "./utils";

interface PlanResult { section: string; content: string; }

export function CakePlanBuilder({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const [section,     setSection]     = useState<PlanSection>("Executive Summary");
  const [extraContext, setExtra]      = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [result,      setResult]      = useState<PlanResult | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [saveResult,  setSaveResult]  = useState<string | null>(null);

  const businessName  = String(criteria?.["business-name"]  ?? "").trim();
  const operationType = String(criteria?.["operation-type"] ?? "").trim();
  const speciality    = String(criteria?.["speciality"]     ?? "").trim();

  async function generate() {
    if (!businessName) return;
    setLoading(true); setError(null); setResult(null); setSaveResult(null);
    try {
      const res = await fetch("/api/members/cake-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          businessName,
          operationType,
          speciality,
          goal:         criteria?.["primary-goal"] ?? "",
          country:      criteria?.["country"]       ?? "United Kingdom",
          extraContext,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as PlanResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveToNotion() {
    if (!result || !documentsDb) return;
    setSaving(true); setSaveResult(null);
    try {
      const properties: Record<string, string | number | boolean | null> = {
        "Title":   result.section,
        "Section": result.section,
        "Content": result.content,
        "Version": 1,
      };
      const propertyTypes = { "Title": "title", "Section": "select", "Content": "rich_text", "Version": "number" };
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: documentsDb.notionId, properties, propertyTypes }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json() as { pageId?: string };
      if (data.pageId) {
        onRowAdded(documentsDb.notionId, { pageId: data.pageId, properties });
        setSaveResult("✓ Saved to Business Plan Sections");
      }
    } catch {
      setSaveResult("Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  const missingSetup = !businessName;

  return (
    <div style={{ maxWidth: "720px", fontFamily: N_FONT }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800, color: N_FG }}>Plan Builder</h1>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          Generate each section of your cake business plan. AI writes it using your specific details — review and save to Notion.
        </p>
      </div>

      {missingSetup && (
        <div style={{ padding: "12px 14px", borderRadius: "8px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)", fontSize: "13px", color: "#92400e", marginBottom: "20px" }}>
          Complete your onboarding (business name) to generate plan sections.
        </div>
      )}

      {/* Section selector */}
      <div style={{ marginBottom: "20px" }}>
        <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: N_MUTED }}>Section to generate</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {PLAN_SECTIONS.map((s) => {
            const isActive = section === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => { setSection(s); setResult(null); setSaveResult(null); }}
                style={{
                  padding: "7px 14px", borderRadius: "8px",
                  border: `1px solid ${isActive ? ACCENT_BORDER : N_BORDER}`,
                  background: isActive ? ACCENT_LIGHT : "white",
                  color: isActive ? "#9f1239" : N_SUBTLE,
                  fontSize: "13px", fontWeight: isActive ? 700 : 400,
                  cursor: "pointer", fontFamily: N_FONT,
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Extra context */}
      <div style={{ marginBottom: "16px" }}>
        <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: N_MUTED }}>
          Anything to add? <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
        </p>
        <textarea
          value={extraContext}
          onChange={(e) => setExtra(e.target.value)}
          placeholder={`Extra context for the ${section} section…`}
          rows={3}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, resize: "vertical", lineHeight: 1.6, outline: "none" }}
        />
      </div>

      <button
        onClick={() => void generate()}
        disabled={loading || missingSetup}
        style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "11px 26px", borderRadius: "6px", border: "none",
          background: loading || missingSetup ? "rgba(55,53,47,0.12)" : ACCENT,
          color: loading || missingSetup ? N_MUTED : "white",
          fontSize: "14px", fontWeight: 600, cursor: loading || missingSetup ? "default" : "pointer",
          fontFamily: N_FONT, marginBottom: "28px",
        }}
      >
        {loading
          ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Writing {section}…</>
          : `✍️ Generate ${section} (1 credit)`}
      </button>

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: "6px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", fontSize: "13px", color: "#b91c1c", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {result && (
        <div>
          <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden", marginBottom: "16px" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER}`, background: ACCENT_LIGHT, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#9f1239" }}>{result.section}</p>
              <span style={{ fontSize: "11px", color: N_MUTED }}>AI generated — review before saving</span>
            </div>
            <div style={{ padding: "16px", fontSize: "13px", color: N_FG, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {result.content}
            </div>
          </div>

          {saveResult && (
            <div style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "6px", background: saveResult.startsWith("✓") ? "rgba(5,150,105,0.07)" : "rgba(220,38,38,0.07)", border: `1px solid ${saveResult.startsWith("✓") ? "rgba(5,150,105,0.2)" : "rgba(220,38,38,0.2)"}`, fontSize: "13px", color: saveResult.startsWith("✓") ? "#065f46" : "#b91c1c" }}>
              {saveResult}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            {documentsDb ? (
              <button
                onClick={() => void saveToNotion()}
                disabled={saving}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 22px", borderRadius: "6px", border: "none", background: saving ? "rgba(55,53,47,0.12)" : ACCENT, color: saving ? N_MUTED : "white", fontSize: "14px", fontWeight: 600, cursor: saving ? "default" : "pointer", fontFamily: N_FONT }}
              >
                {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : "Save to Notion"}
              </button>
            ) : (
              <p style={{ fontSize: "12px", color: N_MUTED, margin: "auto 0" }}>Deploy Business Plan Sections database to save.</p>
            )}
            <button
              onClick={() => void generate()}
              disabled={loading}
              style={{ padding: "10px 22px", borderRadius: "6px", border: `1px solid ${N_BORDER}`, background: "white", color: N_FG, fontSize: "14px", fontWeight: 500, cursor: loading ? "default" : "pointer", fontFamily: N_FONT }}
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
