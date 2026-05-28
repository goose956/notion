"use client";

import { useState } from "react";

const N_BLUE = "rgb(35,131,226)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

export function AddWorkflowButton({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleAdd() {
    setLoading(true);
    try {
      await fetch("/api/members/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      setDone(true);
      // Full reload so the sidebar layout re-fetches activeWorkflows from the server
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div
        style={{
          fontFamily: N_FONT,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "6px 12px",
          borderRadius: 6,
          background: "rgb(15,123,108)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        ✓ Added
      </div>
    );
  }

  return (
    <button
      onClick={() => void handleAdd()}
      disabled={loading}
      style={{
        fontFamily: N_FONT,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        borderRadius: 6,
        background: loading ? "rgba(35,131,226,0.6)" : N_BLUE,
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        border: "none",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "background 0.15s",
      }}
    >
      {loading ? "Adding…" : "＋ Add to workspace"}
    </button>
  );
}
