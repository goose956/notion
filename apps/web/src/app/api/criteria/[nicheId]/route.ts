import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getUserCriteria, upsertUserCriteria } from "@niche-factory/db";

// GET /api/criteria/[nicheId] — load saved settings for this user + niche
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ nicheId: string }> },
) {
  const session = await auth();
  const notionUserId = (session as Record<string, unknown> | null)?.["notionUserId"];
  if (typeof notionUserId !== "string") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { nicheId } = await params;
  try {
    const row = await getUserCriteria(notionUserId, nicheId);
    return NextResponse.json({ criteria: row?.criteria ?? null });
  } catch (err) {
    // Database unavailable or schema missing — return empty criteria so app continues
    const msg = err instanceof Error ? err.message : "Database error";
    console.error(`[GET /api/criteria/${nicheId}] ${msg}`);
    return NextResponse.json({ criteria: null });
  }
}

const PutSchema = z.object({
  criteria: z.record(z.string(), z.unknown()),
});

// PUT /api/criteria/[nicheId] — save / update settings for this user + niche
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ nicheId: string }> },
) {
  const session = await auth();
  const notionUserId = (session as Record<string, unknown> | null)?.["notionUserId"];
  if (typeof notionUserId !== "string") {
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
    return NextResponse.json(
      { error: "Validation failed", issues: input.error.issues },
      { status: 422 },
    );
  }

  const { nicheId } = await params;
  try {
    const row = await upsertUserCriteria(notionUserId, nicheId, input.data.criteria);
    return NextResponse.json({ criteria: row.criteria });
  } catch (err) {
    // Database unavailable or schema missing — just echo back what user sent
    const msg = err instanceof Error ? err.message : "Database error";
    console.error(`[PUT /api/criteria/${nicheId}] ${msg}`);
    // Don't fail the request — let the UI continue with the in-memory state
    return NextResponse.json({ criteria: input.data.criteria });
  }
}
