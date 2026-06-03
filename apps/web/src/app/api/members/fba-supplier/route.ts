import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  productName:   z.string().trim().min(1),
  specifications: z.string().trim().default(""),
  targetPrice:   z.string().trim().default(""),
  moq:           z.string().trim().default(""),
  packaging:     z.string().trim().default(""),
  marketplace:   z.string().trim().default("Amazon UK"),
  notes:         z.string().trim().default(""),
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

  const { productName, specifications, targetPrice, moq, packaging, marketplace, notes } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const isUS = marketplace.toLowerCase().includes("us") || marketplace.toLowerCase().includes(".com");

  const prompt = `Write a professional sourcing brief and supplier outreach message for an Amazon FBA seller. This will be sent to manufacturers on Alibaba, Global Sources or directly. It should be clear, professional and show the seller knows what they're doing — suppliers take serious buyers more seriously.

Product: ${productName}
${specifications ? `Specifications / requirements: ${specifications}` : ""}
${targetPrice    ? `Target unit price: ${targetPrice}` : ""}
${moq            ? `Desired MOQ: ${moq}` : ""}
${packaging      ? `Packaging requirements: ${packaging}` : ""}
Destination marketplace: ${isUS ? "Amazon USA" : "Amazon UK"}
${notes          ? `Additional notes: ${notes}` : ""}

Write the complete sourcing brief with these sections:

**SUBJECT LINE**
A clear, professional email subject line the seller can use.

**INTRODUCTION**
2–3 sentences. Who the buyer is (an Amazon FBA seller, not a retailer or wholesaler), what market they sell in, and that they are looking to build a long-term relationship with a reliable supplier.

**PRODUCT SPECIFICATION**
A detailed, structured list of the exact product requirements:
- Product name and description
- Dimensions / weight (with tolerances where applicable)
- Materials and quality standards
- Colour / finish options required
- Any certifications needed (CE, FCC, REACH, etc. — infer from product type)
- Safety or compliance requirements for ${isUS ? "US (CPSC, FDA if relevant)" : "UK/EU (CE, UKCA, trading standards)"}

**PACKAGING REQUIREMENTS**
- Retail packaging specification (branded box, polybag, etc.)
- Amazon FBA labelling requirements (FNSKU barcode placement, suffocation warning if needed)
- Master carton requirements

**ORDER DETAILS**
- Desired MOQ for the first order
- Target FOB or EXW unit price
- Desired payment terms
- Preferred shipping method (sea freight / air)
- Required lead time

**QUALITY CONTROL**
- Pre-shipment inspection requirement
- Sample request (paid sample, specify quantity)
- Any defect rate tolerance

**QUESTIONS FOR THE SUPPLIER**
A numbered list of 8–10 specific, intelligent questions the seller should ask. These should uncover capacity, quality processes, certifications, exclusivity, and red flags.

End with a professional sign-off.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const brief = (msg.content[0] as { type: string; text: string }).text;
  const title = `Supplier Brief: ${productName}`;
  return NextResponse.json({ brief, title, productName });
}
