"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminStatusButton({
  ticketId,
  currentStatus,
}: {
  ticketId: string;
  currentStatus: "open" | "closed";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const newStatus = currentStatus === "open" ? "closed" : "open";

  async function handleClick() {
    setLoading(true);
    try {
      await fetch(`/api/admin/support/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={() => { void handleClick(); }}
      disabled={loading}
      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-50 ${
        currentStatus === "open"
          ? "bg-muted text-muted-foreground hover:bg-muted/80"
          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
      }`}
    >
      {loading ? "…" : currentStatus === "open" ? "Close ticket" : "Reopen ticket"}
    </button>
  );
}
