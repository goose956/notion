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

const TaskSchema = z.object({
  task:     z.string(),
  project:  z.string(),
  priority: z.string(),
  status:   z.string(),
  dueDate:  z.string(),
  type:     z.string(),
});

const ProjectSchema = z.object({
  name:     z.string(),
  priority: z.string(),
  goal:     z.string(),
  status:   z.string(),
});

const CriteriaSchema = z.object({
  activeProjects: z.string().optional(),
  goodWeek:       z.string().optional(),
  workAreas:      z.unknown().optional(),
});

const BodySchema = z.object({
  tasks:    z.array(TaskSchema),
  projects: z.array(ProjectSchema),
  criteria: CriteriaSchema.optional(),
});

const CREDITS_PER_CALL = 1;

interface FocusResult {
  topPick: string;
  reason: string;
  suggestions: Array<{ task: string; project: string; why: string }>;
  advice: string;
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

function extractJson(text: string): FocusResult | null {
  const fenced = /```json\s*([\s\S]*?)```/i.exec(text)?.[1];
  const raw = fenced ?? text;
  try {
    const parsed = JSON.parse(raw) as Partial<FocusResult>;
    if (!parsed.topPick) return null;
    return {
      topPick:     parsed.topPick.trim(),
      reason:      parsed.reason?.trim() ?? "",
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      advice:      parsed.advice?.trim() ?? "",
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
      { error: `You need ${CREDITS_PER_CALL} credit to use Focus Mode.` },
      { status: 402 },
    );
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);

  if (!apiKey) {
    return NextResponse.json({ error: "AI is not configured." }, { status: 503 });
  }

  const { tasks, projects, criteria } = parsed.data;
  const today = new Date().toDateString();

  const taskLines = tasks.slice(0, 50).map((t) =>
    `- [${t.priority ?? "Medium"} priority] ${t.task} (project: ${t.project || "none"}, status: ${t.status}, due: ${t.dueDate || "no date"}, type: ${t.type})`
  ).join("\n");

  const projectLines = projects.slice(0, 20).map((p) =>
    `- ${p.name} [${p.priority}/${p.status}]${p.goal ? `: ${p.goal}` : ""}`
  ).join("\n");

  const systemPrompt = `You are a no-nonsense productivity coach helping someone decide what to work on right now.
Return ONLY valid JSON with this exact shape:
{
  "topPick": "The single most important task to do right now",
  "reason": "1-2 sentence explanation of why this task is the top priority",
  "suggestions": [
    { "task": "Task name", "project": "Project name", "why": "One sentence why it matters" }
  ],
  "advice": "One piece of tactical advice for making progress today"
}
Rules:
- topPick should be the full task name, not a vague description
- suggestions should contain 2-4 other good tasks to tackle this week (not the topPick)
- prioritise: overdue tasks > high priority > upcoming due dates > high-priority project goals
- advice should be specific and actionable, not generic
- be direct and confident — no hedging`;

  const userPrompt = [
    `Today: ${today}`,
    `\nProjects:\n${projectLines || "(none)"}`,
    `\nOpen tasks:\n${taskLines || "(none)"}`,
    criteria?.goodWeek ? `\nWhat a good week looks like: ${criteria.goodWeek}` : "",
    criteria?.activeProjects ? `\nFocus areas: ${criteria.activeProjects}` : "",
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 800,
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
    const message = err instanceof Error ? err.message : "Failed to get focus recommendation";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
