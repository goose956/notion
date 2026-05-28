import { auth } from "@/auth";
import { getUserTickets } from "@niche-factory/db";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Support — Niche Factory" };

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_BLUE = "rgb(35,131,226)";
const N_GREEN = "rgb(15,123,108)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const tickets = await getUserTickets(session.user.email);

  return (
    <div style={{ fontFamily: N_FONT, maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: N_FG, margin: 0 }}>Support</h1>
          <p style={{ fontSize: 14, color: N_MUTED, marginTop: 4 }}>
            Ask a question or report an issue
          </p>
        </div>
        <Link
          href="/members/support/new"
          style={{
            display: "inline-block",
            padding: "8px 18px",
            borderRadius: 8,
            background: N_BLUE,
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          New ticket
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            border: `1px dashed ${N_BORDER}`,
            borderRadius: 12,
            color: N_SUBTLE,
          }}
        >
          <p style={{ fontSize: 15, margin: 0 }}>No support tickets yet.</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>
            Open a ticket any time — we&apos;ll get back to you soon.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/members/support/${ticket.id}`}
              style={{
                display: "block",
                padding: "14px 18px",
                border: `1px solid ${N_BORDER}`,
                borderRadius: 10,
                textDecoration: "none",
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: N_FG, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ticket.subject}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 4,
                    flexShrink: 0,
                    background: ticket.status === "open" ? "rgba(35,131,226,0.12)" : "rgba(55,53,47,0.08)",
                    color: ticket.status === "open" ? N_BLUE : N_MUTED,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {ticket.status}
                </span>
              </div>
              <p style={{ fontSize: 13, color: N_SUBTLE, margin: "4px 0 0" }}>
                {new Date(ticket.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
