"use client";
import { useState } from "react";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { asText, ACCENT, ACCENT_LIGHT, ACCENT_BORDER, GUIDEBOOK_SECTIONS, SECTION_ICON } from "./utils";

const N_FG     = "#111827";
const N_MUTED  = "#6b7280";
const N_BORDER = "#e5e7eb";
const N_BG     = "#f9fafb";

export function STRGuidebookBuilder({
  criteria,
  guidebookDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  guidebookDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const defaultPropertyName  = asText(criteria?.["property-name"])  || "";
  const defaultPropertyType  = asText(criteria?.["property-type"])  || "";
  const defaultNeighbourhood = asText(criteria?.["neighbourhood"])   || "";
  const defaultCity          = asText(criteria?.["city"])            || "";

  const [section,       setSection]       = useState<string>(GUIDEBOOK_SECTIONS[0]);
  const [propertyName,  setPropertyName]  = useState(defaultPropertyName);
  const [propertyType,  setPropertyType]  = useState(defaultPropertyType);
  const [neighbourhood, setNeighbourhood] = useState(defaultNeighbourhood);
  const [city,          setCity]          = useState(defaultCity);
  const [extraContext,  setExtraContext]  = useState("");

  const [content,  setContent]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [copied,   setCopied]   = useState(false);

  async function generate() {
    if (!propertyName.trim()) { setError("Enter your property name."); return; }
    if (!neighbourhood.trim()) { setError("Enter your neighbourhood."); return; }
    if (!city.trim()) { setError("Enter your city."); return; }
    setLoading(true); setError(""); setContent(""); setSaved(false);
    try {
      const res = await fetch("/api/members/str-guidebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyName: propertyName.trim(),
          propertyType: propertyType.trim(),
          neighbourhood: neighbourhood.trim(),
          city: city.trim(),
          section,
          extraContext: extraContext.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setContent(data.content ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveToDb() {
    if (!guidebookDb || !content) return;
    setSaving(true);
    const properties: Record<string, string | number | boolean | null> = {
      "Section":    section,
      "Property":   propertyName,
      "Content":    content,
      "Status":     "Draft",
    };
    const propertyTypes: Record<string, string> = {
      "Section":  "title",
      "Property": "select",
      "Content":  "rich_text",
      "Status":   "select",
    };
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: guidebookDb.notionId, properties, propertyTypes }),
      });
      if (res.ok) {
        const data = await res.json() as { pageId?: string };
        if (data.pageId) { onRowAdded(guidebookDb.notionId, { pageId: data.pageId, properties }); }
        setSaved(true);
      }
    } catch { /* silently fail */ }
    finally { setSaving(false); }
  }

  async function copyContent() {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: N_FG, margin: "0 0 4px 0" }}>📖 Guidebook Builder</h2>
        <p style={{ fontSize: "13px", color: N_MUTED, margin: 0 }}>
          AI writes localised guidebook sections using live search results — restaurants, activities, transport and more.
        </p>
      </div>

      <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
        {/* Section picker */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "8px" }}>
            Guidebook Section
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {GUIDEBOOK_SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "20px",
                  border: `1px solid ${section === s ? ACCENT : N_BORDER}`,
                  background: section === s ? ACCENT_LIGHT : "white",
                  color: section === s ? ACCENT : N_MUTED,
                  fontSize: "13px",
                  fontWeight: section === s ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {SECTION_ICON[s]} {s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>
              Property Name <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder="e.g. The Harbour Cottage"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Property Type</label>
            <input
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              placeholder="e.g. Cottage, Apartment, Studio"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>
              Neighbourhood <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              value={neighbourhood}
              onChange={(e) => setNeighbourhood(e.target.value)}
              placeholder="e.g. Shoreditch, Notting Hill"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>
              City <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. London, Edinburgh"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>
              Extra Context (optional)
            </label>
            <input
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              placeholder="e.g. Guests tend to be couples, property is near the canal, family-friendly areas preferred"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#dc2626" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
            {loading ? "Searching & writing…" : `✨ Generate ${SECTION_ICON[section] ?? ""} ${section} (2 credits)`}
          </button>
          {loading && (
            <span style={{ fontSize: "12px", color: N_MUTED }}>
              Searching local listings and crafting your guide…
            </span>
          )}
        </div>
      </div>

      {/* Result */}
      {content && (
        <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: N_FG, margin: 0 }}>
              {SECTION_ICON[section]} {section}
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={copyContent}
                style={{
                  background: "transparent",
                  color: N_MUTED,
                  border: `1px solid ${N_BORDER}`,
                  borderRadius: "8px",
                  padding: "6px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {copied ? "✓ Copied!" : "📋 Copy"}
              </button>
              {guidebookDb && (
                <button
                  onClick={saveToDb}
                  disabled={saving || saved}
                  style={{
                    background: saved ? "rgba(22,163,74,0.08)" : ACCENT_LIGHT,
                    color: saved ? "#16a34a" : ACCENT,
                    border: `1px solid ${saved ? "rgba(22,163,74,0.25)" : ACCENT_BORDER}`,
                    borderRadius: "8px",
                    padding: "6px 14px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: saving || saved ? "not-allowed" : "pointer",
                  }}
                >
                  {saved ? "✓ Saved to Guidebook" : saving ? "Saving…" : "💾 Save to Guidebook"}
                </button>
              )}
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            style={{
              width: "100%",
              border: `1px solid ${N_BORDER}`,
              borderRadius: "8px",
              padding: "12px",
              fontSize: "13px",
              lineHeight: "1.7",
              color: N_FG,
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              background: N_BG,
            }}
          />
          <p style={{ fontSize: "11px", color: N_MUTED, margin: "6px 0 0 0" }}>
            Edit the content above before saving. Placeholders like [HOST PHONE NUMBER] should be filled in with your details.
          </p>
        </div>
      )}
    </div>
  );
}
