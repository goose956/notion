import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const Body = z.object({
  mealName: z.string().optional().default(""),
  mealType: z.string().optional().default(""),
  servings: z.string().optional().default("1"),
  recipe:   z.string().min(10),
});

const COST = 1;

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

  const { mealName, mealType, servings, recipe } = parsed.data;

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

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
    const msg = await client.messages.create({
      model,
      max_tokens: 2048,
      messages:   [{ role: "user", content: prompt }],
    });

    const raw  = (msg.content[0] as { type: string; text: string }).text.trim();
    const name = mealName || "Keto Recipe";
    const title = `${name} — Keto Analysis`;

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
