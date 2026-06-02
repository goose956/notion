"use client";
import { useState } from "react";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { asText, ACCENT, ACCENT_LIGHT, ACCENT_BORDER, WELCOME_PACK_TYPES } from "./utils";

const N_FG     = "#111827";
const N_MUTED  = "#6b7280";
const N_BORDER = "#e5e7eb";
const N_BG     = "#f9fafb";

const PACK_ICON: Record<string, string> = {
  "Welcome Letter":     "💌",
  "Check-in Guide":     "🗝️",
  "House Rules":        "📜",
  "Checkout Checklist": "✅",
  "WiFi Card":          "📶",
};

export function STRWelcomePack({
  criteria,
  welcomeDb,
  onRowAdded,
}: {
  criteria:  Record<string, unknown> | null;
  welcomeDb: WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const [packType,      setPackType]      = useState<string>(WELCOME_PACK_TYPES[0]);
  const [propertyName,  setPropertyName]  = useState(asText(criteria?.["property-name"]));
  const [propertyType,  setPropertyType]  = useState(asText(criteria?.["property-type"]));
  const [hostName,      setHostName]      = useState(asText(criteria?.["host-name"]));
  const [neighbourhood, setNeighbourhood] = useState(asText(criteria?.["neighbourhood"]));
  const [city,          setCity]          = useState(asText(criteria?.["city"]));
  const [checkInTime,   setCheckInTime]   = useState("3:00 PM");
  const [checkOutTime,  setCheckOutTime]  = useState("11:00 AM");
  const [wifiName,      setWifiName]      = useState("");
  const [wifiPassword,  setWifiPassword]  = useState("");
  const [bedrooms,      setBedrooms]      = useState("");
  const [maxGuests,     setMaxGuests]     = useState("");
  const [amenities,     setAmenities]     = useState("");
  const [houseRules,    setHouseRules]    = useState("");
  const [extraContext,  setExtraContext]  = useState("");

  const [content,  setContent]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [copied,   setCopied]   = useState(false);

  async function generate() {
    if (!propertyName.trim()) { setError("Enter your property name."); return; }
    setLoading(true); setError(""); setContent(""); setSaved(false);
    try {
      const res = await fetch("/api/members/str-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyName:  propertyName.trim(),
          propertyType:  propertyType.trim(),
          hostName:      hostName.trim(),
          neighbourhood: neighbourhood.trim(),
          city:          city.trim(),
          packType,
          checkInTime:   checkInTime.trim(),
          checkOutTime:  checkOutTime.trim(),
          wifiName:      wifiName.trim(),
          wifiPassword:  wifiPassword.trim(),
          bedrooms:      bedrooms ? parseInt(bedrooms) : undefined,
          maxGuests:     maxGuests ? parseInt(maxGuests) : undefined,
          amenities:     amenities.trim(),
          houseRules:    houseRules.trim(),
          extraContext:  extraContext.trim(),
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
    if (!welcomeDb || !content) return;
    setSaving(true);
    const properties: Record<string, string | number | boolean | null> = {
      "Document":  packType,
      "Property":  propertyName,
      "Content":   content,
      "Status":    "Draft",
    };
    const propertyTypes: Record<string, string> = {
      "Document": "title",
      "Property": "select",
      "Content":  "rich_text",
      "Status":   "select",
    };
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: welcomeDb.notionId, properties, propertyTypes }),
      });
      if (res.ok) {
        const data = await res.json() as { pageId?: string };
        if (data.pageId) { onRowAdded(welcomeDb.notionId, { pageId: data.pageId, properties }); }
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
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: N_FG, margin: "0 0 4px 0" }}>🏠 Welcome Pack</h2>
        <p style={{ fontSize: "13px", color: N_MUTED, margin: 0 }}>
          Generate polished welcome pack documents — letters, check-in guides, house rules and more.
        </p>
      </div>

      <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
        {/* Pack type picker */}
        <div style={{ marginBottom: "18px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "8px" }}>
            Document to Create
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {WELCOME_PACK_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setPackType(t)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "20px",
                  border: `1px solid ${packType === t ? ACCENT : N_BORDER}`,
                  background: packType === t ? ACCENT_LIGHT : "white",
                  color: packType === t ? ACCENT : N_MUTED,
                  fontSize: "13px",
                  fontWeight: packType === t ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {PACK_ICON[t]} {t}
              </button>
            ))}
          </div>
        </div>

        {/* Property details */}
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
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Host Name</label>
            <input
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="e.g. Sarah"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>City / Area</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Edinburgh"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Check-in Time</label>
            <input
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              placeholder="3:00 PM"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Check-out Time</label>
            <input
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              placeholder="11:00 AM"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* WiFi — always useful */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>WiFi Name</label>
            <input
              value={wifiName}
              onChange={(e) => setWifiName(e.target.value)}
              placeholder="e.g. HarbourCottage_WiFi"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>WiFi Password</label>
            <input
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
              placeholder="e.g. Welcome2024"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Bedrooms</label>
            <input
              type="number"
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              placeholder="e.g. 2"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Max Guests</label>
            <input
              type="number"
              value={maxGuests}
              onChange={(e) => setMaxGuests(e.target.value)}
              placeholder="e.g. 4"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Amenities (optional)</label>
            <input
              value={amenities}
              onChange={(e) => setAmenities(e.target.value)}
              placeholder="e.g. Hot tub, BBQ, parking, Netflix, washer/dryer"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Specific House Rules / Notes (optional)</label>
            <textarea
              value={houseRules}
              onChange={(e) => setHouseRules(e.target.value)}
              rows={3}
              placeholder="e.g. No shoes inside, quiet hours after 10pm, no smoking anywhere on the property"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Extra Context (optional)</label>
            <input
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              placeholder="Anything else that should be included…"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "13px", color: "#dc2626" }}>
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
          }}
        >
          {loading ? "Writing…" : `✨ Generate ${PACK_ICON[packType] ?? ""} ${packType} (1 credit)`}
        </button>
      </div>

      {/* Result */}
      {content && (
        <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: N_FG, margin: 0 }}>
              {PACK_ICON[packType]} {packType}
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
              {welcomeDb && (
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
                  {saved ? "✓ Saved" : saving ? "Saving…" : "💾 Save to Welcome Pack"}
                </button>
              )}
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={22}
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
            Edit freely — replace any [PLACEHOLDER] with your specific details before printing or sharing.
          </p>
        </div>
      )}
    </div>
  );
}
