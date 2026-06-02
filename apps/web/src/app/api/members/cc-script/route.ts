import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  creatorName:  z.string().trim().min(1),
  platform:     z.string().trim().default("YouTube"),
  niche:        z.string().trim().default(""),
  title:        z.string().trim().min(1),
  keyPoints:    z.string().trim().default(""),
  tone:         z.string().trim().default("conversational"),
  targetLength: z.string().trim().default("medium"),  // short | medium | long
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

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  "YouTube": `Write a full YouTube video script with:
- [HOOK] (first 30 seconds — open loop, bold claim, or surprising statement)
- [INTRO] (brief creator intro and what viewers will get)
- [MAIN CONTENT] (body broken into clear sections with headers)
- [CTA] (subscribe/like/comment call to action)
- [OUTRO] (wrap up + tease next video)
Use natural spoken language. Mark pauses with [PAUSE] and B-roll cues with [B-ROLL: description].`,

  "TikTok": `Write a TikTok script (60-90 seconds max) with:
- [HOOK] (first 3 seconds — the exact words that stop the scroll)
- [CONTENT] (punchy, fast-paced, one idea per sentence)
- [CTA] (follow, duet, or comment prompt)
Write for spoken delivery. Short sentences. High energy. No filler.`,

  "Instagram": `Write an Instagram Reel script (30-60 seconds) with:
- [HOOK] (attention-grabbing opening line — shown as text overlay)
- [CONTENT] (quick points, visual storytelling)
- [CTA] (save, follow, or share prompt)
Also include a [CAPTION] section (150-200 words with 5-10 hashtags).`,

  "Blog": `Write a blog post outline and introduction with:
- [SEO TITLE] (optimised for search)
- [META DESCRIPTION] (150 chars max)
- [INTRO] (150-200 words, hook the reader, state the problem)
- [OUTLINE] (H2 and H3 headings with 1-line description of each section)
- [CONCLUSION PROMPT] (what the full conclusion should cover)`,

  "Podcast": `Write a podcast episode outline with:
- [COLD OPEN] (30-second teaser/hook — read before intro music)
- [INTRO] (welcome, episode summary, sponsor slot placeholder)
- [SEGMENT OUTLINE] (numbered segments with talking points)
- [OUTRO] (sign off, subscribe CTA, next episode tease)
Include natural transition phrases between segments.`,

  "Twitter/X": `Write a Twitter/X thread with:
- [TWEET 1] (hook tweet — bold claim or surprising fact, max 280 chars)
- [TWEETS 2-8] (expand the idea, one point per tweet)
- [FINAL TWEET] (summary + follow CTA)
Each tweet must be under 280 characters. Number them clearly.`,
};

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
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to generate a script.` }, { status: 402 });
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const d = parsed.data;
  const platformInstructions = PLATFORM_INSTRUCTIONS[d.platform] ?? PLATFORM_INSTRUCTIONS["YouTube"]!;
  const lengthGuide = d.targetLength === "short" ? "Keep it concise — aim for the minimum viable length." :
                      d.targetLength === "long"  ? "Be thorough and detailed." :
                      "Aim for a balanced medium length.";

  const context = [
    `Creator: ${d.creatorName}`,
    d.niche    ? `Niche: ${d.niche}` : null,
    `Platform: ${d.platform}`,
    `Topic/Title: ${d.title}`,
    d.keyPoints ? `Key points to cover: ${d.keyPoints}` : null,
    `Tone: ${d.tone}`,
    lengthGuide,
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 2000,
      system: `You are an expert content writer and scriptwriter for digital creators.
Write in the creator's natural voice — ${d.tone} tone.
Use their name when relevant to personalise the script.
${platformInstructions}
Return plain text with clear section labels in [BRACKETS].`,
      messages: [{
        role: "user",
        content: `Write a ${d.platform} script for:\n${context}`,
      }],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    const script = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!script) return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });

    await deductCredits(userEmail, CREDITS_PER_CALL);
    return NextResponse.json({ script, platform: d.platform, title: d.title });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 502 });
  }
}
