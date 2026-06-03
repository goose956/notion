import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  guestName:    z.string().trim().min(1),
  guestExpert:  z.string().trim().default(""),
  guestWhy:     z.string().trim().default(""),
  episodeTopic: z.string().trim().default(""),
  audience:     z.string().trim().default(""),
  tone:         z.enum(["Professional", "Warm & Friendly", "Concise", "Enthusiastic"]).default("Professional"),
  podcastName:  z.string().trim().default(""),
  podcastNiche: z.string().trim().default(""),
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
  const email   = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body   = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { guestName, guestExpert, guestWhy, episodeTopic, audience, tone, podcastName, podcastNiche } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const toneGuide: Record<string, string> = {
    "Professional":    "Formal but warm. Clear and respectful. No slang. Shows you've done your research.",
    "Warm & Friendly": "Conversational and genuine. Like reaching out to someone you admire. Friendly without being sycophantic.",
    "Concise":         "Short and direct. Under 150 words for the main email. Every sentence earns its place.",
    "Enthusiastic":    "Energetic and passionate about the topic. Genuine excitement — not pushy or over-the-top.",
  };

  const prompt = `You are an expert at podcast guest outreach. Write a personalised, genuine guest outreach email that actually gets replies. Most cold outreach fails because it's generic — this must feel like it was written specifically for this person.

Guest: ${guestName}
${guestExpert   ? `Guest's expertise / role: ${guestExpert}` : ""}
${guestWhy      ? `Why this guest (personalisation hook): ${guestWhy}` : ""}
${episodeTopic  ? `Proposed episode topic / angle: ${episodeTopic}` : ""}
${audience      ? `Podcast audience: ${audience}` : ""}
${podcastName   ? `Podcast name: ${podcastName}` : ""}
${podcastNiche  ? `Podcast niche: ${podcastNiche}` : ""}
Tone: ${tone} — ${toneGuide[tone] ?? ""}

Write the full outreach package:

**SUBJECT LINE**
3 subject line options. Each must be specific (not generic like "Podcast Invitation"). Options should vary in approach: one direct, one curiosity-led, one that references the guest's work.

**MAIN EMAIL**
A complete, ready-to-send outreach email. Rules:
- Open with a specific, genuine compliment or observation about the guest's work — not "I love your content"
- Introduce yourself and the podcast briefly (2 sentences max)
- Clearly state why you want them specifically for this topic
- Give them a sense of the episode angle and why their audience will love it too
- Make the ask clear and easy to say yes to
- Short sign-off
- Total length: 150–250 words

**FOLLOW-UP EMAIL**
A 5–7 day follow-up. Shorter (under 100 words). Friendly, not pushy. Adds a small new hook or reason to reply.

**QUICK TIPS**
3 tactical tips for this specific outreach: best time/day to send, how to find their email, any personalisation angles to strengthen the message further.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const outreach = (msg.content[0] as { type: string; text: string }).text;
  const title    = `Guest Outreach: ${guestName}`;
  return NextResponse.json({ outreach, title, guestName });
}
