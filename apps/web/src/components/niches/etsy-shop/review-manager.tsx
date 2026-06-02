"use client";
import { useState } from "react";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { asText, ACCENT, ACCENT_LIGHT, ACCENT_BORDER } from "./utils";

const N_FG     = "#111827";
const N_MUTED  = "#6b7280";
const N_BORDER = "#e5e7eb";
const N_BG     = "#f9fafb";

const STAR_OPTIONS = [
  { label: "⭐⭐⭐⭐⭐ 5 stars", value: 5 },
  { label: "⭐⭐⭐⭐ 4 stars",   value: 4 },
  { label: "⭐⭐⭐ 3 stars",    value: 3 },
  { label: "⭐⭐ 2 stars",     value: 2 },
  { label: "⭐ 1 star",       value: 1 },
];

export function EtsyReviewManager({
  criteria,
  reviewsDb,
  onRowAdded,
  onRowUpdated,
}: {
  criteria:     Record<string, unknown> | null;
  reviewsDb:    WorkspaceDatabase | null;
  onRowAdded:   (dbNotionId: string, row: WorkspaceRow) => void;
  onRowUpdated: (dbNotionId: string, pageId: string, name: string, val: string | number | boolean | null) => void;
}) {
  const shopName = asText(criteria?.["shop-name"]) || "My Shop";
  const shopType = asText(criteria?.["shop-type"]) || "";

  // Form
  const [listing,    setListing]    = useState("");
  const [rating,     setRating]     = useState(5);
  const [reviewText, setReviewText] = useState("");

  const [reply,   setReply]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [saved,   setSaved]   = useState(false);

  async function generateReply() {
    setLoading(true); setError(""); setReply(""); setSaved(false);
    try {
      const res = await fetch("/api/members/etsy-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopName, shopType, listing: listing.trim(), rating, reviewText: reviewText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setReply(data.reply);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveToNotion() {
    if (!reviewsDb || !reply) return;
    const ratingLabel = STAR_OPTIONS.find((s) => s.value === rating)?.label ?? `${rating} stars`;
    const properties: Record<string, string | number | boolean | null> = {
      "Listing":  listing || "Review",
      "Rating":   ratingLabel,
      "Comment":  reviewText,
      "Reply":    reply,
      "Replied":  true,
    };
    const propertyTypes: Record<string, string> = {
      "Listing": "title", "Rating": "select", "Comment": "rich_text", "Reply": "rich_text", "Replied": "checkbox",
    };
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: reviewsDb.notionId, properties, propertyTypes }),
      });
      if (res.ok) {
        const data = await res.json() as { pageId?: string };
        if (data.pageId) { onRowAdded(reviewsDb.notionId, { pageId: data.pageId, properties }); }
        setSaved(true);
      }
    } catch { /* silently fail */ }
  }

  // Existing reviews from DB
  const existingReviews = (reviewsDb?.rows ?? []).slice(0, 10);
  const unreplied       = existingReviews.filter((r) => !r.properties["Replied"]);

  const ratingColor = (r: number) =>
    r >= 4 ? "#16a34a" : r === 3 ? "#d97706" : "#dc2626";

  return (
    <div style={{ maxWidth: "820px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: N_FG, margin: "0 0 4px 0" }}>⭐ Review Manager</h2>
        <p style={{ fontSize: "13px", color: N_MUTED, margin: 0 }}>
          Generate personalised, human-sounding review replies. Replying to reviews boosts your Etsy search ranking.
        </p>
      </div>

      {/* Unreplied banner */}
      {unreplied.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>⚠️</span>
          <p style={{ fontSize: "13px", color: "#991b1b", margin: 0, fontWeight: 600 }}>
            {unreplied.length} review{unreplied.length !== 1 ? "s" : ""} waiting for a reply
          </p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Form */}
        <div>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: N_FG, margin: "0 0 14px 0" }}>Generate a Reply</h3>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Item Purchased</label>
            <input
              value={listing}
              onChange={(e) => setListing(e.target.value)}
              placeholder="e.g. Personalised Name Print"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Star Rating</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {STAR_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setRating(s.value)}
                  style={{
                    background: rating === s.value ? ACCENT_LIGHT : "transparent",
                    border: `1px solid ${rating === s.value ? ACCENT_BORDER : N_BORDER}`,
                    borderRadius: "8px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    cursor: "pointer",
                    color: rating === s.value ? ACCENT : N_FG,
                    fontWeight: rating === s.value ? 600 : 400,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Review Text (optional)</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Paste the buyer's review here for a more personalised reply..."
              rows={4}
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, resize: "vertical", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#dc2626" }}>
              {error}
            </div>
          )}

          <button
            onClick={generateReply}
            disabled={loading}
            style={{
              background: loading ? "#d1d5db" : ACCENT,
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Generating…" : "✨ Generate Reply (1 credit)"}
          </button>
        </div>

        {/* Result */}
        <div>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: N_FG, margin: "0 0 14px 0" }}>Generated Reply</h3>
          {reply ? (
            <div>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={8}
                style={{ width: "100%", border: `1px solid ${ACCENT_BORDER}`, borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: N_FG, resize: "vertical", outline: "none", background: ACCENT_LIGHT, boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "10px" }}>
                <button
                  onClick={() => navigator.clipboard?.writeText(reply)}
                  style={{ background: "transparent", color: ACCENT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: "8px", padding: "7px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  📋 Copy
                </button>
                <button
                  onClick={saveToNotion}
                  disabled={!reviewsDb}
                  style={{ background: reviewsDb ? ACCENT : "#d1d5db", color: "white", border: "none", borderRadius: "8px", padding: "7px 14px", fontSize: "12px", fontWeight: 600, cursor: reviewsDb ? "pointer" : "not-allowed" }}
                >
                  💾 Save to Reviews
                </button>
                {saved && <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>✓ Saved!</span>}
              </div>
            </div>
          ) : (
            <div style={{ background: N_BG, border: `1px dashed ${N_BORDER}`, borderRadius: "10px", padding: "32px 20px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: N_MUTED }}>Your reply will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Existing reviews list */}
      {existingReviews.length > 0 && (
        <div style={{ marginTop: "32px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 700, color: N_FG, margin: "0 0 12px 0" }}>Recent Reviews</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {existingReviews.map((r, i) => {
              const ratingStr = asText(r.properties["Rating"]);
              const ratingNum = parseInt(ratingStr.match(/(\d)/)?.[1] ?? "5");
              const isReplied = !!r.properties["Replied"];
              return (
                <div key={i} style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "10px", padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: N_FG }}>
                      {asText(r.properties["Listing"] ?? r.properties["title"]) || "Review"}
                    </span>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: ratingColor(ratingNum) }}>{"⭐".repeat(ratingNum)}</span>
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "10px",
                        background: isReplied ? "rgba(22,163,74,0.10)" : "rgba(239,68,68,0.10)",
                        color: isReplied ? "#15803d" : "#dc2626",
                      }}>
                        {isReplied ? "Replied" : "No reply"}
                      </span>
                    </div>
                  </div>
                  {asText(r.properties["Comment"]) && (
                    <p style={{ fontSize: "12px", color: N_MUTED, margin: 0, fontStyle: "italic" }}>
                      "{asText(r.properties["Comment"])}"
                    </p>
                  )}
                  {!isReplied && reviewsDb && (
                    <button
                      onClick={() => {
                        setListing(asText(r.properties["Listing"] ?? r.properties["title"]) || "");
                        setRating(ratingNum);
                        setReviewText(asText(r.properties["Comment"]) || "");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      style={{ marginTop: "8px", background: "transparent", color: ACCENT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: "6px", padding: "4px 10px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Generate reply
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
