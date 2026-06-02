import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  shopName:    z.string().trim().min(1),
  listing:     z.string().trim().default(""),
  rating:      z.number().int().min(1).max(5),
  reviewText:  z.string().trim().default(""),
  shopType:    z.string().trim().default(""),
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
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to generate a reply.` }, { status: 402 });
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const d = parsed.data;
  const tone = d.rating >= 4 ? "warm and grateful" : d.rating === 3 ? "understanding and helpful" : "empathetic, professional and solution-focused";
  const goal = d.rating >= 4
    ? "Thank the buyer, reinforce what they loved, and invite them to shop again."
    : d.rating === 3
    ? "Acknowledge their feedback, explain anything relevant, and offer to help."
    : "Apologise sincerely, take responsibility, offer a resolution, and show you care about their experience.";

  const context = [
    `Shop name: ${d.shopName}`,
    d.shopType  ? `Shop type: ${d.shopType}` : null,
    d.listing   ? `Item purchased: ${d.listing}` : null,
    `Star rating: ${d.rating}/5`,
    d.reviewText ? `Review text: "${d.reviewText}"` : "(no review text left)",
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 300,
      system: `You are an expert Etsy seller writing review replies. Your tone is ${tone}.
${goal}
Keep replies to 2–4 sentences. Sound like a real human, not a corporate template. Never use the phrase "I'm sorry to hear that" — be more specific and genuine. Do not use hashtags or emojis unless the review itself used them.`,
      messages: [{
        role: "user",
        content: `Write a reply to this review:\n${context}`,
      }],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    const reply = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!reply) return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });

    await deductCredits(userEmail, CREDITS_PER_CALL);
    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 502 });
  }
}
