import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getSettingValue, getNichePack } from "@niche-factory/db";

const Schema = z.object({
  nichePackId: z.string().optional(),
  nicheName: z.string().optional(),
}).refine((d) => d.nichePackId ?? d.nicheName, {
  message: "Provide nichePackId or nicheName",
});

/**
 * POST /api/ai/draft-landing-page
 * Generate condensed Facebook/paid-ads landing page copy for a niche pack.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = Schema.safeParse(body);
  if (!input.success) {
    return NextResponse.json({ error: "Validation failed", issues: input.error.issues }, { status: 422 });
  }

  // Resolve niche name
  let nicheName = input.data.nicheName ?? "";
  if (!nicheName && input.data.nichePackId) {
    try {
      const pack = await getNichePack(input.data.nichePackId);
      nicheName = pack?.name ?? "";
    } catch {
      // fall through with empty name
    }
  }
  if (!nicheName) {
    return NextResponse.json({ error: "Could not resolve niche name" }, { status: 400 });
  }

  const [apiKey, model] = await Promise.all([
    (process.env["ANTHROPIC_API_KEY"] ?? getSettingValue("anthropic.apiKey").catch(() => null)),
    getSettingValue("anthropic.model").catch(() => null),
  ]);
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are a direct-response copywriter writing condensed sales copy for a Facebook/paid-ad landing page.

Product: "${nicheName}" — an AI-powered Notion workspace from stridivo.com.
Positioning: Lead with what the AI *does* (specific actions — finds, drafts, scores, builds) not what's included.
Tone: Bold, direct. No fluff, no hype. Use short punchy sentences. This is not an SEO page — it's a conversion page.

Generate valid JSON with no extra text:
{
  "headline": "One punchy headline (max 10 words). Benefit or desire-led. No punctuation at end.",
  "subheadline": "One line expanding the promise. Max 15 words.",
  "hook": "1-2 sentences that name the pain or desire without being dramatic. Written like a human.",
  "bullets": [
    "AI does X for you — specific action verb, concrete result",
    "AI does Y for you — specific action verb, concrete result",
    "AI does Z for you — specific action verb, concrete result",
    "AI does W for you — specific action verb, concrete result"
  ],
  "result": "1-2 sentences describing the before/after or the main outcome. Specific and grounded.",
  "cta": "Call to action phrase (3-6 words, no punctuation)",
  "suggestedTitle": "A clean page title for saving: '[NicheName] Landing Page'",
  "suggestedSlug": "url-safe slug like 'wedding-planner-landing'"
}

Rules:
- Bullets must lead with what the AI *does* — not what the product contains
- No phrases like "game-changing", "revolutionary", "life-changing"
- No emojis
- Keep total copy under 150 words across all fields`;

  let text: string;
  try {
    const message = await client.messages.create({
      model: model ?? "claude-sonnet-4-5",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });
    const block = message.content[0];
    text = block?.type === "text" ? block.text : "";
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "AI returned non-JSON response", raw: text }, { status: 502 });
  }

  let draft: unknown;
  try {
    draft = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI JSON", raw: text }, { status: 502 });
  }

  return NextResponse.json({ draft, nicheName });
}
