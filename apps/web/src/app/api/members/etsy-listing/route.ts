import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  shopName:    z.string().trim().min(1),
  shopType:    z.string().trim().default(""),
  productName: z.string().trim().min(1),
  description: z.string().trim().default(""),
  targetBuyer: z.string().trim().default(""),
  keywords:    z.string().trim().default(""),
  price:       z.number().optional(),
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
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to generate a listing.` }, { status: 402 });
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const d = parsed.data;
  const context = [
    `Shop name: ${d.shopName}`,
    d.shopType    ? `Shop type: ${d.shopType}` : null,
    `Product: ${d.productName}`,
    d.description ? `Product description: ${d.description}` : null,
    d.targetBuyer ? `Target buyer: ${d.targetBuyer}` : null,
    d.keywords    ? `Key terms to include: ${d.keywords}` : null,
    d.price !== undefined ? `Price: $${d.price}` : null,
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1200,
      system: `You are an expert Etsy SEO copywriter. You write listings that rank in Etsy search AND convert browsers into buyers.

Rules:
- Title: exactly 140 characters max, front-load the most searched keywords, use commas and pipes as natural separators, no ALL CAPS
- Description: 150–200 words, start with the buyer benefit, describe the product clearly, include care/download instructions if relevant, end with a call to action
- Tags: exactly 13 tags, each max 20 characters, mix specific long-tail (3-4 words) and broader terms, no duplicates with title words that are already there
- Format your response as valid JSON: {"title": "...", "description": "...", "tags": ["tag1", "tag2", ...]}`,
      messages: [{
        role: "user",
        content: `Generate an SEO-optimised Etsy listing for:\n${context}\n\nReturn JSON only.`,
      }],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!raw) return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });

    // Strip optional ```json fence
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    let parsed2: { title?: unknown; description?: unknown; tags?: unknown };
    try {
      parsed2 = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON.", raw }, { status: 502 });
    }

    const title       = typeof parsed2.title === "string"       ? parsed2.title.trim()       : "";
    const description = typeof parsed2.description === "string" ? parsed2.description.trim() : "";
    const tags        = Array.isArray(parsed2.tags)             ? (parsed2.tags as unknown[]).map(String) : [];

    if (!title || !description || tags.length === 0) {
      return NextResponse.json({ error: "Incomplete listing generated.", raw }, { status: 502 });
    }

    await deductCredits(userEmail, CREDITS_PER_CALL);
    return NextResponse.json({ title, description, tags });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 502 });
  }
}
