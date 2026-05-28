"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminReplyForm({
  ticketId,
  isClosed,
}: {
  ticketId: string;
  isClosed: boolean;
}) {
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
      const res = await fetch(`/api/admin/support/${ticketId}/reply`, {
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

  if (isClosed) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Ticket is closed. Reopen it to reply.
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-3">
      <textarea
        required
        maxLength={5000}
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write a reply to the customer…"
        className="w-full rounded-xl border bg-card px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !message.trim()}
        className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
      >
        {loading ? "Sending…" : "Send reply"}
      </button>
    </form>
  );
}
