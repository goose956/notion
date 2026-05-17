import { type NextRequest, NextResponse } from "next/server";
import { recordPageView } from "@niche-factory/db";

export const runtime = "nodejs";

/**
 * POST /api/track
 * Lightweight analytics beacon. Called from client components.
 * Body: { path: string; referrer?: string }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as { path?: unknown; referrer?: unknown };
    const path = typeof body.path === "string" ? body.path : null;
    if (!path) return NextResponse.json({ ok: false }, { status: 400 });

    const ua = req.headers.get("user-agent");
    const referrer = typeof body.referrer === "string" ? body.referrer : req.headers.get("referer");
    // Cloudflare populates CF-IPCountry; Railway may not, so it's optional
    const country = req.headers.get("cf-ipcountry") ?? req.headers.get("x-vercel-ip-country");

    // Fire-and-forget — recordPageView never throws
    await recordPageView({ path, referrer, userAgent: ua, country });

    return NextResponse.json({ ok: true });
  } catch {
    // Never fail a tracking request
    return NextResponse.json({ ok: true });
  }
}
