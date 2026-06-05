import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addCustomerWorkflow, removeCustomerWorkflow, removeAppWorkspaceByNiche, restoreAppWorkspaceByNiche } from "@niche-factory/db";
import { WORKFLOW_CATALOG } from "@/lib/workflow-catalog";

export const dynamic = "force-dynamic";

function parseSlug(body: unknown): string | null {
  const slug = (body as Record<string, unknown>)["slug"];
  if (typeof slug !== "string" || !WORKFLOW_CATALOG.some((w) => w.id === slug)) return null;
  return slug;
}

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = parseSlug(body);
  if (!slug) return NextResponse.json({ error: "Invalid workflow slug" }, { status: 400 });

  await addCustomerWorkflow(email, slug);
  // Restore workspace if it was previously removed
  await restoreAppWorkspaceByNiche(email, slug).catch(() => null);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = parseSlug(body);
  if (!slug) return NextResponse.json({ error: "Invalid workflow slug" }, { status: 400 });

  await removeCustomerWorkflow(email, slug);
  // Soft-delete the workspace — hides it from sidebar, preserves all data
  await removeAppWorkspaceByNiche(email, slug).catch(() => null);
  return NextResponse.json({ ok: true });
}
