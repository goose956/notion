import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  productIdea:  z.string().trim().min(1),
  category:     z.string().trim().default(""),
  marketplace:  z.string().trim().default("Amazon UK"),
  budget:       z.string().trim().default(""),
  notes:        z.string().trim().default(""),
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

  const { productIdea, category, marketplace, budget, notes } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const isUS     = marketplace.toLowerCase().includes("us") || marketplace.toLowerCase().includes(".com");
  const currency = isUS ? "USD ($)" : "GBP (£)";
  const locale   = isUS ? "Amazon.com (US)" : "Amazon.co.uk (UK)";

  const prompt = `You are an experienced Amazon FBA product researcher. Write a thorough, honest product viability report for an FBA seller considering launching the following product. Be specific and data-driven — give real numbers and benchmarks where possible. Do not be vague or overly positive.

Product idea: ${productIdea}
${category    ? `Category: ${category}` : ""}
Marketplace: ${locale}
${budget      ? `Available launch budget: ${budget}` : ""}
${notes       ? `Additional context: ${notes}` : ""}
Currency: ${currency}

Write a complete product viability report with the following sections:

**Product Summary**
One clear sentence describing the product and the exact customer it serves.

**Market Demand**
- Estimated monthly search volume for the main keyword (give a realistic range)
- Whether demand is growing, stable, or declining — and why
- Seasonal patterns if relevant
- Number of units the top 10 sellers move per month (realistic estimate)

**Competition Analysis**
- How many competing listings are there on ${locale}?
- Quality of existing listings (well-optimised vs weak?)
- Average review count of top sellers
- Estimated time to compete (months to get sufficient reviews)
- Barriers to entry (patents, regulations, brand dominance?)

**Profit Estimate**
Using realistic ${currency} figures:
- Estimated landed cost per unit (manufacturing + shipping from China or equivalent)
- Amazon FBA fees (referral fee ~15%, fulfilment fee estimate)
- Estimated selling price range on ${locale}
- Gross margin per unit
- Break-even units per month
- Return on investment at 3 months, 6 months

**Risks**
3–5 specific risks for this exact product — not generic FBA risks. Be honest.

**Opportunities**
2–3 genuine angles to differentiate or win in this market.

**Verdict**
A clear recommendation: ✅ GO | ⚠️ TEST CAREFULLY | ❌ AVOID
Give a one-paragraph justification. Be direct — don't hedge everything.

**Next Steps**
If the verdict is GO or TEST: the 5 specific things the seller should do next (in order).`;

  const msg = await client.messages.create({
    model,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const report = (msg.content[0] as { type: string; text: string }).text;
  const title  = `Research: ${productIdea}`;
  return NextResponse.json({ report, title, productName: productIdea });
}
