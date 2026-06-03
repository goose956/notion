import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  clientName:    z.string().trim().min(1),
  goal:          z.string().trim().default("General Fitness"),
  level:         z.string().trim().default("Beginner"),
  equipment:     z.string().trim().default("Full Gym"),
  daysPerWeek:   z.number().int().min(1).max(7).default(3),
  sessionLength: z.string().trim().default("60 minutes"),
  injuries:      z.string().trim().default(""),
  notes:         z.string().trim().default(""),
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

  const { clientName, goal, level, equipment, daysPerWeek, sessionLength, injuries, notes } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const prompt = `Write a complete, ready-to-use 4-week personal training programme for a client. Use clear headings, tables where useful, and numbered sets/reps so the trainer can hand this directly to the client.

Client details:
- Name: ${clientName}
- Primary goal: ${goal}
- Fitness level: ${level}
- Available equipment: ${equipment}
- Training days per week: ${daysPerWeek}
- Session length: ${sessionLength}
${injuries ? `- Injuries / restrictions: ${injuries}` : "- No injuries or restrictions"}
${notes ? `- Additional notes: ${notes}` : ""}

Structure the programme exactly as follows:

**Programme Overview**
A brief summary of the 4-week plan — the training split, weekly structure, and the key principle driving the programme (progressive overload, volume accumulation, etc.).

**Weekly Training Split**
Show a clear weekly schedule (e.g. Monday: Upper Body Push, Wednesday: Lower Body, Friday: Full Body). Include rest days.

**Week 1–2 (Foundation Phase)**
For each training day, list:
- Session name and focus
- Warm-up (5 mins — specific exercises)
- Main workout: exercise name | sets × reps | rest period | coaching cue
- Cool-down / stretch (5 mins)

**Week 3–4 (Progression Phase)**
Same structure as above but with progressive overload applied — increased weight, reps, sets or reduced rest. Note what changed and why.

**Exercise Modifications**
For any exercises that may be challenging, provide a beginner modification and an advanced progression.

**Tracking & Progress**
What to track each session (weight used, reps completed). How to know when to progress.

**Key Coaching Notes**
3–5 important technique or mindset reminders specific to this client's goal and level.

Be specific with exercise names, sets, reps, and rest periods. This should be a programme a client can follow independently with confidence.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 2500,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const programme = (msg.content[0] as { type: string; text: string }).text;
  const title = `${clientName} — ${goal} Programme (${level})`;
  return NextResponse.json({ programme, title, clientName });
}
