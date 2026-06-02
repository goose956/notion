import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  section:       z.string().trim().min(1),
  businessName:  z.string().trim().min(1),
  operationType: z.string().trim().default(""),
  speciality:    z.string().trim().default(""),
  goal:          z.string().trim().default(""),
  country:       z.string().trim().default("United Kingdom"),
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

const SECTION_PROMPTS: Record<string, string> = {
  "Executive Summary": `Write a concise Executive Summary (3–4 paragraphs) for a cake business covering:
1. The business concept — what makes this cake business distinctive (style, speciality, market gap)
2. Target customer: who they are, what occasions/needs drive them to order a custom cake
3. Business model: custom orders, wedding cakes, event supply, market stall, online — explain the revenue mix
4. Primary goal and what success looks like in year 1
Tone should be warm yet professional. If goal is funding — write formally for a lender. Otherwise conversational and passionate about baking.`,

  "Product Range & Pricing": `Write a Product Range & Pricing section (3–4 paragraphs) covering:
1. Core product categories: celebration cakes, wedding tiers, cupcakes, traybakes, vegan/free-from options — describe each with 1–2 sentences
2. Pricing strategy: why cake makers should price based on ingredients + time + overhead + profit (not comparison shopping). Emphasise the value of skill and artistry
3. Pricing tiers / examples: entry-level (simple single tier), mid-range (2-tier custom), premium (multi-tier wedding). Use realistic price ranges for the country and operation type
4. Add-on revenue: delivery, tasting boxes, cake toppers, rental stands, express orders
Highlight that underpricing is the #1 mistake cake businesses make.`,

  "Sales & Marketing": `Write a Sales & Marketing section (3–4 paragraphs) covering:
1. Primary acquisition channels for cake businesses: Instagram/TikTok (before/after process videos, finished cakes), Google Business, word of mouth, wedding fairs, Etsy/Not On The High Street
2. Content strategy: what to post to build an audience — process videos, ingredient breakdowns, behind-the-scenes, client reveals
3. Enquiry to conversion process: how to handle DMs, quote quickly, take deposits, reduce no-shows
4. Seasonal demand: peak seasons (wedding season May–Sept, Christmas, Valentine's, Mother's Day), how to manage and promote during quieter months
Keep it practical and actionable — not generic marketing advice.`,

  "Operations & Kitchen Setup": `Write an Operations & Kitchen Setup section (3–4 paragraphs) covering:
1. Kitchen requirements for the operation type (home kitchen / rented / own premises): equipment list (stand mixer, turntables, oven capacity, fridge space, packaging storage)
2. Production workflow: taking orders, scheduling bake days, decorating days, delivery/collection logistics — how to batch for efficiency
3. Supplier and ingredient sourcing: where to buy quality ingredients, packaging suppliers, specialty items (edible prints, fondant, specialist tools)
4. Order management: how to handle peak periods, lead times, waitlists, deposit systems to protect cash flow
Be specific and practical — written by someone who has run a cake business.`,

  "Financial Plan": `Write a Financial Plan section (3–4 paragraphs) covering:
1. Revenue model for a cake business: order volume targets, average order value (distinguishing celebration cakes from wedding tier cakes — very different price points), seasonal peaks
2. Key cost drivers: ingredients (typically 20–30% of revenue for cakes), packaging, equipment depreciation, insurance, kitchen costs — and if home-based, utility uplift
3. Hourly rate consideration: many cake businesses forget to factor in decoration time, admin time, delivery. Explain the true cost of a baked-to-order business
4. Break-even and scale: how many orders per month to cover fixed costs, when part-time becomes full-time viable
Use realistic numbers tailored to the country and operation type provided.`,

  "Food Safety & Compliance": `Write a Food Safety & Compliance section (3–4 paragraphs) covering:
1. Registration requirements for this operation type and country (e.g. UK: register with local authority, cottage food rules; US: cottage food laws vary by state; Australia: home food business rules)
2. Allergen management — critical for cake businesses: the 14 major allergens (UK), Natasha's Law / pre-packed direct sales labelling, how to communicate allergens to customers
3. Food hygiene: required training (e.g. Level 2 Award in Food Safety), temperature control, cross-contamination prevention, cleaning schedules
4. Insurance: product liability insurance specific to food businesses, how to get it and what it covers
Be precise about legal requirements for the country provided. Flag that regulations differ significantly by jurisdiction.`,
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
    d.speciality    ? `Speciality: ${d.speciality}`            : null,
    d.operationType ? `Operation type: ${d.operationType}`     : null,
    d.country       ? `Country: ${d.country}`                  : null,
    d.goal          ? `Primary goal: ${d.goal}`                : null,
    d.extraContext  ? `Additional context: ${d.extraContext}`   : null,
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1000,
      system: `You are a professional business plan writer and cake industry expert.
You understand the specific challenges cake makers face: underpricing, allergen compliance, home kitchen rules, Instagram marketing, seasonal demand.
Write clearly, practically and passionately. Tailor tone to the goal (funding = formal; growing = conversational).
Use the specific business details provided. Do not invent numbers — estimate realistically.
Return plain prose — no markdown headers, no bullet points unless naturally appropriate. Paragraph breaks only.`,
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
