import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const Body = z.object({
  apptType:     z.string(),
  professional: z.string().optional(),
  childName:    z.string().optional(),
  diagnosis:    z.string().optional(),
  context:      z.string().optional(),
});

const COST = 1;

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

  const { apptType, professional, childName, diagnosis, context } = parsed.data;

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const childDesc = [childName, diagnosis ? `(${diagnosis})` : null].filter(Boolean).join(" ");

  const prompt = `You are a specialist SEND parent advisor helping a parent prepare for a ${apptType} appointment${professional ? ` with ${professional}` : ""}.
${childDesc ? `\nChild: ${childDesc}` : ""}
${context ? `\nAppointment focus: ${context}` : ""}

Generate a tailored list of questions and preparation notes for this parent to take to the appointment.

Include:
1. 8–12 specific questions to ask the professional
2. Key information to bring / have ready
3. 2–3 things to advocate for based on the appointment type
4. What to ask about next steps and follow-up

Format clearly with headings. Be practical and specific to ${apptType} appointments.`;

  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 1200,
      messages:   [{ role: "user", content: prompt }],
    });

    const text  = (msg.content[0] as { type: string; text: string }).text.trim();
    const title = `${apptType} Prep${childName ? ` — ${childName}` : ""}${professional ? ` · ${professional}` : ""}`;

    await deductCredits(customer.id, COST);
    return NextResponse.json({ questions: text, title });
  } catch (err) {
    console.error("[send-appointment-prep]", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
