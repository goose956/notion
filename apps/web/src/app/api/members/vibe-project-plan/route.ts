import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  projectName: z.string().trim().min(1),
  idea:        z.string().trim().min(1),
  stack:       z.string().trim().default(""),
  timeline:    z.string().trim().default("1 month"),
  mvpGoal:     z.string().trim().default(""),
  targetUser:  z.string().trim().default(""),
  notes:       z.string().trim().default(""),
  tool:        z.string().trim().default(""),
  stage:       z.string().trim().default(""),
});

const CREDITS_PER_CALL = 2;

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

  const body   = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { projectName, idea, stack, timeline, mvpGoal, targetUser, notes, tool, stage } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const prompt = `You are a senior indie hacker and solo builder. Create a pragmatic, actionable project plan for a solo vibe coder. Optimise for shipping fast — not perfection.

Project: ${projectName}
What it does: ${idea}
${targetUser ? `Target user: ${targetUser}` : ""}
${stack      ? `Preferred stack: ${stack}` : "No stack specified — recommend one"}
${timeline   ? `Build timeline: ${timeline}` : ""}
${mvpGoal    ? `MVP definition: ${mvpGoal}` : ""}
${tool       ? `Building with: ${tool}` : ""}
${stage      ? `Builder stage: ${stage}` : ""}
${notes      ? `Constraints / notes: ${notes}` : ""}

Write a complete, practical project plan:

**TECH STACK RECOMMENDATION**
${stack ? "Review the chosen stack and flag any concerns, then confirm or suggest adjustments." : "Recommend the best stack for a solo builder to ship this fast."}
List each layer: frontend, backend/API, database, auth, hosting, payments (if needed), key libraries.
For each choice give a 1-sentence reason — speed, cost, ecosystem fit.

**MVP FEATURE SET**
✅ BUILD in v1 (list 5–8 core features — the minimum needed to be genuinely useful)
🚫 CUT from v1 (list 4–6 features to explicitly leave out)
🔮 v2+ ideas (list 3–4 things to add after launch and first users)

**SPRINT BREAKDOWN**
Break the ${timeline} timeline into weekly sprints. For each sprint:
- Sprint goal (1 sentence)
- Specific tasks to complete (4–6 bullet points, technical and specific)
- Deliverable / what "done" looks like

**KEY TECHNICAL DECISIONS**
4–5 decisions the builder needs to make early that will affect the whole project. For each: the question, the recommended answer for a solo builder, and the reason.

**SUGGESTED FILE / FOLDER STRUCTURE**
A practical top-level project structure for this specific app. Not generic boilerplate.

**LAUNCH CHECKLIST**
The 10 things that must be done before launch day (beyond coding): landing page copy, analytics, error monitoring, payment setup, etc.

**AFTER LAUNCH — WEEK 1**
5 specific actions for the first week post-launch to get feedback, first users and early traction.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 2200,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const plan = (msg.content[0] as { type: string; text: string }).text;
  const title = `Project Plan: ${projectName}`;
  return NextResponse.json({ plan, title, projectName });
}
