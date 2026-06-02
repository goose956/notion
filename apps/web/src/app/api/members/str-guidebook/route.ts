import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  propertyName:  z.string().trim().min(1),
  propertyType:  z.string().trim().default(""),
  neighbourhood: z.string().trim().min(1),
  city:          z.string().trim().min(1),
  section:       z.string().trim().min(1),
  extraContext:  z.string().trim().default(""),
});

const CREDITS_PER_CALL = 2; // uses Serper + Claude

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

async function resolveSerperKey(email: string): Promise<string | undefined> {
  const customerKey = await getSettingValue(`customer.${email}.serper.apiKey`);
  if (customerKey?.trim()) return customerKey.trim();
  const globalKey = await getSettingValue("serper.apiKey");
  if (globalKey?.trim()) return globalKey.trim();
  return process.env["SERPER_API_KEY"];
}

// Serper search helper
async function serperSearch(query: string, apiKey: string, num = 6): Promise<string> {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return "";
    const data = await res.json() as {
      organic?: Array<{ title?: string; link?: string; snippet?: string }>;
    };
    return (data.organic ?? []).slice(0, num)
      .map((r) => `• ${r.title ?? ""}: ${r.snippet ?? ""} (${r.link ?? ""})`)
      .join("\n");
  } catch {
    return "";
  }
}

const SECTION_QUERIES: Record<string, (neighbourhood: string, city: string) => string[]> = {
  "Dining & Cafés": (n, c) => [
    `best restaurants ${n} ${c}`,
    `best cafes coffee shops ${n} ${c}`,
  ],
  "Things to Do": (n, c) => [
    `best things to do ${n} ${c} attractions`,
    `parks walks outdoor activities near ${n} ${c}`,
  ],
  "Supermarkets & Shops": (n, c) => [
    `supermarkets grocery stores ${n} ${c}`,
    `pharmacies convenience stores ${n} ${c}`,
  ],
  "Transport & Parking": (n, c) => [
    `public transport how to get around ${n} ${c} buses tube`,
    `parking ${n} ${c} car park`,
  ],
  "Emergency & Safety": (n, c) => [
    `emergency numbers ${c} police hospital A&E near ${n}`,
    `nearest hospital urgent care ${n} ${c}`,
  ],
  "Local Tips": (n, c) => [
    `local tips hidden gems ${n} ${c} visitors guide`,
    `what locals love ${n} ${c}`,
  ],
};

const SECTION_PROMPTS: Record<string, string> = {
  "Dining & Cafés": `Write a Dining & Cafés section for a short-term rental guidebook. Include:
- 4–6 recommended restaurants across different price points and cuisines
- 2–3 cafés/coffee shops
- For each: name, brief description (1–2 sentences), what to order or why it's special, approximate price range (£/$$/$$$)
- A brief intro paragraph welcoming guests to the local food scene
Format clearly with restaurant names as bold headings. Warm, welcoming tone.`,

  "Things to Do": `Write a Things to Do section for a short-term rental guidebook. Include:
- 4–6 activities, attractions or experiences nearby
- Mix of free and paid options; indoor and outdoor
- For each: name, brief description, how far/how to get there, best for (families/couples/solo)
- A brief intro about what makes the area special
Format clearly with place names as bold headings.`,

  "Supermarkets & Shops": `Write a Supermarkets & Shops section for a short-term rental guidebook. Include:
- 2–3 supermarkets (name, distance/how to get there, opening hours if known)
- 1–2 convenience stores or late-night options
- Pharmacy or chemist
- Any useful local shops (bakery, deli, market)
Keep it practical and concise.`,

  "Transport & Parking": `Write a Transport & Parking section for a short-term rental guidebook. Include:
- Public transport options (bus, tube/metro, tram) — which lines, how to pay
- Taxi/ride-hailing apps recommended locally
- Parking situation (street parking rules, nearby car parks, costs)
- Walking/cycling options if relevant
- Tip about getting to/from the airport if applicable
Practical, bullet-pointed format.`,

  "Emergency & Safety": `Write an Emergency & Safety section for a short-term rental guidebook. Include:
- Emergency number (999 UK / 911 US / 112 EU) — whichever is appropriate
- Nearest hospital / A&E / urgent care
- Non-emergency police number
- Nearest pharmacy
- Property emergency contact (leave as [HOST PHONE NUMBER] placeholder)
- Fire safety note (leave as [FIRE ESCAPE ROUTE] placeholder)
Keep it clear, calm and reassuring.`,

  "Local Tips": `Write a Local Tips section for a short-term rental guidebook. Include:
- 4–6 insider tips that make guests feel like locals
- Could include: best time to visit certain spots, hidden gems, local customs, things to avoid, seasonal events
- A warm closing note encouraging guests to explore
Make it feel personal and genuine, like advice from a friend who lives there.`,
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
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credits to generate a guidebook section.` }, { status: 402 });
  }

  const [apiKey, model, serperKey] = await Promise.all([
    resolveApiKey(userEmail),
    resolveModel(),
    resolveSerperKey(userEmail),
  ]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const d = parsed.data;
  const queries = SECTION_QUERIES[d.section]?.(d.neighbourhood, d.city) ?? [];
  const sectionPrompt = SECTION_PROMPTS[d.section];
  if (!sectionPrompt) return NextResponse.json({ error: "Unknown section." }, { status: 422 });

  // Run searches in parallel if Serper key available
  let searchContext = "";
  if (serperKey && queries.length > 0) {
    const results = await Promise.all(queries.map((q) => serperSearch(q, serperKey)));
    const combined = results.filter(Boolean).join("\n\n");
    if (combined) {
      searchContext = `\n\nLive search results for ${d.neighbourhood}, ${d.city}:\n${combined}\n\nUse the specific places, names and details from these search results where relevant. Prioritise highly-rated, well-reviewed options.`;
    }
  }

  const context = [
    `Property: ${d.propertyName}${d.propertyType ? ` (${d.propertyType})` : ""}`,
    `Location: ${d.neighbourhood}, ${d.city}`,
    d.extraContext ? `Host notes: ${d.extraContext}` : null,
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1200,
      system: `You are a professional hospitality writer creating polished local guidebook content for short-term rental guests.
Write in a warm, welcoming tone — like a knowledgeable local friend giving genuine recommendations.
Be specific and practical. Use real place names from the search results where provided. Do not invent places.
Format with clear headings, emoji icons for each venue/activity, and concise descriptions.
${searchContext ? "The search results provided are live Google results — use the specific businesses and details mentioned." : "The Serper search API is not configured so use your knowledge of the area."}`,
      messages: [{
        role: "user",
        content: `Property details:\n${context}\n\nSection to write: ${d.section}\n\n${sectionPrompt}${searchContext}`,
      }],
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
