"use client";
import { useState } from "react";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { asText, ACCENT, ACCENT_LIGHT, ACCENT_BORDER, MESSAGE_TYPES } from "./utils";

const N_FG     = "#111827";
const N_MUTED  = "#6b7280";
const N_BORDER = "#e5e7eb";
const N_BG     = "#f9fafb";

const MSG_ICON: Record<string, string> = {
  "Pre-arrival":       "✈️",
  "Check-in Day":      "🗝️",
  "Mid-stay Check-in": "😊",
  "Checkout Reminder": "🧹",
  "Review Request":    "⭐",
};

const MSG_DESC: Record<string, string> = {
  "Pre-arrival":       "Send 2–3 days before arrival",
  "Check-in Day":      "Send morning of arrival",
  "Mid-stay Check-in": "Send day 2–3 of longer stays",
  "Checkout Reminder": "Send evening before checkout",
  "Review Request":    "Send 24–48 hours after checkout",
};

const PLATFORMS = ["Airbnb", "Vrbo", "Booking.com", "Direct booking", "Other"];

export function STRGuestComms({
  criteria,
  messagesDb,
  onRowAdded,
}: {
  criteria:   Record<string, unknown> | null;
  messagesDb: WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const [messageType,  setMessageType]  = useState<string>(MESSAGE_TYPES[0]);
  const [propertyName, setPropertyName] = useState(asText(criteria?.["property-name"]));
  const [hostName,     setHostName]     = useState(asText(criteria?.["host-name"]));
  const [guestName,    setGuestName]    = useState("");
  const [checkInDate,  setCheckInDate]  = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [partySize,    setPartySize]    = useState("");
  const [platform,     setPlatform]     = useState("Airbnb");
  const [extraContext, setExtraContext] = useState("");

  const [message,  setMessage]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [copied,   setCopied]   = useState(false);

  async function generate() {
    if (!propertyName.trim()) { setError("Enter your property name."); return; }
    setLoading(true); setError(""); setMessage(""); setSaved(false);
    try {
      const res = await fetch("/api/members/str-guest-msg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyName: propertyName.trim(),
          hostName:     hostName.trim(),
          guestName:    guestName.trim(),
          messageType,
          checkInDate:  checkInDate.trim(),
          checkOutDate: checkOutDate.trim(),
          partySize:    partySize ? parseInt(partySize) : undefined,
          platform,
          extraContext: extraContext.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setMessage(data.message ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveToDb() {
    if (!messagesDb || !message) return;
    setSaving(true);
    const properties: Record<string, string | number | boolean | null> = {
      "Message Type": messageType,
      "Property":     propertyName,
      "Guest":        guestName || "—",
      "Platform":     platform,
      "Message":      message,
    };
    const propertyTypes: Record<string, string> = {
      "Message Type": "title",
      "Property":     "select",
      "Guest":        "rich_text",
      "Platform":     "select",
      "Message":      "rich_text",
    };
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: messagesDb.notionId, properties, propertyTypes }),
      });
      if (res.ok) {
        const data = await res.json() as { pageId?: string };
        if (data.pageId) { onRowAdded(messagesDb.notionId, { pageId: data.pageId, properties }); }
        setSaved(true);
      }
    } catch { /* silently fail */ }
    finally { setSaving(false); }
  }

  async function copyMessage() {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: N_FG, margin: "0 0 4px 0" }}>💬 Guest Messaging</h2>
        <p style={{ fontSize: "13px", color: N_MUTED, margin: 0 }}>
          AI writes warm, personalised guest messages for every stage of the booking journey.
        </p>
      </div>

      <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
        {/* Message type picker */}
        <div style={{ marginBottom: "18px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "8px" }}>
            Message Type
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {MESSAGE_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setMessageType(t)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: `1px solid ${messageType === t ? ACCENT : N_BORDER}`,
                  background: messageType === t ? ACCENT_LIGHT : "white",
                  color: messageType === t ? ACCENT : N_FG,
                  fontSize: "13px",
                  fontWeight: messageType === t ? 600 : 400,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: "18px", flexShrink: 0 }}>{MSG_ICON[t]}</span>
                <div>
                  <div style={{ fontWeight: messageType === t ? 700 : 500 }}>{t}</div>
                  <div style={{ fontSize: "11px", color: messageType === t ? ACCENT : N_MUTED }}>
                    {MSG_DESC[t]}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
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
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Host Name</label>
            <input
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="e.g. Sarah"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Guest Name (optional)</label>
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. James"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, background: "white", outline: "none", boxSizing: "border-box" }}
            >
              {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Check-in Date</label>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Check-out Date</label>
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Party Size</label>
            <input
              type="number"
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              placeholder="e.g. 2"
              style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>Extra Context (optional)</label>
            <input
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              placeholder="e.g. Celebrating anniversary, first visit"
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
          {loading ? "Writing message…" : `✨ Generate ${MSG_ICON[messageType] ?? ""} ${messageType} (1 credit)`}
        </button>
      </div>

      {/* Result */}
      {message && (
        <div style={{ background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: N_FG, margin: 0 }}>
              {MSG_ICON[messageType]} {messageType} Message
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={copyMessage}
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
              {messagesDb && (
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
                  {saved ? "✓ Saved" : saving ? "Saving…" : "💾 Save Message"}
                </button>
              )}
            </div>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={12}
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
            Edit before sending — replace any [PLACEHOLDER] with your actual access details.
          </p>
        </div>
      )}
    </div>
  );
}
