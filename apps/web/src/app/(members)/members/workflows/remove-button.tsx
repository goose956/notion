"use client";

import { useState } from "react";

const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

export function RemoveWorkflowButton({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleRemove() {
    setLoading(true);
    try {
      await fetch("/api/members/workflows", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ fontFamily: N_FONT, fontSize: 11, color: "rgba(55,53,47,0.65)" }}>
          Remove?
        </span>
        <button
          onClick={() => void handleRemove()}
          disabled={loading}
          style={{
            fontFamily: N_FONT,
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 5,
            border: "1px solid rgba(239,68,68,0.4)",
            background: "rgba(239,68,68,0.1)",
            color: "#b91c1c",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "…" : "Yes, remove"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{
            fontFamily: N_FONT,
            fontSize: 11,
            fontWeight: 500,
            padding: "4px 10px",
            borderRadius: 5,
            border: "1px solid rgba(55,53,47,0.15)",
            background: "transparent",
            color: "rgba(55,53,47,0.65)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{
        fontFamily: N_FONT,
        fontSize: 11,
        fontWeight: 500,
        padding: "4px 10px",
        borderRadius: 5,
        border: "1px solid rgba(55,53,47,0.15)",
        background: "transparent",
        color: "rgba(55,53,47,0.5)",
        cursor: "pointer",
      }}
    >
      Remove
    </button>
  );
}
