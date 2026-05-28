"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.16)";
const N_BLUE = "rgb(35,131,226)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

export default function NewTicketPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; ticket?: { id: string } };
      if (!res.ok) {
        setError(body.error ?? "Something went wrong");
        return;
      }
      if (body.ticket?.id) {
        router.push(`/members/support/${body.ticket.id}`);
      } else {
        router.push("/members/support");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: `1px solid ${N_BORDER}`,
    fontSize: 14,
    color: N_FG,
    outline: "none",
    fontFamily: N_FONT,
    boxSizing: "border-box",
  };

  return (
    <div style={{ fontFamily: N_FONT, maxWidth: 620, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/members/support" style={{ fontSize: 13, color: N_SUBTLE, textDecoration: "none" }}>
          ← Back to support
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: N_FG, margin: "12px 0 4px" }}>New ticket</h1>
        <p style={{ fontSize: 14, color: N_MUTED, margin: 0 }}>
          Describe your issue and we&apos;ll get back to you.
        </p>
      </div>

      <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: N_FG }}>Subject</label>
          <input
            type="text"
            required
            maxLength={200}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of your issue"
            style={inputStyle}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: N_FG }}>Message</label>
          <textarea
            required
            maxLength={5000}
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue in detail..."
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {error && (
          <p style={{ fontSize: 13, color: "rgb(235,87,87)", margin: 0 }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="submit"
            disabled={loading || !subject.trim() || !message.trim()}
            style={{
              padding: "9px 20px",
              borderRadius: 8,
              border: "none",
              background: N_BLUE,
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              fontFamily: N_FONT,
            }}
          >
            {loading ? "Sending…" : "Submit ticket"}
          </button>
          <Link
            href="/members/support"
            style={{ fontSize: 14, color: N_MUTED, textDecoration: "none" }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
