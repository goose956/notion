import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const TaskSchema = z.object({
  task:     z.string(),
  priority: z.string(),
  project:  z.string(),
  context:  z.string(),
  energy:   z.string(),
});

const BodySchema = z.object({
  energy:  z.string().optional(),
  context: z.string().optional(),
  tasks:   z.array(TaskSchema),
});

const CREDITS_PER_CALL = 1;

interface FocusPickResult {
  topPick: string;
  reason:  string;
  tip:     string;
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

function extractJson(text: string): FocusPickResult | null {
  const fenced = /```json\s*([\s\S]*?)```/i.exec(text)?.[1];
  const raw = fenced ?? text;
  try {
    const parsed = JSON.parse(raw) as Partial<FocusPickResult>;
    if (!parsed.topPick) return null;
    return {
      topPick: String(parsed.topPick).trim(),
      reason:  String(parsed.reason ?? "").trim(),
      tip:     String(parsed.tip ?? "").trim(),
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
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit for an AI pick.` }, { status: 402 });
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const { energy, context, tasks } = parsed.data;

  const systemPrompt = `You are a supportive assistant helping a neurodivergent person decide what to work on right now.
They have already filtered their task list. Pick the single best one to start with.
Return ONLY valid JSON:
{
  "topPick": "Exact task name from the list",
  "reason": "One short sentence explaining why this one first — be concrete and gentle",
  "tip": "One optional practical tip for starting this specific task (or empty string)"
}

Rules:
- topPick must be the exact task name from the list provided
- Favour tasks that match the user's current energy level
- Favour quick wins when energy is low — momentum matters
- Never use shame language or urgency framing
- The tip should reduce the activation energy to start (e.g. "Open a blank doc before you do anything else")`;

  const taskList = tasks.map((t, i) => `${i + 1}. ${t.task}${t.project ? ` (${t.project})` : ""}${t.priority ? ` [${t.priority}]` : ""}`).join("\n");
  const userMessage = `Current energy: ${energy || "not set"}\nContext: ${context || "not set"}\n\nTasks available:\n${taskList}`;

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
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
    const message = err instanceof Error ? err.message : "Failed to get focus recommendation";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
