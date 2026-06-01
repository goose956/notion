import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  text: z.string().trim().min(1),
});

const CREDITS_PER_CALL = 1;

interface DumpItem {
  text:            string;
  category:        "Task" | "Habit" | "Idea" | "Feeling" | "Note";
  energyRequired?: "Low 🔋" | "Medium ⚡" | "High 🚀";
  context?:        string;
}

interface DumpResult {
  items:   DumpItem[];
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

function extractJson(text: string): DumpResult | null {
  const fenced = /```json\s*([\s\S]*?)```/i.exec(text)?.[1];
  const raw = fenced ?? text;
  try {
    const parsed = JSON.parse(raw) as Partial<DumpResult>;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    const validCategories = ["Task", "Habit", "Idea", "Feeling", "Note"] as const;
    const validEnergy = ["Low 🔋", "Medium ⚡", "High 🚀"] as const;
    return {
      items: parsed.items.map((item): DumpItem => {
        const base: DumpItem = {
          text:     String(item.text ?? "").trim(),
          category: (validCategories.includes(item.category as typeof validCategories[number]) ? item.category : "Note") as DumpItem["category"],
        };
        const e = item.energyRequired as typeof validEnergy[number] | undefined;
        if (e && validEnergy.includes(e)) {
          base.energyRequired = e;
        }
        if (item.context) base.context = String(item.context).trim();
        return base;
      }).filter((i) => i.text),
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
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to use Brain Dump.` }, { status: 402 });
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const systemPrompt = `You are a compassionate assistant helping a neurodivergent person sort their brain dump into categories.
Read each thought/line and classify it. Return ONLY valid JSON:
{
  "summary": "One warm, non-judgmental sentence about what was dumped",
  "items": [
    {
      "text": "The thought, cleaned up slightly",
      "category": "Task" | "Habit" | "Idea" | "Feeling" | "Note",
      "energyRequired": "Low 🔋" | "Medium ⚡" | "High 🚀",
      "context": "At desk" | "Home" | "Quick win" | "Out & about" | "Phone only" | "Anywhere"
    }
  ]
}

Category rules:
- Task: something actionable (call X, buy Y, write Z)
- Habit: something recurring they want to do regularly
- Idea: a concept, inspiration, or "what if"
- Feeling: an emotion, mood, or observation about how they feel
- Note: anything else — information to remember

For Tasks only: always include energyRequired and context.
For non-Tasks: omit energyRequired and context.
Split compound thoughts into separate items if needed.
Keep the tone of each item — don't over-clean.
Do not add shame language. Be warm and matter-of-fact.`;

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: `Brain dump:\n${parsed.data.text}` }],
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
    const message = err instanceof Error ? err.message : "Failed to sort brain dump";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
