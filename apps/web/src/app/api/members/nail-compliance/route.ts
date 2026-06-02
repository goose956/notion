import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  businessName:  z.string().trim().min(1),
  operationType: z.string().trim().default("Home salon"),
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

  const prompt = `Generate a comprehensive compliance checklist for a nail tech / beauty business with these details:
- Business name: ${d.businessName}
- Operation type: ${d.operationType}
- Speciality: ${d.speciality || "Nails and beauty treatments"}
- Country: ${d.country}

Return a JSON object with:
{
  "items": [
    {
      "name": "string — name of the requirement",
      "category": "Registration" | "Certificate" | "Insurance" | "COSHH" | "Patch Testing" | "Inspection",
      "required": true | false,
      "description": "string — what it is and why it matters specifically for beauty/nail businesses (2 sentences)",
      "authority": "string — who issues or enforces it",
      "timescale": "string — when to obtain it",
      "cost": "string — approximate cost or 'Free' or 'Varies'"
    }
  ],
  "summary": "string — 2–3 sentence overview of the compliance picture for this specific business"
}

For ${d.country} nail tech / beauty businesses, cover ALL relevant items including:
- Local authority / council registration for a beauty business or home salon
- Level 2 / NVQ beauty qualification or equivalent (country-specific)
- COSHH assessment and risk assessment (UK) — especially for nail chemicals (MMA, acrylics, gel chemicals), lash adhesives (cyanoacrylate), tints
- Ventilation requirements for nail treatments (chemical fumes)
- PPE: gloves, masks/respirators, eye protection for chemical treatments
- Patch testing protocol — legal requirement before tints (lash, brow), chemical peels, certain adhesives. 48 hours before treatment.
- Patch test record keeping — must be documented with date, product, batch number, result
- Treatment liability insurance (essential — not optional for any beauty professional)
- Public liability insurance if working mobile or at client premises
- Electrical equipment PAT testing (lamps, nail drills, sterilisers)
- Sterilisation and infection control: autoclave or barbicide for metal tools, single-use disposables
- GDPR / data protection for client records and patch test records
- First aid certificate (recommended)
- Any specific local licensing for beauty treatments (e.g. special treatments licence for certain procedures in some UK councils)

Be specific and accurate to ${d.country}. Flag where requirements differ by local authority.
Return only valid JSON — no markdown fence, no extra text.`;

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 2000,
      system: `You are a beauty industry compliance expert specialising in nail technicians and independent beauty therapists.
You know COSHH regulations for nail chemicals, patch testing legal requirements, treatment liability insurance, and local authority registration for home salons and mobile therapists.
Return only valid JSON matching the schema requested. No markdown, no extra commentary.`,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!raw) return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    let result: unknown;
    try { result = JSON.parse(cleaned); } catch {
      return NextResponse.json({ error: "AI returned malformed JSON." }, { status: 502 });
    }

    await deductCredits(userEmail, CREDITS_PER_CALL);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 502 });
  }
}
