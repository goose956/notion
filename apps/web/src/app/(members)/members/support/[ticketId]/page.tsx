import { auth } from "@/auth";
import { getTicketWithMessages } from "@niche-factory/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { SupportReplyForm } from "./reply-form";

export const dynamic = "force-dynamic";

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_BORDER_MED = "rgba(55,53,47,0.16)";
const N_BLUE = "rgb(35,131,226)";
const N_GREEN = "rgb(15,123,108)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

export default async function TicketThreadPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const { ticketId } = await params;
  const result = await getTicketWithMessages(ticketId);
  if (!result) notFound();
  if (result.ticket.customerEmail !== session.user.email) notFound();

  const { ticket, messages } = result;
  const isClosed = ticket.status === "closed";

  return (
    <div style={{ fontFamily: N_FONT, maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href={"/members/support" as never} style={{ fontSize: 13, color: N_SUBTLE, textDecoration: "none" }}>
          ← Back to support
        </Link>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginTop: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: N_FG, margin: 0, flex: 1 }}>
            {ticket.subject}
          </h1>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 9px",
              borderRadius: 4,
              flexShrink: 0,
              background: isClosed ? "rgba(55,53,47,0.08)" : "rgba(35,131,226,0.12)",
              color: isClosed ? N_MUTED : N_BLUE,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginTop: 4,
            }}
          >
            {ticket.status}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
        {messages.map((msg) => {
          const isAdmin = msg.senderType === "admin";
          return (
            <div
              key={msg.id}
              style={{
                padding: "14px 18px",
                borderRadius: 10,
                border: `1px solid ${isAdmin ? N_BORDER_MED : N_BORDER}`,
                background: isAdmin ? "rgba(35,131,226,0.04)" : "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: isAdmin ? N_BLUE : N_FG }}>
                  {isAdmin ? "Support" : "You"}
                </span>
                <span style={{ fontSize: 12, color: N_SUBTLE }}>
                  {new Date(msg.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p style={{ fontSize: 14, color: N_FG, margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {msg.message}
              </p>
            </div>
          );
        })}
      </div>

      {/* Reply form or closed notice */}
      {isClosed ? (
        <div
          style={{
            padding: "16px 18px",
            borderRadius: 10,
            border: `1px dashed ${N_BORDER}`,
            textAlign: "center",
            color: N_SUBTLE,
            fontSize: 14,
          }}
        >
          This ticket is closed. Open a new ticket if you need further help.
        </div>
      ) : (
        <SupportReplyForm ticketId={ticketId} />
      )}
    </div>
  );
}
