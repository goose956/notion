import { auth } from "@/auth";
import { getSupportTickets, getOpenTicketCount } from "@niche-factory/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";

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

export default async function AdminSupportPage() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) redirect("/");

  const [tickets, openCount] = await Promise.all([
    getSupportTickets(),
    getOpenTicketCount(),
  ]);

  const openTickets = tickets.filter((t) => t.status === "open");
  const closedTickets = tickets.filter((t) => t.status === "closed");

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {openCount} open {openCount === 1 ? "ticket" : "tickets"}
          </p>
        </div>
        <span className="icon-badge">
          <MessageSquare size={18} />
        </span>
      </div>

      {/* Open tickets */}
      {openTickets.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Open
          </h2>
          <div className="space-y-2">
            {openTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/admin/support/${ticket.id}` as never}
                className="block rounded-xl border bg-card p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-sm flex-1 min-w-0 truncate">
                    {ticket.subject}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold uppercase tracking-wide shrink-0">
                    open
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground truncate">
                    {ticket.customerEmail}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(ticket.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Closed tickets */}
      {closedTickets.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Closed
          </h2>
          <div className="space-y-2">
            {closedTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/admin/support/${ticket.id}` as never}
                className="block rounded-xl border bg-card p-4 hover:bg-accent transition-colors opacity-70"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-sm flex-1 min-w-0 truncate">
                    {ticket.subject}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold uppercase tracking-wide shrink-0">
                    closed
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground truncate">
                    {ticket.customerEmail}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(ticket.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {tickets.length === 0 && (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          No support tickets yet.
        </div>
      )}
    </div>
  );
}
