import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  clientName:   z.string().trim().min(1),
  goal:         z.string().trim().default("General Fitness"),
  gender:       z.string().trim().default(""),
  age:          z.string().trim().default(""),
  weight:       z.string().trim().default(""),
  activityLevel: z.string().trim().default("Moderately Active"),
  dietaryNeeds: z.string().trim().default(""),
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

  const { clientName, goal, gender, age, weight, activityLevel, dietaryNeeds, notes } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const prompt = `Write a practical, personalised nutrition guide for a personal training client. This is general nutritional guidance — not medical advice. It should be clear, actionable and easy for a client to follow.

Client: ${clientName}
Goal: ${goal}
${gender ? `Gender: ${gender}` : ""}
${age ? `Age: ${age}` : ""}
${weight ? `Current weight: ${weight}` : ""}
Activity level: ${activityLevel}
${dietaryNeeds ? `Dietary requirements / preferences: ${dietaryNeeds}` : "No specific dietary requirements"}
${notes ? `Additional notes: ${notes}` : ""}

Write the nutrition guide with these sections:

**Calorie & Macro Targets**
Based on the client's goal and activity level, provide estimated daily targets:
- Total calories
- Protein (g and % of calories)
- Carbohydrates (g and % of calories)
- Fats (g and % of calories)
Explain the reasoning briefly — why these numbers serve their goal.

**Meal Timing & Structure**
How many meals/snacks per day. Pre- and post-workout nutrition guidance specific to their goal. Any intermittent fasting considerations if relevant.

**Best Foods for Their Goal**
A list of 10–15 foods the client should prioritise and why — grouped by macronutrient. Include practical notes (e.g. "Greek yoghurt is high protein and cheap", "oats give sustained energy before morning training").

**Foods to Limit**
5–8 foods or food types that will work against their goal. Be honest but not preachy — brief explanation for each.

**Sample Day of Eating**
A realistic one-day meal plan showing breakfast, lunch, dinner and snacks with approximate calories and macros per meal. Use everyday foods, not supplements.

**Hydration**
Daily water intake target and any specific guidance around training sessions.

**Practical Tips**
5 simple, actionable habits that will make hitting these targets easier — meal prep, label reading, eating out, etc.

Add a brief disclaimer at the end noting this is general nutritional guidance and they should consult a registered dietitian or GP for medical nutrition advice.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const guide = (msg.content[0] as { type: string; text: string }).text;
  const title = `${clientName} — Nutrition Guide (${goal})`;
  return NextResponse.json({ guide, title, clientName });
}
