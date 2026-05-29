import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveNotionToken } from "@/lib/resolve-notion-token";
import { upsertSetting, getSettingValue } from "@niche-factory/db";
import { syncAppToNotion, syncScheduleKey } from "@/lib/notion-sync";

// ─── POST /api/members/sync-to-notion — manual push ──────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email;
  const sessionNotionToken = (session as unknown as Record<string, unknown>)["notionToken"] as string | undefined;
  const notionToken = await resolveNotionToken(userEmail, sessionNotionToken);

  if (!notionToken) {
    return NextResponse.json({ error: "Notion not connected" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({})) as { nicheId?: string };
  const nicheId = typeof body.nicheId === "string" ? body.nicheId : undefined;

  try {
    const result = await syncAppToNotion(userEmail, notionToken, nicheId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── GET /api/members/sync-to-notion?nicheId=xxx — read schedule ─────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nicheId = req.nextUrl.searchParams.get("nicheId");
  if (!nicheId) return NextResponse.json({ error: "nicheId required" }, { status: 400 });

  const key = syncScheduleKey(session.user.email, nicheId);
  const schedule = (await getSettingValue(key).catch(() => undefined)) ?? "off";
  return NextResponse.json({ schedule });
}

// ─── PUT /api/members/sync-to-notion — save schedule ─────────────────────────

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { nicheId?: string; schedule?: string };
  const { nicheId, schedule } = body;
  if (!nicheId || !["off", "daily", "weekly"].includes(schedule ?? "")) {
    return NextResponse.json({ error: "nicheId and schedule (off|daily|weekly) required" }, { status: 400 });
  }

  const key = syncScheduleKey(session.user.email, nicheId);
  await upsertSetting(key, schedule!);
  return NextResponse.json({ ok: true, schedule });
}
