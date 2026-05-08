import { NextRequest, NextResponse } from "next/server";
import { incrementTemplateView, incrementTemplateClick } from "@niche-factory/db";

// POST /api/templates/track — fire-and-forget analytics
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { slug, event } = body as { slug?: string; event?: string };
  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  try {
    if (event === "click") {
      await incrementTemplateClick(slug);
    } else {
      await incrementTemplateView(slug);
    }
  } catch {
    // Analytics failure is non-fatal
  }

  return NextResponse.json({ ok: true });
}
