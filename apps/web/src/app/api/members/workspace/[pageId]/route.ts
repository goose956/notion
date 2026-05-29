import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { updateAppRow, deleteAppRow } from "@niche-factory/db";

const BodySchema = z.object({
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  propertyTypes: z.record(z.string(), z.string()),
});

// PATCH /api/members/workspace/[pageId] — update properties on a row
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pageId } = await params;

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

  try {
    await updateAppRow(pageId, parsed.data.properties);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/members/workspace/[pageId] — delete a row
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pageId } = await params;

  try {
    await deleteAppRow(pageId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
