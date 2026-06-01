import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  businessName: z.string().trim().min(1),
  foodType:     z.string().trim().min(1),
  premisesType: z.string().trim().default(""),
  country:      z.string().trim().default("United Kingdom"),
});

const CREDITS_PER_CALL = 1;

const CATEGORIES = ["Registration", "Licence", "Certificate", "Insurance", "Inspection"] as const;
type Category = typeof CATEGORIES[number];

interface ComplianceItem {
  name:       string;
  category:   Category;
  required:   boolean;
  description: string;
  authority:  string;
  timescale:  string;
  cost:       string;
}

interface ComplianceResult {
  items:   ComplianceItem[];
  summary: string;
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

function extractJson(text: string): ComplianceResult | null {
  const fenced = /```json\s*([\s\S]*?)```/i.exec(text)?.[1];
  const raw = fenced ?? text;
  try {
    const parsed = JSON.parse(raw) as Partial<ComplianceResult>;
    if (!Array.isArray(parsed.items)) return null;
    return {
      items: parsed.items.map((item) => {
        const base: ComplianceItem = {
          name:        String(item.name ?? "").trim(),
          category:    (CATEGORIES.includes(item.category as Category) ? item.category : "Registration") as Category,
          required:    item.required !== false,
          description: String(item.description ?? "").trim(),
          authority:   String(item.authority ?? "").trim(),
          timescale:   String(item.timescale ?? "").trim(),
          cost:        String(item.cost ?? "").trim(),
        };
        return base;
      }).filter((i) => i.name),
      summary: String(parsed.summary ?? "").trim(),
    };
  } catch {
    return null;
  }
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
  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1500,
      system: `You are a food business compliance expert. Generate a precise, accurate compliance checklist for a food business based on its type, premises and country.

Valid categories: Registration, Licence, Certificate, Insurance, Inspection

Return ONLY valid JSON:
{
  "summary": "One sentence overview of the compliance requirements for this business",
  "items": [
    {
      "name": "Exact name of the requirement",
      "category": "Registration | Licence | Certificate | Insurance | Inspection",
      "required": true | false,
      "description": "What this is and why it is needed (1–2 sentences)",
      "authority": "The body or organisation that issues or enforces this",
      "timescale": "When this must be obtained (e.g. 'Before trading', '28 days before opening', 'Annual renewal')",
      "cost": "Approximate cost (e.g. 'Free', '£150–£200', 'Varies')"
    }
  ]
}

Rules:
- Be accurate and specific to the country and food type
- Include ALL relevant requirements — missing one is worse than listing too many
- Mark genuinely optional items as required: false
- For UK: include food business registration (council), food hygiene rating scheme, HACCP, allergen regulations, food hygiene certificates, public liability insurance, employer's liability if staff
- For US: include local health department permit, food handler permits, business licence, cottage food laws if home-based
- Adjust for premises type (home kitchen has different rules than commercial premises)
- List 6–12 items typically`,
      messages: [{
        role: "user",
        content: [
          `Business: ${d.businessName}`,
          `Type: ${d.foodType}`,
          d.premisesType ? `Premises: ${d.premisesType}` : null,
          `Country: ${d.country}`,
        ].filter(Boolean).join("\n"),
      }],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    const content = textBlock?.type === "text" ? textBlock.text : "";
    const result = extractJson(content);
    if (!result) return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 502 });

    await deductCredits(userEmail, CREDITS_PER_CALL);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 502 });
  }
}
