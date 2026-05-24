import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getUserCriteria, upsertUserCriteria } from "@niche-factory/db";

function resolveUserId(session: unknown): string | null {
  const s = session as Record<string, unknown> | null;
  const user = (s?.["user"] as Record<string, unknown> | undefined) ?? undefined;
  const email = user?.["email"];
  const notionUserId = s?.["notionUserId"];
  if (typeof email === "string" && email.length > 0) return email;
  if (typeof notionUserId === "string" && notionUserId.length > 0) return notionUserId;
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ nicheId: string }> },
) {
  const session = await auth();
  const userId = resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nicheId } = await params;
  try {
    const row = await getUserCriteria(userId, nicheId);
    return NextResponse.json({ criteria: row?.criteria ?? null });
  } catch {
    return NextResponse.json({ criteria: null });
  }
}

const PutSchema = z.object({
  criteria: z.record(z.string(), z.unknown()),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ nicheId: string }> },
) {
  const session = await auth();
  const userId = resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = PutSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  const { nicheId } = await params;
  try {
    const row = await upsertUserCriteria(userId, nicheId, input.data.criteria);
    return NextResponse.json({ criteria: row.criteria });
  } catch {
    // Keep UX resilient if persistence layer is temporarily unavailable.
    return NextResponse.json({ criteria: input.data.criteria });
  }
}
