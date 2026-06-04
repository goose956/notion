import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const Body = z.object({
  calories:    z.string(),
  days:        z.string(),
  dietType:    z.string(),
  allergies:   z.string().optional().default(""),
  preferences: z.string().optional().default(""),
  notes:       z.string().optional().default(""),
  goal:        z.string().optional().default(""),
});

const COST = 2;

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

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < COST) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { calories, days, dietType, allergies, preferences, notes, goal } = parsed.data;

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const prompt = `You are a keto nutrition expert. Generate a detailed ${days}-day keto meal plan.

Details:
- Daily calorie target: ${calories}
- Diet approach: ${dietType}
- Goal: ${goal || "General health"}
- Allergies / foods to avoid: ${allergies || "None"}
- Food preferences: ${preferences || "No specific preferences"}
- Additional notes: ${notes || "None"}

Structure the plan clearly:

For each day, provide:
DAY X — [theme name e.g. "Protein Day"]
• Breakfast: [meal name] — brief description, approximate macros (kcal / net carbs / protein / fat)
• Lunch: [meal name] — brief description + macros
• Dinner: [meal name] — brief description + macros
• Snack (optional): [meal name] + macros
Daily totals: Calories / Net Carbs / Protein / Fat

After all days, include:
SHOPPING LIST — organised by category (Meat & Fish / Dairy & Eggs / Vegetables / Nuts & Seeds / Pantry / Other)

MEAL PREP TIPS — 3–5 practical tips for this plan

Keep it practical and achievable. Prioritise real, whole foods. Be specific with portion sizes.`;

  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 4096,
      messages:   [{ role: "user", content: prompt }],
    });

    const plan  = (msg.content[0] as { type: string; text: string }).text.trim();
    const title = `${days}-Day ${dietType} Meal Plan (${calories})`;

    await deductCredits(customer.id, COST);
    return NextResponse.json({ plan, title });
  } catch (err) {
    console.error("[keto-meal-plan]", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
