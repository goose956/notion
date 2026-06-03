import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const LineItemSchema = z.object({
  description: z.string().trim(),
  quantity:    z.number().default(1),
  rate:        z.number().default(0),
});

const BodySchema = z.object({
  clientName:    z.string().trim().min(1),
  invoiceNumber: z.string().trim().default(""),
  projectName:   z.string().trim().default(""),
  lineItems:     z.array(LineItemSchema).default([]),
  paymentTerms:  z.string().trim().default("30 days"),
  yourName:      z.string().trim().default(""),
  yourEmail:     z.string().trim().default(""),
  notes:         z.string().trim().default(""),
  country:       z.string().trim().default(""),
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

  const { clientName, invoiceNumber, projectName, lineItems, paymentTerms, yourName, yourEmail, notes, country } = parsed.data;

  const credits = await getCustomerCredits(email).catch(() => 0);
  if (credits < CREDITS_PER_CALL) return NextResponse.json({ error: "Not enough credits" }, { status: 402 });

  const apiKey = await resolveApiKey(email);
  if (!apiKey) return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 500 });

  const model    = await resolveModel();
  const client   = new Anthropic({ apiKey });
  const customer = await findOrCreateCustomer(email);

  const usEnglish = country.toLowerCase().includes("united states");
  const currency  = usEnglish ? "USD ($)" : country.toLowerCase().includes("australia") ? "AUD ($)" : country.toLowerCase().includes("canada") ? "CAD ($)" : country.toLowerCase().includes("europe") ? "EUR (€)" : "GBP (£)";

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const dueDate = new Date(today);
  const termDays = parseInt(paymentTerms) || 30;
  dueDate.setDate(dueDate.getDate() + termDays);
  const dueDateStr = dueDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  const lineItemsText = lineItems.length > 0
    ? lineItems.map((li) => `- ${li.description} | Qty: ${li.quantity} | Rate: ${li.rate} | Amount: ${(li.quantity * li.rate).toFixed(2)}`).join("\n")
    : "- Professional services (please fill in your line items)";

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.rate, 0);

  const prompt = `Format a professional freelance invoice as a clean text document. Use ${usEnglish ? "US English" : "British English"} and ${currency}.

Invoice details:
- Invoice number: ${invoiceNumber || "INV-001"}
- Date: ${dateStr}
- Due date: ${dueDateStr} (${paymentTerms})
- From: ${yourName || "Your Name"} ${yourEmail ? `<${yourEmail}>` : ""}
- To: ${clientName}
${projectName ? `- Project: ${projectName}` : ""}

Line items:
${lineItemsText}

Subtotal: ${subtotal.toFixed(2)}
${notes ? `Notes: ${notes}` : ""}

Format this as a professional invoice document with:

**INVOICE**
Invoice number, date, due date — clearly formatted at the top.

**FROM / TO**
Clear sender and recipient blocks.

**LINE ITEMS**
A clean table showing: Description | Quantity | Rate | Amount — with subtotal and total clearly shown at the bottom.

**PAYMENT TERMS**
State the payment terms clearly. Include a placeholder for bank/payment details (e.g. "Bank details: [Add your account details here]").

**NOTES**
Any additional notes or thank you message.

Make it look professional and ready to copy into an email or PDF. Keep it clean — no unnecessary filler.`;

  const msg = await client.messages.create({
    model,
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  await deductCredits(customer.id, CREDITS_PER_CALL);

  const invoice = (msg.content[0] as { type: string; text: string }).text;
  const title = `Invoice ${invoiceNumber || "INV-001"} — ${clientName}${projectName ? ` (${projectName})` : ""}`;
  return NextResponse.json({ invoice, title, clientName });
}
