import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  creatorName: z.string().trim().min(1),
  platform:    z.string().trim().default("Instagram"),
  niche:       z.string().trim().default(""),
  topic:       z.string().trim().min(1),
  keyMessage:  z.string().trim().default(""),
  tone:        z.string().trim().default("conversational"),
  includeHook: z.boolean().default(true),
  includeCTA:  z.boolean().default(true),
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
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to generate captions.` }, { status: 402 });
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const d = parsed.data;

  const platformRules: Record<string, string> = {
    "Instagram": "Caption: 150-220 words. Start with a line-break hook. Use short paragraphs (2-3 lines max). Add 5 blank lines then 10-15 hashtags on separate lines.",
    "TikTok":    "Caption: 100-150 words. Very punchy. Include 3-5 highly relevant hashtags inline. First line is the hook. End with a question or CTA.",
    "Twitter/X": "Tweet: max 280 characters. Punchy, no hashtags (they hurt reach). Optional: suggest 3-5 reply hooks as follow-up tweets.",
    "YouTube":   "YouTube description: 200-300 words. Include a keyword-rich first paragraph. Add timestamps section placeholder. End with links/subscribe section placeholder. Include 5 relevant tags.",
    "LinkedIn":  "LinkedIn post: 200-250 words. Professional but personal tone. Hook in first line. Use line breaks generously. End with a question to drive comments. 3-5 relevant hashtags at end.",
    "Blog":      "Meta description (155 chars max) + social share caption (120 chars) for sharing the post. Also suggest 5 Pinterest pin descriptions (80 chars each).",
  };

  const rules = platformRules[d.platform] ?? platformRules["Instagram"]!;

  const context = [
    `Creator: ${d.creatorName}`,
    d.niche      ? `Niche: ${d.niche}` : null,
    `Platform: ${d.platform}`,
    `Topic: ${d.topic}`,
    d.keyMessage ? `Key message/angle: ${d.keyMessage}` : null,
    `Tone: ${d.tone}`,
    d.includeHook ? "Include a strong opening hook." : null,
    d.includeCTA  ? "Include a clear call-to-action." : null,
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 800,
      system: `You are an expert social media copywriter for content creators.
Platform rules: ${rules}
Write in a ${d.tone} tone. Sound human, not corporate.
Return valid JSON: {"caption": "...", "hook": "...", "hashtags": ["...", ...], "cta": "..."}
The "hook" field is just the opening line/sentence. "hashtags" is an array of tags without # symbol. "cta" is the call-to-action sentence only.`,
      messages: [{
        role: "user",
        content: `Write a ${d.platform} caption for:\n${context}\n\nReturn JSON only.`,
      }],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!raw) return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });

    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    let parsed2: { caption?: unknown; hook?: unknown; hashtags?: unknown; cta?: unknown };
    try { parsed2 = JSON.parse(jsonStr); }
    catch { return NextResponse.json({ error: "AI returned invalid JSON.", raw }, { status: 502 }); }

    const caption  = typeof parsed2.caption  === "string" ? parsed2.caption.trim()  : "";
    const hook     = typeof parsed2.hook     === "string" ? parsed2.hook.trim()     : "";
    const cta      = typeof parsed2.cta      === "string" ? parsed2.cta.trim()      : "";
    const hashtags = Array.isArray(parsed2.hashtags) ? (parsed2.hashtags as unknown[]).map(String) : [];

    if (!caption) return NextResponse.json({ error: "Incomplete caption generated.", raw }, { status: 502 });

    await deductCredits(userEmail, CREDITS_PER_CALL);
    return NextResponse.json({ caption, hook, cta, hashtags });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 502 });
  }
}
