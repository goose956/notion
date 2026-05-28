import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { addCustomerWorkflow } from "@niche-factory/db";
import { WORKFLOW_CATALOG } from "@/lib/workflow-catalog";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = (body as Record<string, unknown>)["slug"];
  if (typeof slug !== "string" || !WORKFLOW_CATALOG.some((w) => w.id === slug)) {
    return NextResponse.json({ error: "Invalid workflow slug" }, { status: 400 });
  }

  await addCustomerWorkflow(email, slug);
  return NextResponse.json({ ok: true });
}
