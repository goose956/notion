import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCustomSkill, upsertCustomSkill, deleteCustomSkill } from "@niche-factory/db";

const PatchSchema = z.object({
  enabled: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { skillId: string } },
) {
  const { skillId } = params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  const existing = await getCustomSkill(skillId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await upsertCustomSkill({
    ...existing,
    ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
    updatedAt: new Date(),
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { skillId: string } },
) {
  await deleteCustomSkill(params.skillId);
  return NextResponse.json({ ok: true });
}
