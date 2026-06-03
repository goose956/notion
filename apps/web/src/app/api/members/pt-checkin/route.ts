import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  clientName:   z.string().trim().min(1),
  period:       z.string().trim().default("4 weeks"),
  goal:         z.string().trim().default(""),
  wins:         z.string().trim().default(""),
  challenges:   z.string().trim().default(""),
  nextFocus:    z.string().trim().default(""),
  tone:         z.enum(["motivational", "professional", "friendly", "direct"]).default("motivational"),
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

  const { clientName, period, goal, wins, challenges, nextFocus, tone } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const toneGuide: Record<string, string> = {
    motivational: "Warm, energetic and encouraging. Celebrate every win and frame every challenge as an opportunity.",
    professional: "Clear and professional. Objective, data-driven language. Like a coach writing a performance review.",
    friendly:     "Conversational and warm, like a message from a supportive friend who happens to be a PT.",
    direct:       "Concise and no-nonsense. Say what needs to be said clearly and efficiently.",
  };

  const prompt = `Write a client check-in message from a personal trainer to their client.

Client: ${clientName}
Check-in period: ${period}
${goal ? `Client's goal: ${goal}` : ""}
${wins ? `Wins / progress this period: ${wins}` : ""}
${challenges ? `Challenges or obstacles: ${challenges}` : ""}
${nextFocus ? `Focus for the next period: ${nextFocus}` : ""}

Tone: ${toneGuide[tone] ?? toneGuide["motivational"]}

Write the check-in message with these sections:

**Progress Review**
Acknowledge the client by name. Summarise what they've achieved this period — be specific about the wins mentioned. Frame any challenges constructively.

**What's Working**
2–3 specific things the client is doing well that are driving their progress. Be concrete.

**Areas to Build On**
1–2 honest, constructive areas to focus on next. Not criticism — coaching.

**Your Next Phase**
What the focus will be for the coming period and why. What to expect.

**Action Steps**
3 clear, specific things the client should do before the next check-in.

Write this as a message the trainer will send directly to the client — address them by name throughout. Keep it motivating without being generic. Make the client feel seen, not managed.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const checkin = (msg.content[0] as { type: string; text: string }).text;
  const title = `${clientName} — Check-In (${period})`;
  return NextResponse.json({ checkin, title, clientName });
}
