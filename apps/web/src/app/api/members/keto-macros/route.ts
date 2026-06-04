import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const Body = z.object({
  gender:   z.string(),
  age:      z.string(),
  weight:   z.string(),
  height:   z.string(),
  unit:     z.enum(["metric", "imperial"]),
  activity: z.string(),
  goal:     z.string(),
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

  const { gender, age, weight, height, unit, activity, goal } = parsed.data;

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const weightLabel = unit === "metric" ? `${weight}kg` : `${weight}lbs`;
  const heightLabel = unit === "metric" ? `${height}cm` : `${height} inches`;

  const prompt = `You are a keto nutrition expert. Calculate personalised daily macro targets for keto.

Person details:
- Gender: ${gender}
- Age: ${age}
- Weight: ${weightLabel}
- Height: ${heightLabel}
- Activity level: ${activity}
- Goal: ${goal}

Please:
1. Calculate their TDEE (Total Daily Energy Expenditure) using the Mifflin-St Jeor formula
2. Apply an appropriate calorie adjustment for their goal (deficit/surplus/maintenance)
3. Calculate keto macro targets:
   - Net carbs: 20–50g (strict for weight loss, up to 50g for maintenance/muscle gain)
   - Protein: based on lean body mass and goal
   - Fat: to make up remaining calories
4. Explain the rationale for each macro
5. Provide a macros-per-meal breakdown (assuming 3 meals a day)
6. Give 3–5 practical tips specific to their goal

Format the response clearly with sections. Be specific and actionable.

IMPORTANT: At the very end of your response, on the last line, output ONLY a JSON object in exactly this format (no markdown, no explanation):
{"calories":NUMBER,"netCarbs":NUMBER,"protein":NUMBER,"fat":NUMBER}

Replace NUMBER with integers. These are daily totals.`;

  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 1500,
      messages:   [{ role: "user", content: prompt }],
    });

    const raw   = (msg.content[0] as { type: string; text: string }).text.trim();
    const title = `Keto Macro Targets — ${goal} (${gender}, ${age})`;

    let macroObj: { calories: number; netCarbs: number; protein: number; fat: number } | null = null;
    let targets  = raw;
    const lastLine = raw.split("\n").findLast((l) => l.trim().startsWith("{"));
    if (lastLine) {
      try {
        macroObj = JSON.parse(lastLine.trim());
        targets  = raw.slice(0, raw.lastIndexOf(lastLine)).trim();
      } catch { /* keep null */ }
    }

    await deductCredits(customer.id, COST);
    return NextResponse.json({
      targets,
      title,
      calories: macroObj?.calories ?? 0,
      netCarbs: macroObj?.netCarbs ?? 0,
      protein:  macroObj?.protein  ?? 0,
      fat:      macroObj?.fat      ?? 0,
    });
  } catch (err) {
    console.error("[keto-macros]", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
