import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import {
  deductCredits,
  findOrCreateCustomer,
  getCustomerCredits,
  getSettingValue,
} from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  goal:    z.string().trim().min(1),
  project: z.string().trim().optional(),
});

const CREDITS_PER_CALL = 1;

interface BreakdownTask {
  task:     string;
  priority: "High" | "Medium" | "Low";
  type:     string;
  notes:    string;
}

interface BreakdownResult {
  tasks:   BreakdownTask[];
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
    if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) return null;
    return {
      tasks: parsed.tasks.map((t) => ({
        task:     String(t.task ?? "").trim(),
        priority: (["High", "Medium", "Low"].includes(String(t.priority)) ? t.priority : "Medium") as "High" | "Medium" | "Low",
        type:     String(t.type ?? "").trim(),
        notes:    String(t.notes ?? "").trim(),
      })),
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
  try {
    body = await req.json();
  } catch {
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
    return NextResponse.json(
      { error: `You need ${CREDITS_PER_CALL} credit to use Task Breakdown.` },
      { status: 402 },
    );
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);

  if (!apiKey) {
    return NextResponse.json({ error: "AI is not configured." }, { status: 503 });
  }

  const { goal, project } = parsed.data;

  const systemPrompt = `You are a project management expert who breaks down goals into clear, actionable tasks.
Return ONLY valid JSON with this exact shape:
{
  "summary": "One sentence describing what achieving this goal will accomplish",
  "tasks": [
    {
      "task": "Specific actionable task name",
      "priority": "High" | "Medium" | "Low",
      "type": "One of: Development, Marketing, Research, Content, Admin, Launch, Design, Other",
      "notes": "Brief clarification or tip for this task (1 sentence max, or empty string)"
    }
  ]
}
Rules:
- Generate between 5 and 12 tasks
- Each task must be specific and completable in 1-4 hours
- Don't include vague tasks like "think about X" or "consider Y"
- Tasks should be in a logical order (setup before execution, research before creation)
- Assign High priority to blockers or critical path tasks
- type must be exactly one of the allowed values`;

  const userPrompt = `Goal: ${goal}${project ? `\nProject: ${project}` : ""}`;

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
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
    const message = err instanceof Error ? err.message : "Failed to break down goal";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
