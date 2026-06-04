import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCustomerByUserId, deductCredits } from "@niche-factory/db";
import { resolveApiKey, resolveModel } from "@/lib/ai-config";
import Anthropic from "@anthropic-ai/sdk";

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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const customer = await getCustomerByUserId(session.user.id);
  if (!customer) return NextResponse.json({ error: "No account found" }, { status: 404 });
  if ((customer.credits ?? 0) < COST) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { calories, days, dietType, allergies, preferences, notes, goal } = body.data;

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
    const client = new Anthropic({ apiKey: resolveApiKey() });
    const msg = await client.messages.create({
      model:      resolveModel(),
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
