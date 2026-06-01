import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  section:      z.string().trim().min(1),
  businessName: z.string().trim().min(1),
  whatYouSell:  z.string().trim().min(1),
  businessType: z.string().trim().default(""),
  goal:         z.string().trim().default(""),
  pricePerSale: z.number().optional(),
  costPerSale:  z.number().optional(),
  fixedCosts:   z.number().optional(),
  targetCustomers: z.number().optional(),
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
  "Executive Summary": `Write a concise Executive Summary (3–4 paragraphs) covering:
1. What the business is and the problem it solves
2. Target market and unique value proposition
3. Business model and revenue overview
4. Primary goal and what success looks like in 12 months
Keep it professional but human — suitable for a bank loan application or investor pack.`,

  "Market Analysis": `Write a Market Analysis section (3–4 paragraphs) covering:
1. Target market description — who they are, size estimate, and key characteristics
2. Key competitors — 2–3 examples with brief strengths and weaknesses
3. Market trends supporting this business
4. The gap or opportunity this business is positioned to fill
Be specific and credible. Avoid vague claims — use realistic estimates.`,

  "Business Model": `Write a Business Model section (3–4 paragraphs) covering:
1. How the business makes money (revenue streams, pricing structure)
2. Cost structure — fixed and variable costs
3. Gross margin and unit economics
4. How the business scales — what drives growth
Include specific numbers where provided. Be clear and direct.`,

  "Operations Plan": `Write an Operations Plan section (3–4 paragraphs) covering:
1. Day-to-day operations — how the business runs
2. Key processes for delivering the product or service
3. Tools, systems, or suppliers required
4. Team or solo operator — how capacity scales with demand
Keep it practical and grounded in reality for a small business.`,

  "Financial Summary": `Write a Financial Summary section (2–3 paragraphs) covering:
1. Revenue and profit targets for year 1
2. Start-up or working capital required (if any)
3. Break-even point and key financial milestones
4. How the business will be funded
Use the financial inputs provided. Be specific with numbers.`,
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

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
  if (!sectionPrompt) {
    return NextResponse.json({ error: "Unknown section." }, { status: 422 });
  }

  const businessContext = [
    `Business name: ${d.businessName}`,
    `What they sell: ${d.whatYouSell}`,
    d.businessType ? `Business type: ${d.businessType}` : null,
    d.goal         ? `Primary goal: ${d.goal}` : null,
    d.pricePerSale    !== undefined ? `Price per sale: £${d.pricePerSale}` : null,
    d.costPerSale     !== undefined ? `Variable cost per sale: £${d.costPerSale}` : null,
    d.fixedCosts      !== undefined ? `Fixed monthly costs: £${d.fixedCosts}` : null,
    d.targetCustomers !== undefined ? `Target customers per month: ${d.targetCustomers}` : null,
    d.extraContext ? `Additional context: ${d.extraContext}` : null,
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1000,
      system: `You are a professional business plan writer helping a small business or side hustle owner create a compelling business plan.
Write clearly and professionally. Tailor the tone to the stated goal (bank loan = formal, investor = confident, quit job = practical).
Use the business details provided. Do not make up numbers that weren't given — estimate realistically where needed.
Return plain text only — no markdown headers, no bullet points unless naturally appropriate. Use paragraph breaks.`,
      messages: [
        {
          role: "user",
          content: `Business details:\n${businessContext}\n\nSection to write: ${d.section}\n\n${sectionPrompt}`,
        },
      ],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    const content = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });
    }

    await deductCredits(userEmail, CREDITS_PER_CALL);
    return NextResponse.json({ section: d.section, content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate plan section";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
