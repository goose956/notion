"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const N_FG = "#37352F";
const N_BORDER = "rgba(55,53,47,0.16)";
const N_BLUE = "rgb(35,131,226)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

export function SupportReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Something went wrong");
        return;
      }
      setMessage("");
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <textarea
        required
        maxLength={5000}
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write a reply…"
        style={{
          width: "100%",
          padding: "9px 12px",
          borderRadius: 8,
          border: `1px solid ${N_BORDER}`,
          fontSize: 14,
          color: N_FG,
          resize: "vertical",
          fontFamily: N_FONT,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {error && (
        <p style={{ fontSize: 13, color: "rgb(235,87,87)", margin: 0 }}>{error}</p>
      )}
      <div>
        <button
          type="submit"
          disabled={loading || !message.trim()}
          style={{
            padding: "8px 18px",
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
          {loading ? "Sending…" : "Send reply"}
        </button>
      </div>
    </form>
  );
}
