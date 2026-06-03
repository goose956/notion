import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  topic:        z.string().trim().min(1),
  guest:        z.string().trim().default(""),
  guestBio:     z.string().trim().default(""),
  format:       z.string().trim().default("Interview"),
  length:       z.string().trim().default("20–45 mins"),
  angle:        z.string().trim().default(""),
  notes:        z.string().trim().default(""),
  podcastNiche: z.string().trim().default(""),
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

  const { topic, guest, guestBio, format, length, angle, notes, podcastNiche } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const isInterview = format.toLowerCase().includes("interview");

  const prompt = `You are an expert podcast producer. Create a detailed episode plan for the following podcast episode.

Topic: ${topic}
Format: ${format}
Episode length: ${length}
${podcastNiche ? `Podcast niche: ${podcastNiche}` : ""}
${guest     ? `Guest: ${guest}` : ""}
${guestBio  ? `Guest background: ${guestBio}` : ""}
${angle     ? `Angle / hook: ${angle}` : ""}
${notes     ? `Additional notes: ${notes}` : ""}

Write a complete episode plan with the following sections:

**EPISODE TITLE**
3 compelling title options. Each should be specific, benefit-led, and spark curiosity. No clickbait.

**HOOK (First 60 seconds)**
Write the exact opening hook script — the 3–4 sentences that grab listeners before anything else. Make it bold, specific, and promise a payoff.

**INTRO SCRIPT**
A natural, conversational 2–3 paragraph intro. Covers: brief welcome, what the episode is about, and why listeners should stay for the whole thing.

**EPISODE STRUCTURE**
A clear segment-by-segment breakdown scaled to the episode length:
- Segment name
- Duration (approximate)
- Key points to cover
- Transition into the next segment
${isInterview ? `
**INTERVIEW QUESTIONS**
10–12 specific, thoughtful interview questions — not generic. Include:
- 2–3 warm-up/backstory questions
- 5–6 deep-dive questions on the main topic
- 2–3 forward-looking or contrarian questions
- 1 rapid-fire or signature closing question
` : ""}
**KEY TALKING POINTS**
Bullet list of the 8–10 most important points, insights or stories to hit in this episode.

**OUTRO & CTA**
The closing 1–2 minutes: thank the ${isInterview ? "guest, " : ""}listener, recap the 3 biggest takeaways, and deliver a clear call to action (subscribe, review, share, next episode tease).

**PRODUCTION NOTES**
3–4 practical notes for the host: tone reminders, things to research beforehand, any sponsor placement suggestions, or post-production flags.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const plan = (msg.content[0] as { type: string; text: string }).text;
  const title = `Episode Plan: ${topic.slice(0, 60)}${topic.length > 60 ? "…" : ""}`;
  return NextResponse.json({ plan, title, episodeTopic: topic });
}
