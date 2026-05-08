import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTemplateById, deleteTemplate } from "@niche-factory/db";

// DELETE /api/templates/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getTemplateById(id).catch(() => undefined);
  if (existing === undefined) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteTemplate(id);
  return NextResponse.json({ ok: true });
}
