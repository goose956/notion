import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  businessName:  z.string().trim().min(1),
  operationType: z.string().trim().default("Home kitchen"),
  speciality:    z.string().trim().default(""),
  country:       z.string().trim().default("United Kingdom"),
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
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  const userEmail = session.user.email;
  await findOrCreateCustomer(userEmail).catch(() => null);
  const credits = await getCustomerCredits(userEmail).catch(() => 0);
  if (credits < CREDITS_PER_CALL) {
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to generate a compliance checklist.` }, { status: 402 });
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const d = parsed.data;

  const prompt = `Generate a comprehensive compliance checklist for a cake business with these details:
- Business name: ${d.businessName}
- Operation type: ${d.operationType}
- Speciality: ${d.speciality || "General cake making"}
- Country: ${d.country}

Return a JSON object with:
{
  "items": [
    {
      "name": "string — the name of the requirement",
      "category": "Registration" | "Certificate" | "Licence" | "Insurance" | "Labelling" | "Inspection",
      "required": true | false,
      "description": "string — what it is and why it matters (2 sentences)",
      "authority": "string — who issues or enforces it",
      "timescale": "string — when to obtain it (e.g. Before trading, Annually, Before each market)",
      "cost": "string — approximate cost or 'Free' or 'Varies'"
    }
  ],
  "summary": "string — a 2–3 sentence overview of the compliance picture for this specific business"
}

For ${d.country} cake businesses, cover:
- Food business registration (essential for all, even home bakers)
- Food hygiene certificate / food handler training
- Allergen management and labelling (Natasha's Law for UK pre-packed direct sales; equivalent for other countries)
- Product liability insurance
- Trading Standards / weights & measures if selling by weight
- Market licence / events permission if selling at markets
- Home kitchen inspection (environmental health visit)
- HACCP food safety management system
- Gas / electrical safety if rented kitchen
- Any country-specific cottage food laws or home baking regulations

Be specific and accurate to ${d.country}. Flag anything that differs significantly between jurisdictions.
Return only valid JSON — no markdown fence, no extra text.`;

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 2000,
      system: `You are a food safety and compliance expert specialising in small food businesses and home bakers.
You know the specific regulations for cake makers, including allergen labelling law (Natasha's Law in the UK), cottage food laws, and home kitchen registration.
Return only valid JSON matching the schema requested. No markdown, no extra commentary.`,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!raw) return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

    let parsed2: unknown;
    try { parsed2 = JSON.parse(cleaned); } catch {
      return NextResponse.json({ error: "AI returned malformed JSON." }, { status: 502 });
    }

    await deductCredits(userEmail, CREDITS_PER_CALL);
    return NextResponse.json(parsed2);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 502 });
  }
}
