"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER } from "./utils";

interface CompetitorItem { name: string; strength: string; notes: string }
interface CustomerProfile { name: string; notes: string }
interface MarketResult { competitors: CompetitorItem[]; customerProfiles: CustomerProfile[]; positioning: string; summary: string }

const STRENGTH_STYLE: Record<string, { bg: string; color: string }> = {
  Strong:   { bg: "rgba(239,68,68,0.09)",   color: "#991b1b" },
  Moderate: { bg: "rgba(245,158,11,0.09)",  color: "#92400e" },
  Weak:     { bg: "rgba(5,150,105,0.09)",   color: "#065f46" },
};

export function SHMarketAnalyser({
  criteria,
  marketDb,
  onRowAdded,
}: {
  criteria:  Record<string, unknown> | null;
  marketDb:  WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const [targetAudience, setAudience] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [result,    setResult]    = useState<MarketResult | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [saveResult,setSaveResult]= useState<string | null>(null);

  const businessName = String(criteria?.["business-name"] ?? "").trim();
  const whatYouSell  = String(criteria?.["what-you-sell"]  ?? "").trim();
  const missingSetup = !businessName || !whatYouSell;

  async function analyse() {
    if (missingSetup) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaveResult(null);
    try {
      const res = await fetch("/api/members/sh-market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          whatYouSell,
          businessType:   criteria?.["business-type"] ?? "",
          targetAudience,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as MarketResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveToNotion() {
    if (!result || !marketDb) return;
    setSaving(true);
    setSaveResult(null);
    let added = 0;
    try {
      const items: Array<Record<string, string | number | boolean | null>> = [
        ...result.competitors.map((c) => ({ "Name": c.name, "Type": "Competitor", "Notes": c.notes, "Strength": c.strength })),
        ...result.customerProfiles.map((p) => ({ "Name": p.name, "Type": "Target Customer", "Notes": p.notes })),
      ];
      if (result.positioning) {
        items.push({ "Name": "Positioning Strategy", "Type": "Market Insight", "Notes": result.positioning });
      }
      const propertyTypes = { "Name": "title", "Type": "select", "Notes": "rich_text", "Strength": "select" };
      for (const properties of items) {
        const res = await fetch("/api/members/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseId: marketDb.notionId, properties, propertyTypes }),
        });
        if (res.ok) {
          const data = await res.json() as { pageId?: string };
          if (data.pageId) { onRowAdded(marketDb.notionId, { pageId: data.pageId, properties }); added++; }
        }
      }
      setSaveResult(`✓ Saved ${added} items to Market Research`);
    } catch {
      setSaveResult("Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: "720px", fontFamily: N_FONT }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800, color: N_FG }}>Market Analyser</h1>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          AI maps your competitors, builds target customer profiles, and tells you exactly how to position your business to win.
        </p>
      </div>

      {missingSetup && (
        <div style={{ padding: "12px 14px", borderRadius: "8px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)", fontSize: "13px", color: "#92400e", marginBottom: "20px" }}>
          Complete your onboarding (business name + what you sell) to run market analysis.
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px" }}>
          Who is your target customer? <span style={{ fontWeight: 400, color: N_MUTED }}>(optional — helps the AI be more specific)</span>
        </label>
        <textarea
          value={targetAudience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="e.g. Busy mums aged 30–45 who want handmade gifts but don't have time to make them themselves"
          rows={3}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "8px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, resize: "vertical", lineHeight: 1.6, outline: "none" }}
        />
      </div>

      <button
        onClick={() => void analyse()}
        disabled={loading || missingSetup}
        style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "11px 26px", borderRadius: "6px", border: "none",
          background: loading || missingSetup ? "rgba(55,53,47,0.12)" : ACCENT,
          color: loading || missingSetup ? N_MUTED : "white",
          fontSize: "14px", fontWeight: 600, cursor: loading || missingSetup ? "default" : "pointer", fontFamily: N_FONT,
          marginBottom: "28px",
        }}
      >
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Analysing market…</> : "🔍 Analyse market"}
      </button>

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: "6px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", fontSize: "13px", color: "#b91c1c", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Summary + positioning */}
          <div style={{ padding: "14px 16px", borderRadius: "10px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}` }}>
            <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700, color: "#c2410c" }}>Market Overview</p>
            <p style={{ margin: "0 0 12px", fontSize: "13px", color: N_FG, lineHeight: 1.7 }}>{result.summary}</p>
            {result.positioning && (
              <>
                <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 700, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>Positioning</p>
                <p style={{ margin: 0, fontSize: "13px", color: N_FG, lineHeight: 1.7 }}>{result.positioning}</p>
              </>
            )}
          </div>

          {/* Competitors */}
          <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER}` }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Competitors</p>
            </div>
            {result.competitors.map((c, i) => {
              const cs = STRENGTH_STYLE[c.strength] ?? STRENGTH_STYLE["Moderate"]!;
              return (
                <div key={i} style={{ display: "flex", gap: "12px", padding: "12px 16px", borderBottom: i < result.competitors.length - 1 ? `1px solid ${N_BORDER}` : "none", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 3px", fontSize: "13px", fontWeight: 600, color: N_FG }}>{c.name}</p>
                    <p style={{ margin: 0, fontSize: "12px", color: N_SUBTLE, lineHeight: 1.5 }}>{c.notes}</p>
                  </div>
                  <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: cs.bg, color: cs.color, fontWeight: 600, flexShrink: 0 }}>{c.strength}</span>
                </div>
              );
            })}
          </section>

          {/* Customer profiles */}
          <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER}` }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Target Customer Profiles</p>
            </div>
            {result.customerProfiles.map((p, i) => (
              <div key={i} style={{ padding: "12px 16px", borderBottom: i < result.customerProfiles.length - 1 ? `1px solid ${N_BORDER}` : "none" }}>
                <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 600, color: N_FG }}>"{p.name}"</p>
                <p style={{ margin: 0, fontSize: "12px", color: N_SUBTLE, lineHeight: 1.6 }}>{p.notes}</p>
              </div>
            ))}
          </section>

          {saveResult && (
            <div style={{ padding: "10px 14px", borderRadius: "6px", background: saveResult.startsWith("✓") ? "rgba(5,150,105,0.07)" : "rgba(220,38,38,0.07)", border: `1px solid ${saveResult.startsWith("✓") ? "rgba(5,150,105,0.2)" : "rgba(220,38,38,0.2)"}`, fontSize: "13px", color: saveResult.startsWith("✓") ? "#065f46" : "#b91c1c" }}>
              {saveResult}
            </div>
          )}

          {marketDb ? (
            <button
              onClick={() => void saveToNotion()}
              disabled={saving}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "10px 22px", borderRadius: "6px", border: "none",
                background: saving ? "rgba(55,53,47,0.12)" : ACCENT,
                color: saving ? N_MUTED : "white",
                fontSize: "14px", fontWeight: 600, cursor: saving ? "default" : "pointer", fontFamily: N_FONT,
                alignSelf: "flex-start",
              }}
            >
              {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : "Save to Market Research"}
            </button>
          ) : (
            <p style={{ fontSize: "12px", color: N_MUTED }}>Deploy Market Research database to save results.</p>
          )}
        </div>
      )}
    </div>
  );
}
