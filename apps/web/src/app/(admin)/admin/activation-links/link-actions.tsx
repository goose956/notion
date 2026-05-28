"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Ban } from "lucide-react";
import { ConfirmModal, type PendingConfirm } from "@/components/confirm-modal";

interface Props {
  token: string;
  revoked: boolean;
}

export function LinkActions({ token, revoked }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"revoke" | "delete" | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  async function doRevoke() {
    setPendingConfirm(null);
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

  async function doDelete() {
    setPendingConfirm(null);
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
    <>
      {pendingConfirm && (
        <ConfirmModal
          {...pendingConfirm}
          onCancel={() => setPendingConfirm(null)}
        />
      )}
      <div className="flex items-center gap-1">
        {!revoked && (
          <button
            type="button"
            onClick={() =>
              setPendingConfirm({
                title: "Revoke link",
                message: "Revoke this link? It will no longer be redeemable.",
                confirmLabel: "Revoke",
                onConfirm: () => void doRevoke(),
              })
            }
            disabled={loading != null}
            title="Revoke link"
            className="p-1.5 rounded hover:bg-amber-100 text-amber-600 transition-colors disabled:opacity-40"
          >
            <Ban className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            setPendingConfirm({
              title: "Delete link",
              message: "Permanently delete this link? This cannot be undone.",
              confirmLabel: "Delete",
              onConfirm: () => void doDelete(),
            })
          }
          disabled={loading != null}
          title="Delete link"
          className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
}
