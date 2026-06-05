import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const Body = z.object({
  letterType:  z.string(),
  recipient:   z.string().optional(),
  parentName:  z.string().optional(),
  situation:   z.string(),
  desired:     z.string().optional(),
  tone:        z.string(),
  childName:   z.string().optional(),
  childAge:    z.string().optional(),
  diagnosis:   z.string().optional(),
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

  const { letterType, recipient, parentName, situation, desired, tone, childName, childAge, diagnosis } = parsed.data;

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const childDesc = [childName, childAge ? `age ${childAge}` : null, diagnosis].filter(Boolean).join(", ");
  const today     = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const prompt = `You are an expert SEND parent advocate. Write a formal letter for a parent.

LETTER TYPE: ${letterType}
${recipient  ? `RECIPIENT: ${recipient}`      : ""}
${parentName ? `PARENT NAME: ${parentName}`   : ""}
${childDesc  ? `CHILD: ${childDesc}`          : ""}
TONE: ${tone}
${desired    ? `DESIRED OUTCOME: ${desired}`  : ""}

SITUATION:
${situation}

Write a complete, ready-to-send formal letter. Include:
- Today's date: ${today}
- Appropriate greeting (use recipient name/role if provided, otherwise "Dear Sir/Madam")
- Clear opening stating the purpose
- Body covering all relevant points from the situation
- The desired outcome stated clearly
- Professional closing
- Signature line for: ${parentName ?? "[Your Name]"}

Tone guidance for "${tone}":
- "Firm but polite": assertive but not aggressive; cites rights or legal duties where relevant
- "Formal and assertive": highly professional, direct, references legislation/guidance where appropriate
- "Conciliatory": collaborative tone, seeking to work together, acknowledges positives
- "Urgent": makes clear urgency without being rude; may reference safeguarding or welfare if relevant

The letter should be concise but complete — typically 3–5 paragraphs. Use plain English where possible.`;

  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 1500,
      messages:   [{ role: "user", content: prompt }],
    });

    const letter = (msg.content[0] as { type: string; text: string }).text.trim();
    const title  = `${letterType}${childName ? ` — ${childName}` : ""} · ${today}`;

    await deductCredits(customer.id, COST);
    return NextResponse.json({ letter, title });
  } catch (err) {
    console.error("[send-letter-writer]", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
