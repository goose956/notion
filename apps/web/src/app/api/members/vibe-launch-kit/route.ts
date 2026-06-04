import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  projectName:    z.string().trim().min(1),
  tagline:        z.string().trim().default(""),
  whatItDoes:     z.string().trim().min(1),
  targetAudience: z.string().trim().default(""),
  uniqueAngle:    z.string().trim().default(""),
  pricing:        z.string().trim().default(""),
  platforms:      z.array(z.string()).default(["Product Hunt", "Hacker News", "Twitter/X"]),
});

const CREDITS_PER_CALL = 2;

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
  const email   = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body   = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { projectName, tagline, whatItDoes, targetAudience, uniqueAngle, pricing, platforms } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const platformSections = platforms.map((p) => {
    switch (p) {
      case "Product Hunt": return `
**🐱 PRODUCT HUNT**
Tagline: (max 60 chars — punchy, benefit-led, no hype words)
Description: (260–300 chars — what it does, who it's for, why it's worth trying. No fluff.)
First comment: (200–300 words — founder story, the problem you personally faced, how you built it, what you're looking for from the community. Genuine, not salesy.)
Topics: list 3–5 relevant Product Hunt topics to tag`;

      case "Hacker News": return `
**🟠 HACKER NEWS — Show HN**
Title: "Show HN: ${projectName} – [one line description]"
Body: (150–250 words — what you built, why you built it, the interesting technical/product decisions, what you're looking for from HN. Must follow HN culture: no hype, technical credibility, genuine curiosity. Start with what it does.)`;

      case "Twitter/X": return `
**🐦 TWITTER / X — LAUNCH THREAD**
Write a 6-tweet launch thread. Format each tweet as:
Tweet 1/6: (The hook — strong opening that stops the scroll. Announce the launch.)
Tweet 2/6: (The problem — make the reader feel the pain point)
Tweet 3/6: (The solution — what it does, show don't tell)
Tweet 4/6: (Behind the scenes / how you built it — indie hackers love this)
Tweet 5/6: (Social proof or specific use case — even if just "I built this because I needed it")
Tweet 6/6: (CTA — link, ask for RT, invite feedback. Keep it short.)
Each tweet max 260 chars.`;

      case "Reddit": return `
**🤖 REDDIT**
Suggested subreddits: list 4–5 most relevant subreddits with reasoning
Post title: (specific and humble — not "Check out my new app!" — Reddit hates that)
Post body: (200–350 words — explain what you built, why, what makes it interesting or different. Self-promotion tone kills posts. Write like you're sharing something useful, not selling.)`;

      case "LinkedIn": return `
**💼 LINKEDIN**
Post: (200–250 words — professional but personal. Lead with the lesson or story, not the product. What problem led you to build this? What did you learn? Mention the product naturally. End with a clear CTA. LinkedIn rewards vulnerability and insight over pure promotion.)`;

      default: return "";
    }
  }).filter(Boolean).join("\n");

  const prompt = `You are a launch copywriter who specialises in indie hacker and solo founder launches. Write compelling, platform-native launch content for each requested platform. Each piece must feel like it was written by the founder — authentic, specific, not corporate. No hype words (revolutionary, game-changing, disruptive). No generic filler.

Project: ${projectName}
${tagline        ? `Tagline: ${tagline}` : ""}
What it does: ${whatItDoes}
${targetAudience ? `Target audience: ${targetAudience}` : ""}
${pricing        ? `Pricing: ${pricing}` : ""}
${uniqueAngle    ? `Unique angle / story: ${uniqueAngle}` : ""}

Write launch content for each platform:
${platformSections}

---
**LAUNCH DAY CHECKLIST**
10 tactical things to do on launch day to maximise visibility (timing, engagement tactics, cross-posting, community warm-up, etc.)`;

  const msg = await client.messages.create({
    model,
    max_tokens: 2200,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const kit = (msg.content[0] as { type: string; text: string }).text;
  const title = `Launch Kit: ${projectName}`;
  return NextResponse.json({ kit, title, projectName });
}
