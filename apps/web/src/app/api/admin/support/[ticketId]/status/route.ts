import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { setTicketStatus } from "@niche-factory/db";

function isAdminEmail(email: string | null | undefined): boolean {
  const raw = process.env["ADMIN_EMAIL"] ?? "";
  if (!raw.trim()) return true;
  const allowed = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes((email ?? "").toLowerCase());
}

const StatusSchema = z.object({
  status: z.enum(["open", "closed"]),
});

/** PATCH /api/admin/support/[ticketId]/status — open or close a ticket */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticketId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "status must be 'open' or 'closed'" }, { status: 400 });
  }

  try {
    await setTicketStatus(ticketId, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
