import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteUserConnection } from "@niche-factory/db";

/**
 * POST /api/connect/notion/disconnect
 *
 * Removes the user's stored Notion access token.
 */
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteUserConnection(session.user.email, "notion");
  return NextResponse.json({ ok: true });
}
