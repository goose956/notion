import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getAppDatabase, getAppWorkspaceForDatabase, createAppRow } from "@niche-factory/db";
import { randomUUID } from "node:crypto";

const BodySchema = z.object({
  databaseId: z.string().min(1),
  properties: z.record(z.string(), z.unknown()),
});

/**
 * POST /api/members/workspace-save
 *
 * Saves a result item to an in-app database row.
 * Used by in-app (non-Notion) users as the equivalent of /api/members/notion-add.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  const { databaseId, properties } = parsed.data;

  // Verify the database exists
  const appDb = await getAppDatabase(databaseId).catch(() => undefined);
  if (!appDb) {
    return NextResponse.json({ error: "Database not found" }, { status: 404 });
  }

  // Verify ownership — the workspace must belong to this user
  const workspace = await getAppWorkspaceForDatabase(databaseId).catch(() => undefined);
  if (!workspace || workspace.userId !== session.user.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await createAppRow({
      id: randomUUID(),
      databaseId,
      properties,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save row";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
