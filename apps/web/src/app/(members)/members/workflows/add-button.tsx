"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const N_BLUE = "rgb(35,131,226)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

export function AddWorkflowButton({ slug }: { slug: string }) {
  const router = useRouter();
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
      router.refresh();
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
          gap: 6,
          padding: "10px 20px",
          borderRadius: 8,
          background: "rgb(15,123,108)",
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        ✓ Added to your workspace
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
        gap: 8,
        padding: "10px 24px",
        borderRadius: 8,
        background: loading ? "rgba(35,131,226,0.6)" : N_BLUE,
        color: "#fff",
        fontSize: 15,
        fontWeight: 600,
        border: "none",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "background 0.15s",
      }}
    >
      {loading ? "Adding…" : "＋ Add to my workspace"}
    </button>
  );
}
