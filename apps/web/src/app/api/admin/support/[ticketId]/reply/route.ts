import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { addSupportMessage, getTicketWithMessages } from "@niche-factory/db";

function isAdminEmail(email: string | null | undefined): boolean {
  const raw = process.env["ADMIN_EMAIL"] ?? "";
  if (!raw.trim()) return true;
  const allowed = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes((email ?? "").toLowerCase());
}

const ReplySchema = z.object({
  message: z.string().min(1).max(5000),
});

/** POST /api/admin/support/[ticketId]/reply — admin adds a reply */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticketId } = await params;

  const result = await getTicketWithMessages(ticketId);
  if (!result) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
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
    await addSupportMessage(ticketId, "admin", parsed.data.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send reply";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
