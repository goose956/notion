"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER } from "./utils";

interface VendorItem {
  name: string;
  type: string;
  notes?: string;
  priceRange?: string;
}

interface DumpResult {
  vendors: VendorItem[];
  summary: string;
}

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  Venue:          { bg: "rgba(124,58,237,0.09)",  color: "#4c1d95" },
  Catering:       { bg: "rgba(5,150,105,0.09)",   color: "#065f46" },
  Photography:    { bg: "rgba(59,130,246,0.09)",  color: "#1d4ed8" },
  Videography:    { bg: "rgba(14,165,233,0.09)",  color: "#0369a1" },
  Florist:        { bg: "rgba(236,72,153,0.09)",  color: "#9d174d" },
  "Music / DJ":   { bg: "rgba(245,158,11,0.09)",  color: "#92400e" },
  Cake:           { bg: "rgba(239,68,68,0.09)",   color: "#991b1b" },
  "Hair & Makeup":{ bg: "rgba(168,85,247,0.09)",  color: "#6b21a8" },
  Transport:      { bg: "rgba(107,114,128,0.09)", color: "#374151" },
  Other:          { bg: "rgba(107,114,128,0.09)", color: "#374151" },
};

export function NDWVendorDump({
  vendorsDb,
  onRowAdded,
}: {
  vendorsDb:  WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const [text, setText]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<DumpResult | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [adding, setAdding]   = useState(false);
  const [addResult, setAddResult] = useState<string | null>(null);

  async function sort() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAddResult(null);
    setChecked(new Set());
    try {
      const res = await fetch("/api/members/nd-wedding-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as DumpResult;
      setResult(data);
      setChecked(new Set(data.vendors.map((_, i) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  async function saveSelected() {
    if (!result || checked.size === 0 || !vendorsDb) return;
    setAdding(true);
    setAddResult(null);
    let added = 0;
    try {
      for (const i of checked) {
        const item = result.vendors[i];
        if (!item) continue;
        const properties: Record<string, string | number | boolean | null> = {
          "Vendor":   item.name,
          "Category": item.type,
          "Status":   "Researching",
        };
        if (item.notes) properties["Notes"] = item.notes;
        if (item.priceRange) properties["Price"] = item.priceRange;
        const propertyTypes: Record<string, string> = {
          "Vendor":   "title",
          "Category": "select",
          "Status":   "select",
          "Notes":    "rich_text",
        };
        const res = await fetch("/api/members/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseId: vendorsDb.notionId, properties, propertyTypes }),
        });
        if (res.ok) {
          const data = await res.json() as { pageId?: string };
          if (data.pageId) {
            onRowAdded(vendorsDb.notionId, { pageId: data.pageId, properties });
            added++;
          }
        }
      }
      setAddResult(`✓ Saved ${added} vendor${added !== 1 ? "s" : ""} to Notion`);
      setChecked(new Set());
      if (added > 0) setText("");
    } catch {
      setAddResult("Something went wrong — please try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div style={{ maxWidth: "680px", fontFamily: N_FONT }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800, color: N_FG }}>Vendor Brain Dump</h1>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          Dump every vendor thought — names, Instagram accounts, recommendations, prices overheard. The AI will sort them into categories and save them to your vendors list.
        </p>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"The Old Mill venue looks nice, around £3000\nSarah's cousin does photography\nfound a florist on Instagram @petalsbyrose\nask mum about the caterer she used\nwant a string quartet for the ceremony"}
          rows={8}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            borderRadius: "10px",
            border: `1px solid ${N_BORDER}`,
            fontSize: "14px",
            color: N_FG,
            fontFamily: N_FONT,
            resize: "vertical",
            lineHeight: 1.7,
            outline: "none",
          }}
        />
      </div>

      <button
        onClick={() => void sort()}
        disabled={loading || !text.trim()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "11px 26px",
          borderRadius: "6px",
          border: "none",
          background: loading || !text.trim() ? "rgba(55,53,47,0.12)" : ACCENT,
          color: loading || !text.trim() ? N_MUTED : "white",
          fontSize: "14px",
          fontWeight: 600,
          cursor: loading || !text.trim() ? "default" : "pointer",
          fontFamily: N_FONT,
          marginBottom: "28px",
        }}
      >
        {loading
          ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Sorting vendors…</>
          : "💜 Sort vendors"}
      </button>

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: "6px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", fontSize: "13px", color: "#b91c1c", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {result && (
        <div>
          {result.summary && (
            <div style={{ marginBottom: "16px", padding: "12px 14px", borderRadius: "8px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}` }}>
              <p style={{ margin: 0, fontSize: "13px", color: N_FG, lineHeight: 1.6 }}>{result.summary}</p>
            </div>
          )}

          {result.vendors.length === 0 ? (
            <p style={{ fontSize: "13px", color: N_MUTED }}>No vendors found in that dump. Try mentioning specific vendor types or names.</p>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: N_FG }}>
                  {result.vendors.length} vendor{result.vendors.length !== 1 ? "s" : ""} — {checked.size} selected
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setChecked(new Set(result.vendors.map((_, i) => i)))} style={{ fontSize: "11px", color: ACCENT, background: "none", border: "none", cursor: "pointer", fontFamily: N_FONT }}>Select all</button>
                  <button onClick={() => setChecked(new Set())} style={{ fontSize: "11px", color: N_MUTED, background: "none", border: "none", cursor: "pointer", fontFamily: N_FONT }}>Clear</button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
                {result.vendors.map((item, i) => {
                  const isChecked = checked.has(i);
                  const cs = TYPE_STYLE[item.type] ?? TYPE_STYLE["Other"]!;
                  return (
                    <button
                      key={i}
                      onClick={() => toggle(i)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: `1px solid ${isChecked ? ACCENT_BORDER : N_BORDER}`,
                        background: isChecked ? ACCENT_LIGHT : "white",
                        cursor: "pointer",
                        fontFamily: N_FONT,
                        textAlign: "left",
                      }}
                    >
                      <div style={{
                        width: "16px", height: "16px", borderRadius: "3px", flexShrink: 0, marginTop: "1px",
                        border: `2px solid ${isChecked ? ACCENT : N_BORDER}`,
                        background: isChecked ? ACCENT : "white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isChecked && <span style={{ color: "white", fontSize: "10px", lineHeight: 1 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: isChecked ? 600 : 400, color: N_FG }}>{item.name}</p>
                        {item.notes && <p style={{ margin: 0, fontSize: "11px", color: N_MUTED }}>{item.notes}</p>}
                        {item.priceRange && <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#065f46" }}>{item.priceRange}</p>}
                      </div>
                      <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: cs.bg, color: cs.color, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>
                        {item.type}
                      </span>
                    </button>
                  );
                })}
              </div>

              {addResult && (
                <div style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "6px", background: addResult.startsWith("✓") ? "rgba(5,150,105,0.07)" : "rgba(220,38,38,0.07)", border: `1px solid ${addResult.startsWith("✓") ? "rgba(5,150,105,0.2)" : "rgba(220,38,38,0.2)"}`, fontSize: "13px", color: addResult.startsWith("✓") ? "#065f46" : "#b91c1c" }}>
                  {addResult}
                </div>
              )}

              {vendorsDb ? (
                <button
                  onClick={() => void saveSelected()}
                  disabled={adding || checked.size === 0}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 24px",
                    borderRadius: "6px",
                    border: "none",
                    background: adding || checked.size === 0 ? "rgba(55,53,47,0.12)" : ACCENT,
                    color: adding || checked.size === 0 ? N_MUTED : "white",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: adding || checked.size === 0 ? "default" : "pointer",
                    fontFamily: N_FONT,
                  }}
                >
                  {adding
                    ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
                    : `Save ${checked.size} vendor${checked.size !== 1 ? "s" : ""} to Notion`}
                </button>
              ) : (
                <p style={{ fontSize: "12px", color: N_MUTED }}>Deploy the Vendors database to save results.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
