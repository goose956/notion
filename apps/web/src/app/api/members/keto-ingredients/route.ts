import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCustomerByUserId, deductCredits } from "@niche-factory/db";
import { resolveApiKey, resolveModel } from "@/lib/ai-config";
import Anthropic from "@anthropic-ai/sdk";

const Body = z.object({
  ingredients: z.array(z.string()).min(1),
  servings:    z.string().optional().default("1"),
  mealCount:   z.string().optional().default("3"),
  allergies:   z.string().optional().default(""),
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

  const { ingredients, servings, mealCount, allergies } = body.data;
  const count = parseInt(mealCount, 10) || 3;

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
    const client = new Anthropic({ apiKey: resolveApiKey() });
    const msg = await client.messages.create({
      model:      resolveModel(),
      max_tokens: 3000,
      messages:   [{ role: "user", content: prompt }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();

    // Parse the JSON array from the response
    let meals = [];
    try {
      // Strip any markdown code fences if present
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
      meals = JSON.parse(cleaned);
    } catch {
      // Fallback: try to extract the array from the response
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
