import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  creatorName: z.string().trim().min(1),
  platform:    z.string().trim().default(""),
  niche:       z.string().trim().min(1),
  goal:        z.string().trim().default(""),
  trendKeyword:z.string().trim().default(""),
  count:       z.number().int().min(1).max(20).default(10),
});

const CREDITS_PER_CALL = 1;

async function resolveApiKey(email: string): Promise<string | undefined> {
  const customerKey = await getSettingValue(`customer.${email}.anthropic.apiKey`);
  if (customerKey?.trim()) return customerKey.trim();
  const globalKey = await getSettingValue("anthropic.apiKey");
  if (globalKey?.trim()) return globalKey.trim();
  return process.env["ANTHROPIC_API_KEY"];
}

async function resolveModel(): Promise<string> {
  const model = await getSettingValue("anthropic.model");
  if (model?.trim()) return model.trim();
  return process.env["ANTHROPIC_MODEL"] ?? "claude-haiku-4-5";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  const userEmail = session.user.email;
  await findOrCreateCustomer(userEmail).catch(() => null);
  const credits = await getCustomerCredits(userEmail).catch(() => 0);
  if (credits < CREDITS_PER_CALL) {
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to generate ideas.` }, { status: 402 });
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const d = parsed.data;
  const context = [
    `Creator/channel: ${d.creatorName}`,
    d.platform    ? `Platform: ${d.platform}` : null,
    `Niche: ${d.niche}`,
    d.goal        ? `Goal: ${d.goal}` : null,
    d.trendKeyword ? `Trending angle to incorporate: ${d.trendKeyword}` : null,
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1500,
      system: `You are a viral content strategist who generates high-performing content ideas for creators.
Rules:
- Each idea should have a clear hook angle — curiosity gap, listicle, story, controversy, how-to, or personal experience
- Ideas must be specific, not generic. "5 ways to save money" is bad. "I paid off £20k debt in 18 months using this one rule" is good.
- Tailor format to the platform: TikTok/Reels = punchy hooks; YouTube = searchable titles; Blog = SEO angles; Twitter = threads
- Mix evergreen content with timely/trending angles
- Return valid JSON: {"ideas": [{"title": "...", "hook": "...", "format": "...", "angle": "..."}]}
  where angle is one of: curiosity-gap, how-to, personal-story, list, controversy, trend, challenge`,
      messages: [{
        role: "user",
        content: `Generate ${d.count} content ideas for:\n${context}\n\nReturn JSON only.`,
      }],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!raw) return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });

    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    let parsed2: { ideas?: unknown };
    try { parsed2 = JSON.parse(jsonStr); }
    catch { return NextResponse.json({ error: "AI returned invalid JSON.", raw }, { status: 502 }); }

    if (!Array.isArray(parsed2.ideas)) {
      return NextResponse.json({ error: "Unexpected AI response shape.", raw }, { status: 502 });
    }

    const ideas = (parsed2.ideas as unknown[]).map((item) => {
      const i = item as Record<string, unknown>;
      return {
        title:  String(i["title"]  ?? ""),
        hook:   String(i["hook"]   ?? ""),
        format: String(i["format"] ?? ""),
        angle:  String(i["angle"]  ?? ""),
      };
    }).filter((i) => i.title);

    await deductCredits(userEmail, CREDITS_PER_CALL);
    return NextResponse.json({ ideas });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 502 });
  }
}
