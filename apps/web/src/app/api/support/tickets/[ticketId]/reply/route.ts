import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { addSupportMessage, getTicketWithMessages } from "@niche-factory/db";

const ReplySchema = z.object({
  message: z.string().min(1).max(5000),
});

/** POST /api/support/tickets/[ticketId]/reply — user adds a reply */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticketId } = await params;

  // Verify ticket belongs to this user
  const result = await getTicketWithMessages(ticketId);
  if (!result) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  if (result.ticket.customerEmail !== session.user.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (result.ticket.status === "closed") {
    return NextResponse.json({ error: "Ticket is closed" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ReplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    await addSupportMessage(ticketId, "user", parsed.data.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send reply";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
