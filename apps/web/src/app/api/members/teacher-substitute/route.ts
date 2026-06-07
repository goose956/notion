import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  topic:       z.string().trim().min(1),
  subject:     z.string().trim().default(""),
  yearGroup:   z.string().trim().default(""),
  duration:    z.string().trim().default("1 hour"),
  abilityNote: z.string().trim().default(""),
  curriculum:  z.string().trim().default("England (National Curriculum)"),
});

const CREDITS_PER_CALL = 1;

async function resolveApiKey(email: string): Promise<string | undefined> {
  const k = await getSettingValue(`customer.${email}.anthropic.apiKey`);
  if (k?.trim()) return k.trim();
  const g = await getSettingValue("anthropic.apiKey");
  if (g?.trim()) return g.trim();
  return process.env["ANTHROPIC_API_KEY"];
}

async function resolveModel(): Promise<string> {
  const m = await getSettingValue("anthropic.model");
  return m?.trim() || process.env["ANTHROPIC_MODEL"] || "claude-haiku-4-5";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const email   = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body   = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { topic, subject, yearGroup, duration, abilityNote, curriculum } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const prompt = `You are writing a cover lesson plan for a supply/substitute teacher who may not be a subject specialist. The instructions must be completely self-contained — the sub should be able to run this lesson without any prior knowledge of the class or subject.

Topic: ${topic}
Subject: ${subject || "Not specified"}
Year group: ${yearGroup || "Not specified"}
Duration: ${duration}
Curriculum: ${curriculum}
${abilityNote ? `Class notes: ${abilityNote}` : ""}

Write a detailed cover lesson plan with these sections:

## Cover Lesson: ${topic}

**For the supply teacher:** [2-3 sentence briefing on what to expect from this class and any key reminders]

### Starter (10 min)
[Activity that requires NO preparation — students can do this independently from the board. Include exact instructions to write on the board.]

### Main Activity (${duration === "30 minutes" ? "15" : duration === "45 minutes" ? "25" : "35"} min)
[The core task. Written so a non-specialist can deliver it. Include:
- What to tell the class
- The task itself with clear step-by-step instructions
- What students should produce/write]

### Extension Task
[For students who finish early — self-contained, no extra resources needed]

### Plenary (5 min)
[Simple whole-class activity to round up — e.g. exit ticket question, think-pair-share prompt]

---
**Resources needed:** [List exactly what's needed — aim for whiteboard + pens only if possible]
**If students finish early:** [One sentence instruction]
**If there are behaviour issues:** [Brief, calm guidance]`;

  const msg = await client.messages.create({
    model,
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const plan = (msg.content[0] as { type: string; text: string }).text.trim();
  const title = `Cover: ${topic}${yearGroup ? ` (${yearGroup})` : ""}`;
  return NextResponse.json({ plan, title });
}
