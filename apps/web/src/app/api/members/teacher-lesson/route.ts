import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  topic:           z.string().trim().min(1),
  subject:         z.string().trim().default(""),
  yearGroup:       z.string().trim().default(""),
  duration:        z.string().trim().default("1 hour"),
  objectives:      z.string().trim().default(""),
  curriculum:      z.string().trim().default("England (National Curriculum)"),
  differentiation: z.boolean().default(false),
});

const CREDITS_PER_CALL = 1;

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

  const { topic, subject, yearGroup, duration, objectives, curriculum, differentiation } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const title = `${topic}${yearGroup ? ` — ${yearGroup}` : ""}${subject ? ` (${subject})` : ""}`;

  const prompt = `Write a complete, classroom-ready lesson plan for a teacher. Use clear headings and numbered/bulleted lists throughout so it's easy to follow during teaching.

Lesson details:
- Topic: ${topic}
- Subject: ${subject || "Not specified"}
- Year group: ${yearGroup || "Not specified"}
- Duration: ${duration}
- Curriculum: ${curriculum}
${objectives ? `- Learning objectives: ${objectives}` : ""}
${differentiation ? "- Include differentiation strategies for SEN, EAL, and Gifted & Talented pupils" : ""}

Structure the lesson plan with these sections:

**Learning Objectives**
3–4 clear, measurable objectives (what students will know/be able to do by the end).

**Curriculum Links**
Specific curriculum references or standards this lesson addresses.

**Resources Needed**
List all materials, equipment, and technology required.

**Starter Activity** (${Math.round(parseInt(duration) * 10 || 10)} mins)
An engaging activity to activate prior knowledge and focus attention. Include exact instructions.

**Main Teaching**
Break into 2–3 phases with timing:
- Direct instruction / explanation
- Guided practice
- Independent / group task
For each phase: what the teacher does, what students do, and any key questions to ask.

**Plenary** (5–10 mins)
How to consolidate learning and assess understanding. Include 2–3 exit questions.

**Assessment for Learning**
How will you know students have met the objectives? Formative assessment strategies.
${differentiation ? `
**Differentiation**
- SEN / lower attainers: specific scaffolds and support
- EAL learners: language support strategies
- Gifted & Talented: extension tasks and challenge questions` : ""}

**Homework / Follow-up** (optional)
A brief task to extend or consolidate learning.

Write for a busy teacher who needs to pick this up and teach it immediately. Be specific and practical — not vague or generic.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const plan = (msg.content[0] as { type: string; text: string }).text;
  return NextResponse.json({ plan, title });
}
