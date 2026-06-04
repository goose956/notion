import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const Body = z.object({
  ingredients: z.array(z.string()).min(1),
  servings:    z.string().optional().default("1"),
  mealCount:   z.string().optional().default("3"),
  allergies:   z.string().optional().default(""),
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

  const { ingredients, servings, mealCount, allergies } = parsed.data;
  const count = parseInt(mealCount, 10) || 3;

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const prompt = `You are a keto chef. The user has these ingredients available:
${ingredients.map((i) => `- ${i}`).join("\n")}

Suggest exactly ${count} keto-friendly meals they can make using ONLY these ingredients (plus basic pantry staples like salt, pepper, olive oil, butter, garlic, eggs — do not add ingredients that weren't listed unless they are a basic staple).
${allergies ? `Avoid: ${allergies}` : ""}
Servings per meal: ${servings}

For EACH meal, provide the following in exactly this JSON structure. Return ONLY a valid JSON array — no markdown, no explanation, nothing else.

[
  {
    "name": "Meal name",
    "mealType": "Breakfast|Lunch|Dinner|Snack",
    "time": "e.g. 15 mins",
    "description": "One sentence description of the dish",
    "ingredients": "Full ingredient list with quantities, one per line",
    "method": "Step by step cooking instructions, numbered",
    "macros": { "calories": 0, "netCarbs": 0, "protein": 0, "fat": 0 }
  }
]

macros are per serving (integers). Be creative but realistic — only use what's in the ingredient list plus basic staples.`;

  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 3000,
      messages:   [{ role: "user", content: prompt }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();

    let meals = [];
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
      meals = JSON.parse(cleaned);
    } catch {
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) meals = JSON.parse(match[0]);
    }

    const title = `${count} Keto Meals from: ${ingredients.slice(0, 4).join(", ")}${ingredients.length > 4 ? " …" : ""}`;

    await deductCredits(customer.id, COST);
    return NextResponse.json({ meals, title });
  } catch (err) {
    console.error("[keto-ingredients]", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
