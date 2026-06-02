import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  section:       z.string().trim().min(1),
  businessName:  z.string().trim().min(1),
  operationType: z.string().trim().default(""),
  speciality:    z.string().trim().default(""),
  goal:          z.string().trim().default(""),
  country:       z.string().trim().default("United Kingdom"),
  extraContext:  z.string().trim().default(""),
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

const SECTION_PROMPTS: Record<string, string> = {
  "Executive Summary": `Write a concise Executive Summary (3–4 paragraphs) for a nail tech / beauty business covering:
1. The business concept — what type of treatments, what makes this business stand out (style, speciality, personal brand, location)
2. Target client: who they are, what occasions drive bookings, why they choose a specialist over a salon chain
3. Business model: home salon / mobile / chair rental / own premises — explain revenue approach and capacity
4. Primary goal and what success looks like in year 1
Tone: warm and professional. If goal is funding — write formally. Otherwise conversational and confident.`,

  "Service Menu & Pricing": `Write a Service Menu & Pricing section (3–4 paragraphs) covering:
1. Core treatment categories — nails (gel, acrylic, nail art), lashes, brows, skincare, waxing — describe each with the range of services offered
2. Pricing strategy: why beauty professionals should price based on time + materials + overhead + profit margin, not what the salon down the road charges. Address the underpricing epidemic in the beauty industry
3. Menu structure: entry-level treatments vs. premium/add-on services. How to build average booking value with add-ons (cuticle care, nail art upgrades, infills vs. new sets)
4. Retail products: recommend home-care retail as a second revenue stream (cuticle oil, nail strengtheners, lash serums)
Emphasise that your time has real value — professional training, insurance, materials and running costs all add up.`,

  "Client Acquisition & Retention": `Write a Client Acquisition & Retention section (3–4 paragraphs) covering:
1. Primary acquisition channels: Instagram and TikTok (before/after nail art content, process videos), Google Business profile, local Facebook groups, Fresha/Treatwell/Booksy listings, word of mouth
2. Content strategy: what to post — finished nail sets, nail art process videos, product flat-lays, client reviews (with permission), behind-the-scenes setup
3. Client retention: rebook at the appointment (fill every 2–3 weeks, new sets every 4–6), loyalty discounts, birthday treat, seasonal promotions (Valentine's, Christmas, summer)
4. Handling no-shows and late cancellations: deposit policy, cancellation policy, how to enforce it professionally without damaging client relationships
Keep it practical and specific to a beauty business.`,

  "Operations & Workspace": `Write an Operations & Workspace section (3–4 paragraphs) covering:
1. Workspace setup requirements for the operation type (home salon / mobile / chair rental / own premises): equipment list (nail desk, UV/LED lamp, drill, lash bed, sterilisation equipment, ventilation), product storage, client seating
2. Appointment management: booking system (Fresha, Treatwell, manual), deposit collection, consultation forms, patch test scheduling, reminder messages
3. Product and materials management: how to stock efficiently, product rotation (shelf life matters for nail chemicals and adhesives), managing waste
4. Working alone and time management: how to structure a working day, back-to-back scheduling, turnaround between clients, self-care (ventilation, gloves, protecting your own nails)
Be specific about the operation type described.`,

  "Financial Plan": `Write a Financial Plan section (3–4 paragraphs) covering:
1. Revenue model: appointment capacity per week (hours available ÷ average appointment length), average booking value, how to increase both throughput and average value
2. Key cost drivers: materials per treatment (gel products, lash adhesive, brow tint etc.), chair rental or premises costs, insurance (essential), training/CPD, marketing
3. The true cost of your time: many nail techs forget to include the time between clients, admin, cleaning, ordering stock. Price to cover all of it, not just treatment time
4. Scale and growth: moving from part-time to full-time capacity, introducing new services, taking on an assistant or renting out a chair, retail revenue
Use realistic numbers for the country and operation type provided.`,

  "Health, Safety & Compliance": `Write a Health, Safety & Compliance section (3–4 paragraphs) covering:
1. COSHH (UK) / chemical hazard management: nail products (acrylics, gel chemicals, adhesives) are hazardous substances. Explain COSHH assessments, ventilation requirements, PPE (gloves, mask), safe storage
2. Patch testing: legally required before certain treatments (lash tints, brow tints, certain chemical treatments). Explain the process, timing (48 hours before), record-keeping, and the legal and insurance implications of skipping it
3. Registrations and qualifications: local authority registration requirements (varies by country/area), NVQ/Level 2-3 beauty qualifications, CPD requirements
4. Insurance: treatment liability insurance is essential — not optional. Explain what it covers, how to get it, typical cost
Tailor precisely to the country provided. Be accurate — incorrect information here could cause real harm.`,
};

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
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to generate a plan section.` }, { status: 402 });
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const d = parsed.data;
  const sectionPrompt = SECTION_PROMPTS[d.section];
  if (!sectionPrompt) return NextResponse.json({ error: "Unknown section." }, { status: 422 });

  const context = [
    `Business name: ${d.businessName}`,
    d.speciality    ? `Speciality: ${d.speciality}`          : null,
    d.operationType ? `Operation type: ${d.operationType}`   : null,
    d.country       ? `Country: ${d.country}`                : null,
    d.goal          ? `Primary goal: ${d.goal}`              : null,
    d.extraContext  ? `Additional context: ${d.extraContext}` : null,
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1000,
      system: `You are a professional business plan writer and beauty industry expert specialising in nail technicians and independent beauty therapists.
You understand the specific challenges beauty professionals face: underpricing, COSHH compliance, patch test requirements, no-show policies, building a loyal client base from scratch.
Write clearly, practically and with genuine industry knowledge. Tailor tone to the goal (funding = formal; growing = conversational).
Use the specific business details provided. Do not invent numbers — estimate realistically for the country and operation type.
Return plain prose — no markdown headers. Paragraph breaks only.`,
      messages: [{ role: "user", content: `Business details:\n${context}\n\nSection to write: ${d.section}\n\n${sectionPrompt}` }],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    const content = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!content) return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });

    await deductCredits(userEmail, CREDITS_PER_CALL);
    return NextResponse.json({ section: d.section, content });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 502 });
  }
}
