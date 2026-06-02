import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  propertyName:  z.string().trim().min(1),
  hostName:      z.string().trim().default(""),
  guestName:     z.string().trim().default(""),
  messageType:   z.string().trim().min(1),
  checkInDate:   z.string().trim().default(""),
  checkOutDate:  z.string().trim().default(""),
  partySize:     z.number().optional(),
  platform:      z.string().trim().default("Airbnb"),
  extraContext:  z.string().trim().default(""),
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

const MESSAGE_PROMPTS: Record<string, string> = {
  "Pre-arrival": `Write a pre-arrival message to send to the guest 2–3 days before check-in. Include:
- Warm greeting and excitement about their upcoming stay
- Reminder of check-in time and how to access the property (use [ACCESS DETAILS] placeholder)
- Offer to answer any questions before they arrive
- Brief mention of the local area / what to look forward to
- Sign off with host name
Keep it friendly and concise — 3–4 short paragraphs. Should feel personal, not automated.`,

  "Check-in Day": `Write a check-in day message to send on the morning of arrival. Include:
- Warm welcome and excitement that it's their check-in day
- Key arrival logistics reminder (check-in time, access code — use [ACCESS CODE] placeholder)
- WiFi details reminder (use [WIFI NAME / PASSWORD] placeholder)
- Offer to be available if anything isn't perfect
- Short sign-off
Keep it short and scannable — they'll read it while travelling.`,

  "Mid-stay Check-in": `Write a brief mid-stay check-in message (send day 2 or 3 of a longer stay). Include:
- Friendly check-in asking if everything is going well
- Offer to help if anything needs attention
- A brief recommendation for something local they might enjoy
- Keep it genuinely warm — not a form letter
Under 100 words. Casual, friendly tone.`,

  "Checkout Reminder": `Write a checkout reminder message to send the evening before checkout. Include:
- Friendly reminder of checkout time
- Brief mention of the 2–3 most important checkout tasks (keys, locking up)
- Thank them for staying
- Mention you hope they had a wonderful time
- Leave the door open for a return visit
Keep it warm and brief — under 100 words.`,

  "Review Request": `Write a review request message to send 24–48 hours after checkout. Include:
- Thank them again for staying
- Mention it was a pleasure hosting them (personalise if guest name is known)
- Politely ask if they'd be willing to leave a review on the platform
- Offer a reciprocal review (you'll leave them a 5-star review)
- Warm sign-off
Keep it genuine and non-pushy — 3 short paragraphs.`,
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
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to generate a message.` }, { status: 402 });
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const d = parsed.data;
  const msgPrompt = MESSAGE_PROMPTS[d.messageType];
  if (!msgPrompt) return NextResponse.json({ error: "Unknown message type." }, { status: 422 });

  const context = [
    `Property: ${d.propertyName}`,
    d.hostName    ? `Host: ${d.hostName}` : null,
    d.guestName   ? `Guest name: ${d.guestName}` : null,
    d.checkInDate  ? `Check-in date: ${d.checkInDate}` : null,
    d.checkOutDate ? `Check-out date: ${d.checkOutDate}` : null,
    d.partySize    !== undefined ? `Party size: ${d.partySize}` : null,
    d.platform    ? `Platform: ${d.platform}` : null,
    d.extraContext ? `Extra context: ${d.extraContext}` : null,
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 500,
      system: `You are a hospitality expert writing guest messages for a short-term rental host.
Write in a warm, genuine, personal tone — not corporate or templated-sounding.
Use the guest's name if provided. Sign off with the host's name.
Use [PLACEHOLDER] for any property-specific details you don't have.`,
      messages: [{
        role: "user",
        content: `Details:\n${context}\n\nMessage to write: ${d.messageType}\n\n${msgPrompt}`,
      }],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    const message = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!message) return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });

    await deductCredits(userEmail, CREDITS_PER_CALL);
    return NextResponse.json({ messageType: d.messageType, message });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 502 });
  }
}
