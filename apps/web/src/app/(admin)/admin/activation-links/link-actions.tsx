"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Ban } from "lucide-react";

interface Props {
  token: string;
  revoked: boolean;
}

export function LinkActions({ token, revoked }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"revoke" | "delete" | null>(null);

  async function handleRevoke() {
    if (!confirm("Revoke this link? It will no longer be redeemable.")) return;
    setLoading("revoke");
    try {
      await fetch("/api/admin/activation-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete() {
    if (!confirm("Permanently delete this link? This cannot be undone.")) return;
    setLoading("delete");
    try {
      await fetch(`/api/admin/activation-links?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-1">
      {!revoked && (
        <button
          type="button"
          onClick={handleRevoke}
          disabled={loading != null}
          title="Revoke link"
          className="p-1.5 rounded hover:bg-amber-100 text-amber-600 transition-colors disabled:opacity-40"
        >
          <Ban className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading != null}
        title="Delete link"
        className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
