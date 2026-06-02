"use client";
import { useState } from "react";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { asText, getCurrencyCode, ACCENT, ACCENT_LIGHT, ACCENT_BORDER } from "./utils";

const N_FG     = "#111827";
const N_MUTED  = "#6b7280";
const N_BORDER = "#e5e7eb";
const N_BG     = "#f9fafb";

interface Listing { title: string; description: string; tags: string[] }

export function EtsyListingWriter({
  criteria,
  listingsDb,
  onRowAdded,
}: {
  criteria:   Record<string, unknown> | null;
  listingsDb: WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const shopName = asText(criteria?.["shop-name"]) || "My Shop";
  const shopType = asText(criteria?.["shop-type"]) || "";
  const currencyCode = getCurrencyCode(criteria);

  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [targetBuyer, setTargetBuyer] = useState("");
  const [keywords, setKeywords]       = useState("");
  const [price, setPrice]             = useState("");
  const [category, setCategory]       = useState("Digital Download");

  const [result, setResult]     = useState<Listing | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [saved, setSaved]       = useState(false);

  // Editable result fields
  const [editTitle, setEditTitle]       = useState("");
  const [editDesc, setEditDesc]         = useState("");
  const [editTags, setEditTags]         = useState("");

  async function generate() {
    if (!productName.trim()) { setError("Enter a product name."); return; }
    setLoading(true); setError(""); setResult(null); setSaved(false);
    try {
      const res = await fetch("/api/members/etsy-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName,
          shopType,
          productName: productName.trim(),
          description: description.trim(),
          targetBuyer: targetBuyer.trim(),
          keywords:    keywords.trim(),
          price:       price ? parseFloat(price) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data);
      setEditTitle(data.title);
      setEditDesc(data.description);
      setEditTags(data.tags.join(", "));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveToNotion() {
    if (!listingsDb || !result) return;
    setSaved(false);
    const tags = editTags.split(",").map((t) => t.trim()).filter(Boolean).join(", ");
    const properties: Record<string, string | number | boolean | null> = {
      "Title":    editTitle,
      "Category": category,
      "Price":    price ? parseFloat(price) : null,
      "Tags":     tags,
      "Status":   "Draft",
    };
    const propertyTypes: Record<string, string> = {
      "Title": "title", "Category": "select", "Price": "number", "Tags": "rich_text", "Status": "select",
    };
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: listingsDb.notionId, properties, propertyTypes }),
      });
      if (res.ok) {
        const data = await res.json() as { pageId?: string };
        if (data.pageId) { onRowAdded(listingsDb.notionId, { pageId: data.pageId, properties }); }
        setSaved(true);
      }
    } catch { /* silently fail */ }
  }

  const CATEGORIES = ["Digital Download", "Handmade", "Print on Demand", "Vintage", "Supplies", "Jewellery", "Home Decor", "Art", "Clothing", "Other"];

  return (
    <div style={{ maxWidth: "820px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: N_FG, margin: "0 0 4px 0" }}>
          ✍️ Listing Writer
        </h2>
        <p style={{ fontSize: "13px", color: N_MUTED, margin: 0 }}>
          AI writes an SEO-optimised title, description and 13 tags tailored for Etsy search.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        {/* Product name */}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>
            Product Name <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g. Personalised Wedding Planner Printable, Macramé Wall Hanging"
            style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Category */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, background: "white", outline: "none", boxSizing: "border-box" }}
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Price */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>
            Price ({currencyCode})
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 5.99"
            min="0"
            step="0.01"
            style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Description context */}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Product Details</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your product — size, materials, colours, what makes it special..."
            rows={3}
            style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, resize: "vertical", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Target buyer */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Target Buyer</label>
          <input
            value={targetBuyer}
            onChange={(e) => setTargetBuyer(e.target.value)}
            placeholder="e.g. Brides planning a boho wedding"
            style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Keywords */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Key Terms to Include</label>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g. personalised, instant download, printable"
            style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
          />
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
        {loading ? "Generating…" : "✨ Generate Listing (1 credit)"}
      </button>

      {/* Result */}
      {result && (
        <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: N_FG, margin: "0 0 16px 0" }}>Generated Listing</h3>

          {/* Title */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>
              Title ({editTitle.length}/140)
            </label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={140}
              style={{ width: "100%", border: `1px solid ${ACCENT_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box", background: ACCENT_LIGHT }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>
              Description
            </label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={6}
              style={{ width: "100%", border: `1px solid ${ACCENT_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, resize: "vertical", outline: "none", boxSizing: "border-box", background: ACCENT_LIGHT }}
            />
          </div>

          {/* Tags */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>
              Tags (comma-separated, 13 max, each max 20 chars)
            </label>
            <input
              value={editTags}
              onChange={(e) => setEditTags(e.target.value)}
              style={{ width: "100%", border: `1px solid ${ACCENT_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box", background: ACCENT_LIGHT }}
            />
            {/* Tag pills preview */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
              {editTags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 13).map((tag, i) => (
                <span key={i} style={{
                  background: ACCENT_LIGHT,
                  border: `1px solid ${ACCENT_BORDER}`,
                  borderRadius: "20px",
                  padding: "2px 10px",
                  fontSize: "11px",
                  color: ACCENT,
                  fontWeight: 500,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={saveToNotion}
              disabled={!listingsDb}
              style={{
                background: listingsDb ? ACCENT : "#d1d5db",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "9px 18px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: listingsDb ? "pointer" : "not-allowed",
              }}
            >
              💾 Save to Listings
            </button>
            <button
              onClick={generate}
              disabled={loading}
              style={{
                background: "transparent",
                color: ACCENT,
                border: `1px solid ${ACCENT_BORDER}`,
                borderRadius: "8px",
                padding: "9px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🔄 Regenerate
            </button>
            {saved && <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>✓ Saved!</span>}
            {!listingsDb && <span style={{ fontSize: "11px", color: N_MUTED }}>Listings database not found</span>}
          </div>
        </div>
      )}
    </div>
  );
}
