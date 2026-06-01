import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  goal: z.string().trim().min(1),
});

const CREDITS_PER_CALL = 1;

interface MicroStep {
  step:           string;
  energyRequired: "Low 🔋" | "Medium ⚡" | "High 🚀";
  timeEstimate:   string;
  notes:          string;
}

interface BreakdownResult {
  steps:   MicroStep[];
  summary: string;
}

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

function extractJson(text: string): BreakdownResult | null {
  const fenced = /```json\s*([\s\S]*?)```/i.exec(text)?.[1];
  const raw = fenced ?? text;
  try {
    const parsed = JSON.parse(raw) as Partial<BreakdownResult>;
    if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) return null;
    const validEnergy = ["Low 🔋", "Medium ⚡", "High 🚀"] as const;
    return {
      steps: parsed.steps.map((s) => ({
        step:           String(s.step ?? "").trim(),
        energyRequired: (validEnergy.includes(s.energyRequired as typeof validEnergy[number]) ? s.energyRequired : "Medium ⚡") as MicroStep["energyRequired"],
        timeEstimate:   String(s.timeEstimate ?? "").trim(),
        notes:          String(s.notes ?? "").trim(),
      })).filter((s) => s.step),
      summary: String(parsed.summary ?? "").trim(),
    };
  } catch {
    return null;
  }
}

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
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to use Break It Down.` }, { status: 402 });
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const systemPrompt = `You are a supportive assistant helping a neurodivergent person break down an overwhelming task.
Your goal is to reduce the activation energy to start. Make steps tiny and concrete.
Return ONLY valid JSON:
{
  "summary": "One encouraging sentence about this goal — no toxic positivity",
  "steps": [
    {
      "step": "One tiny, specific action",
      "energyRequired": "Low 🔋" | "Medium ⚡" | "High 🚀",
      "timeEstimate": "e.g. 5 min, 30 min, 1 hour",
      "notes": "Optional: one practical tip to make this easier to start (or empty string)"
    }
  ]
}

Rules:
- Generate 5–10 steps
- Steps should be genuinely small — the first step should be doable in under 5 minutes
- Assign Low energy to steps that are passive, mindless, or just opening/gathering
- Assign High energy only to steps that require real concentration or social interaction
- timeEstimate should be realistic, not optimistic
- notes should reduce friction ("just open the tab", "set a 10-min timer", "you don't have to finish it")
- No shame, no urgency, no "you should"`;

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: `Task to break down: ${parsed.data.goal}` }],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    const content = textBlock?.type === "text" ? textBlock.text : "";
    const result = extractJson(content);
    if (!result) {
      return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 502 });
    }

    await deductCredits(userEmail, CREDITS_PER_CALL);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to break down task";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
