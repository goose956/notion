import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPurchasedTemplates, linkNotionUserToCustomer } from "@niche-factory/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // Lazily link Notion user ID to customer record (fires if they bought before signing in)
  const notionUserId = (session as unknown as Record<string, unknown>)?.["notionUserId"];
  if (typeof notionUserId === "string") {
    linkNotionUserToCustomer(email, notionUserId).catch(() => undefined);
  }

  const templates = await getPurchasedTemplates(email);
  return NextResponse.json({ templates });
}
