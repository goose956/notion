"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { ConfirmModal, type PendingConfirm } from "@/components/confirm-modal";

export function DeleteCustomerButton({ email }: { email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  async function doDelete() {
    setPendingConfirm(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const text = await res.text();
        alert(text || "Failed to delete customer");
        return;
      }

      router.refresh();
    } finally {
      setLoading(false);
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
      <button
        onClick={() =>
          setPendingConfirm({
            title: "Delete customer",
            message: `Permanently remove ${email}? This will delete their account row, purchases, and credits.`,
            confirmLabel: "Delete",
            onConfirm: () => void doDelete(),
          })
        }
        disabled={loading}
        title="Delete customer"
        className="inline-flex items-center justify-center rounded-md border border-destructive/40 text-destructive text-xs font-medium h-7 w-7 hover:bg-destructive/10 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </>
  );
}
