import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCustomerByUserId, deductCredits } from "@niche-factory/db";
import { resolveApiKey, resolveModel } from "@/lib/ai-config";
import Anthropic from "@anthropic-ai/sdk";

const Body = z.object({
  mealName: z.string().optional().default(""),
  mealType: z.string().optional().default(""),
  servings: z.string().optional().default("1"),
  recipe:   z.string().min(10),
});

const COST = 1;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const customer = await getCustomerByUserId(session.user.id);
  if (!customer) return NextResponse.json({ error: "No account found" }, { status: 404 });
  if ((customer.credits ?? 0) < COST) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const body = Body.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { mealName, mealType, servings, recipe } = body.data;

  const prompt = `You are a keto nutrition expert and recipe analyst. Analyse the following recipe and provide:

1. Full macro breakdown per serving (calories, net carbs, total carbs, fibre, protein, fat)
2. A keto suitability score out of 10 with explanation
3. Key ingredients that affect the keto suitability
4. Specific modifications to make it more keto-friendly (if needed)
5. Storage and meal prep tips

Recipe details:
- Name: ${mealName || "Not specified"}
- Meal type: ${mealType || "Not specified"}
- Servings this recipe makes: ${servings}

Recipe:
${recipe}

Format your response clearly with sections and bullet points. Be precise with macro estimates.

IMPORTANT: At the very end of your response, on the last line, output ONLY a JSON object in exactly this format (no markdown, no explanation):
{"calories":NUMBER,"netCarbs":NUMBER,"protein":NUMBER,"fat":NUMBER}

Replace NUMBER with integers. These are per-serving values.`;

  try {
    const client = new Anthropic({ apiKey: resolveApiKey() });
    const msg = await client.messages.create({
      model:      resolveModel(),
      max_tokens: 2048,
      messages:   [{ role: "user", content: prompt }],
    });

    const raw  = (msg.content[0] as { type: string; text: string }).text.trim();
    const name = mealName || "Keto Recipe";
    const title = `${name} — Keto Analysis`;

    // Extract JSON macros from last line
    let macros: { calories: number; netCarbs: number; protein: number; fat: number } | null = null;
    let analysis = raw;
    const lastLine = raw.split("\n").findLast((l) => l.trim().startsWith("{"));
    if (lastLine) {
      try {
        macros   = JSON.parse(lastLine.trim());
        analysis = raw.slice(0, raw.lastIndexOf(lastLine)).trim();
      } catch { /* keep macros null */ }
    }

    await deductCredits(customer.id, COST);
    return NextResponse.json({ analysis, title, mealName: name, macros });
  } catch (err) {
    console.error("[keto-recipe]", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
