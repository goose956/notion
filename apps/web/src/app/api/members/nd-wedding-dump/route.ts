import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  text: z.string().trim().min(1),
});

const CREDITS_PER_CALL = 1;

const VENDOR_TYPES = [
  "Venue", "Catering", "Photography", "Videography", "Florist",
  "Music / DJ", "Cake", "Hair & Makeup", "Transport", "Officiant",
  "Stationery", "Decor", "Clothing", "Jewellery", "Other",
] as const;

type VendorType = typeof VENDOR_TYPES[number];

interface VendorItem {
  name: string;
  type: VendorType;
  notes?: string;
  priceRange?: string;
}

interface DumpResult {
  vendors: VendorItem[];
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

function extractJson(text: string): DumpResult | null {
  const fenced = /```json\s*([\s\S]*?)```/i.exec(text)?.[1];
  const raw = fenced ?? text;
  try {
    const parsed = JSON.parse(raw) as Partial<DumpResult>;
    if (!Array.isArray(parsed.vendors)) return null;
    return {
      vendors: parsed.vendors.map((v) => {
        const base: VendorItem = {
          name: String(v.name ?? "").trim(),
          type: (VENDOR_TYPES.includes(v.type as VendorType) ? v.type : "Other") as VendorType,
        };
        if (v.notes) base.notes = String(v.notes).trim();
        if (v.priceRange) base.priceRange = String(v.priceRange).trim();
        return base;
      }).filter((v) => v.name),
      summary: String(parsed.summary ?? "").trim(),
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
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to use Vendor Brain Dump.` }, { status: 402 });
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const systemPrompt = `You are a wedding planning assistant helping a neurodivergent couple organise their vendor thoughts.
Extract vendor mentions from the user's brain dump and categorise them.

Valid vendor types: ${VENDOR_TYPES.join(", ")}

Return ONLY valid JSON:
{
  "summary": "One short sentence acknowledging what they've captured",
  "vendors": [
    {
      "name": "Vendor name or description (e.g. 'The Old Barn venue', 'cousin Sarah does flowers')",
      "type": "one of the valid types above",
      "notes": "Any specific notes mentioned (optional)",
      "priceRange": "Any price mentioned (optional, e.g. '£2000', 'around £500')"
    }
  ]
}

Rules:
- Extract every vendor mention, even vague ones
- If no name is given, use a descriptive placeholder like 'Local florist from Instagram'
- Keep notes concise
- If no vendors are found, return an empty vendors array`;

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: parsed.data.text }],
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
    const message = err instanceof Error ? err.message : "Failed to process vendor dump";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
