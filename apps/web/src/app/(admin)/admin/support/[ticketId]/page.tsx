import { auth } from "@/auth";
import { getTicketWithMessages } from "@niche-factory/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AdminReplyForm } from "./admin-reply-form";
import { AdminStatusButton } from "./status-button";

export const dynamic = "force-dynamic";

function isAdminEmail(email: string | null | undefined): boolean {
  const raw = process.env["ADMIN_EMAIL"] ?? "";
  if (!raw.trim()) return true;
  const allowed = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes((email ?? "").toLowerCase());
}

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");

  const { ticketId } = await params;
  const result = await getTicketWithMessages(ticketId);
  if (!result) notFound();

  const { ticket, messages } = result;
  const isClosed = ticket.status === "closed";

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/support"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Support inbox
        </Link>
        <div className="flex items-start justify-between gap-4 mt-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight">{ticket.subject}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{ticket.customerEmail}</p>
          </div>
          <AdminStatusButton
            ticketId={ticketId}
            currentStatus={ticket.status as "open" | "closed"}
          />
        </div>
      </div>

      {/* Message thread */}
      <div className="space-y-3">
        {messages.map((msg) => {
          const isAdmin = msg.senderType === "admin";
          return (
            <div
              key={msg.id}
              className={`rounded-xl border p-4 ${
                isAdmin ? "bg-blue-50 border-blue-200" : "bg-card"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${isAdmin ? "text-blue-600" : "text-foreground"}`}>
                  {isAdmin ? "You (Admin)" : ticket.customerEmail}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(msg.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {msg.message}
              </p>
            </div>
          );
        })}
      </div>

      {/* Reply form */}
      <AdminReplyForm ticketId={ticketId} isClosed={isClosed} />
    </div>
  );
}

