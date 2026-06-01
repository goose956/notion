import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  section:      z.string().trim().min(1),
  businessName: z.string().trim().min(1),
  foodType:     z.string().trim().default(""),
  premisesType: z.string().trim().default(""),
  goal:         z.string().trim().default(""),
  avgSpend:     z.number().optional(),
  foodCostPct:  z.number().optional(),
  fixedCosts:   z.number().optional(),
  country:      z.string().trim().default("United Kingdom"),
  extraContext: z.string().trim().default(""),
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

const SECTION_PROMPTS: Record<string, string> = {
  "Executive Summary": `Write a concise Executive Summary (3–4 paragraphs) for a food business covering:
1. What the business is, the concept, and the gap it fills in the local market
2. Target customer and unique selling proposition
3. Business model, revenue overview and pricing positioning
4. Primary goal and what success looks like in year 1
Tone should match the goal: bank loan = formal, side income = practical. Suitable for a lender or investor.`,

  "Market Analysis": `Write a Market Analysis (3–4 paragraphs) for a food business covering:
1. Target market: who they are, local demographics, dining/food habits
2. Key competitors: 2–3 examples with brief strengths and weaknesses
3. Current food industry trends that support this concept
4. The gap or opportunity this business fills locally
Be specific and credible. Avoid vague generalisations — use realistic estimates.`,

  "Operations Plan": `Write an Operations Plan (3–4 paragraphs) for a food business covering:
1. Day-to-day operations: opening hours, staffing, kitchen workflow
2. Supply chain: how ingredients are sourced, key supplier categories
3. Equipment and premises requirements
4. Food safety and hygiene management approach (HACCP, staff training)
Keep it practical and specific to the food type and premises described.`,

  "Financial Plan": `Write a Financial Plan summary (3–4 paragraphs) for a food business covering:
1. Revenue model: how money is made, pricing strategy, average transaction value
2. Key costs: food cost %, labour %, fixed overheads
3. Break-even analysis and target monthly revenue to cover costs
4. Funding requirements and how the business will reach profitability
Use the financial inputs provided. Be specific about the numbers.`,

  "Food Safety & Compliance": `Write a Food Safety & Compliance section (3–4 paragraphs) covering:
1. Food hygiene management system (HACCP principles, temperature control, allergen management)
2. Key registrations and licences required for this business type and country
3. Staff food hygiene training requirements and certifications
4. Ongoing compliance: inspections, record-keeping, renewal schedule
Tailor specifically to the food type and country provided. Be accurate about legal requirements.`,
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
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to generate a plan section.` }, { status: 402 });
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const d = parsed.data;
  const sectionPrompt = SECTION_PROMPTS[d.section];
  if (!sectionPrompt) return NextResponse.json({ error: "Unknown section." }, { status: 422 });

  const context = [
    `Business name: ${d.businessName}`,
    d.foodType     ? `Food business type: ${d.foodType}` : null,
    d.premisesType ? `Premises: ${d.premisesType}` : null,
    d.country      ? `Country: ${d.country}` : null,
    d.goal         ? `Primary goal: ${d.goal}` : null,
    d.avgSpend     !== undefined ? `Average customer spend: £${d.avgSpend}` : null,
    d.foodCostPct  !== undefined ? `Food cost %: ${d.foodCostPct}%` : null,
    d.fixedCosts   !== undefined ? `Fixed monthly costs: £${d.fixedCosts}` : null,
    d.extraContext ? `Additional context: ${d.extraContext}` : null,
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1000,
      system: `You are a professional business plan writer specialising in food businesses.
Write clearly, professionally and practically. Tailor tone to the goal (bank loan = formal, side income = conversational).
Use the specific business details provided. Do not invent numbers not given — estimate realistically where needed.
Return plain text only — no markdown headers, no bullet points unless naturally appropriate. Use paragraph breaks.`,
      messages: [{ role: "user", content: `Business details:\n${context}\n\nSection to write: ${d.section}\n\n${sectionPrompt}` }],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    const content = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!content) return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });

    await deductCredits(userEmail, CREDITS_PER_CALL);
    return NextResponse.json({ section: d.section, content });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 502 });
  }
}
