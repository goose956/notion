import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  productName:  z.string().trim().min(1),
  category:     z.string().trim().default(""),
  marketplace:  z.string().trim().default("Amazon UK"),
  features:     z.string().trim().default(""),
  targetCustomer: z.string().trim().default(""),
  keywords:     z.string().trim().default(""),
  competitors:  z.string().trim().default(""),
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

  const { productName, category, marketplace, features, targetCustomer, keywords, competitors } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const isUS  = marketplace.toLowerCase().includes("us") || marketplace.toLowerCase().includes(".com");
  const locale = isUS ? "Amazon.com (US)" : "Amazon.co.uk (UK)";

  const prompt = `You are an expert Amazon listing copywriter. Write a fully optimised Amazon product listing for ${locale}. This should be ready to copy directly into Seller Central.

Product: ${productName}
${category       ? `Category: ${category}` : ""}
${features       ? `Key features / differentiators: ${features}` : ""}
${targetCustomer ? `Target customer: ${targetCustomer}` : ""}
${keywords       ? `Seed keywords to include: ${keywords}` : ""}
${competitors    ? `Main competitors / what to differentiate from: ${competitors}` : ""}

Write the complete listing:

**TITLE**
Write a single, highly optimised title. Rules:
- Max 200 characters (aim for 150–180)
- Lead with the primary keyword
- Include brand placeholder, key features, size/quantity if relevant
- No promotional phrases ("best", "sale", "#1")
- No symbols except hyphens and commas

**BULLET POINTS** (write exactly 5)
Each bullet must:
- Start with a short ALL-CAPS benefit hook (3–5 words)
- Follow with a 1–2 sentence explanation of the feature and why it matters to the customer
- Include a relevant keyword naturally
- Be 150–200 characters
- Focus on customer benefit, not just product specs

**PRODUCT DESCRIPTION**
- 300–400 words
- Written in engaging, customer-focused prose
- Tells a story: the problem → the solution → the outcome
- Reinforces key benefits from the bullets
- Ends with a clear call to action
- HTML-friendly (use line breaks, no complex formatting)

**BACKEND SEARCH TERMS**
- 250 characters maximum
- Space-separated keywords (no commas, no repetition of words already in title)
- Focus on synonyms, long-tail variations, and misspellings
- Do not include brand names of competitors

**LISTING NOTES**
3 brief notes on how the seller could further improve this listing (A+ content suggestions, image recommendations, etc.)`;

  const msg = await client.messages.create({
    model,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const listing = (msg.content[0] as { type: string; text: string }).text;
  const title   = `Listing: ${productName} (${isUS ? "US" : "UK"})`;
  return NextResponse.json({ listing, title, productName });
}
