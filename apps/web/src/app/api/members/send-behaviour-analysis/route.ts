import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const LogEntry = z.object({
  title:      z.string(),
  location:   z.string().optional(),
  intensity:  z.string().optional(),
  trigger:    z.string().optional(),
  resolution: z.string().optional(),
});

const Body = z.object({
  logs:      z.array(LogEntry),
  childName: z.string().optional(),
  diagnosis: z.string().optional(),
});

const COST = 2;

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

  const { logs, childName, diagnosis } = parsed.data;
  if (logs.length < 2) return NextResponse.json({ error: "Need at least 2 incidents" }, { status: 400 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const logText = logs.map((l, i) =>
    `${i + 1}. ${l.title}${l.location ? ` | Location: ${l.location}` : ""}${l.intensity ? ` | Intensity: ${l.intensity}` : ""}${l.trigger ? `\n   Trigger: ${l.trigger}` : ""}${l.resolution ? `\n   Resolution: ${l.resolution}` : ""}`
  ).join("\n\n");

  const childDesc = [childName ?? "the child", diagnosis ? `who has ${diagnosis}` : null].filter(Boolean).join(" ");

  const prompt = `You are a specialist SEND behaviour analyst. Analyse the following behaviour incident log for ${childDesc}.

INCIDENT LOG (${logs.length} entries):
${logText}

Produce a professional Behaviour Profile report with the following sections:

1. OVERVIEW — Brief summary of the data analysed (number of incidents, timespan if clear, general picture).

2. PATTERN ANALYSIS — What patterns do you see? Consider:
   - Common triggers (sensory, routine, transitions, demand, social, fatigue)
   - Location patterns
   - Time/context patterns
   - Intensity trends

3. KEY TRIGGERS — List the most frequent/significant triggers with brief explanation

4. WHAT HELPS — Based on the resolution notes, what appears to reduce or manage incidents?

5. RECOMMENDATIONS FOR SCHOOL — 4–6 practical, specific strategies a school/professional can implement based on these patterns

6. FOR PARENT REFERENCE — 2–3 things this data suggests the parent should monitor or discuss at the next appointment

Write in professional but accessible language. This report may be shared with schools, professionals, or used in EHCP evidence.`;

  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 2000,
      messages:   [{ role: "user", content: prompt }],
    });

    const report = (msg.content[0] as { type: string; text: string }).text.trim();
    const today  = new Date().toISOString().slice(0, 10);
    const title  = `Behaviour Profile${childName ? ` — ${childName}` : ""} · ${today}`;

    await deductCredits(customer.id, COST);
    return NextResponse.json({ report, title });
  } catch (err) {
    console.error("[send-behaviour-analysis]", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
