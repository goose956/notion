import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  businessName: z.string().trim().min(1),
  whatYouSell:  z.string().trim().min(1),
  businessType: z.string().trim().default(""),
  targetAudience: z.string().trim().default(""),
});

const CREDITS_PER_CALL = 1;

interface CompetitorItem {
  name:      string;
  strength:  "Strong" | "Moderate" | "Weak";
  notes:     string;
}

interface CustomerProfile {
  name:  string;
  notes: string;
}

interface MarketResult {
  competitors:      CompetitorItem[];
  customerProfiles: CustomerProfile[];
  positioning:      string;
  summary:          string;
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

function extractJson(text: string): MarketResult | null {
  const fenced = /```json\s*([\s\S]*?)```/i.exec(text)?.[1];
  const raw = fenced ?? text;
  try {
    const parsed = JSON.parse(raw) as Partial<MarketResult>;
    if (!Array.isArray(parsed.competitors) || !Array.isArray(parsed.customerProfiles)) return null;
    const validStrengths = ["Strong", "Moderate", "Weak"] as const;
    return {
      competitors: parsed.competitors.map((c) => {
        const s = validStrengths.includes(c.strength as typeof validStrengths[number]) ? c.strength : "Moderate";
        return { name: String(c.name ?? "").trim(), strength: s as CompetitorItem["strength"], notes: String(c.notes ?? "").trim() };
      }).filter((c) => c.name),
      customerProfiles: parsed.customerProfiles.map((p) => ({
        name:  String(p.name  ?? "").trim(),
        notes: String(p.notes ?? "").trim(),
      })).filter((p) => p.name),
      positioning: String(parsed.positioning ?? "").trim(),
      summary:     String(parsed.summary ?? "").trim(),
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  const userEmail = session.user.email;
  await findOrCreateCustomer(userEmail).catch(() => null);
  const credits = await getCustomerCredits(userEmail).catch(() => 0);
  if (credits < CREDITS_PER_CALL) {
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to run market analysis.` }, { status: 402 });
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const d = parsed.data;
  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1200,
      system: `You are a business analyst helping a small business owner understand their market.
Return ONLY valid JSON:
{
  "summary": "One sentence overview of the market opportunity",
  "positioning": "One paragraph on how this business should position itself to win",
  "competitors": [
    {
      "name": "Competitor name or category (e.g. 'Local freelancers', 'Fiverr', 'John's Bakery')",
      "strength": "Strong" | "Moderate" | "Weak",
      "notes": "Key strength or weakness relevant to competing with this business"
    }
  ],
  "customerProfiles": [
    {
      "name": "Short profile name (e.g. 'The busy parent', 'The small business owner')",
      "notes": "2–3 sentence description of this customer — their situation, what they need, why they'd buy"
    }
  ]
}

Rules:
- Generate 3–5 competitors (real categories or plausible names)
- Generate 2–3 distinct customer profiles
- Be specific and practical — avoid generic statements
- Base everything on the business description provided`,
      messages: [
        {
          role: "user",
          content: [
            `Business: ${d.businessName}`,
            `What they sell: ${d.whatYouSell}`,
            d.businessType     ? `Type: ${d.businessType}` : null,
            d.targetAudience   ? `Target audience: ${d.targetAudience}` : null,
          ].filter(Boolean).join("\n"),
        },
      ],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    const content = textBlock?.type === "text" ? textBlock.text : "";
    const result = extractJson(content);
    if (!result) {
      return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 502 });
    }

    await deductCredits(userEmail, CREDITS_PER_CALL);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to analyse market";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
