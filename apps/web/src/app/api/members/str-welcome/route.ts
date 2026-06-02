import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { deductCredits, findOrCreateCustomer, getCustomerCredits, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  propertyName:  z.string().trim().min(1),
  propertyType:  z.string().trim().default(""),
  hostName:      z.string().trim().default(""),
  neighbourhood: z.string().trim().default(""),
  city:          z.string().trim().default(""),
  packType:      z.string().trim().min(1),
  // Property specifics
  checkInTime:   z.string().trim().default("3:00 PM"),
  checkOutTime:  z.string().trim().default("11:00 AM"),
  wifiName:      z.string().trim().default(""),
  wifiPassword:  z.string().trim().default(""),
  bedrooms:      z.number().optional(),
  maxGuests:     z.number().optional(),
  amenities:     z.string().trim().default(""),   // comma-separated
  houseRules:    z.string().trim().default(""),   // host's own notes
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

const PACK_PROMPTS: Record<string, string> = {
  "Welcome Letter": `Write a warm, personalised welcome letter for short-term rental guests arriving at this property.
Include:
- Warm greeting welcoming them to the property and the area
- Brief mention of what makes the property special
- Reminder of check-in time and how to access the property (use [ACCESS INSTRUCTIONS] as a placeholder)
- Encouragement to reach out with any questions (use [HOST PHONE/MESSAGE] as placeholder)
- Warm closing sign-off from the host
Keep it to 3–4 short paragraphs. Warm, personal, not corporate.`,

  "Check-in Guide": `Write a clear, step-by-step check-in guide for short-term rental guests.
Include:
- How to find the property / arrive (use [PROPERTY ADDRESS] placeholder)
- Key/access instructions (use [KEY LOCATION / LOCKBOX CODE] placeholder)
- Parking instructions (use [PARKING DETAILS] placeholder)
- First steps on arrival (lights, heating, etc.) — use placeholders where property-specific
- WiFi details section (clearly show the name and password)
- A note on who to contact if there are any issues
Format as numbered steps with clear headings. Practical and easy to scan on a phone.`,

  "House Rules": `Write a polished, friendly house rules document for a short-term rental.
Include rules for:
- Check-in / check-out times
- Noise and quiet hours (use [QUIET HOURS] placeholder if not specified)
- Maximum guests
- Smoking policy (assume no smoking inside)
- Pets policy (use [PET POLICY] placeholder)
- Parties / events (no parties/events unless agreed)
- Parking
- Rubbish and recycling (use [BIN COLLECTION DAY] placeholder)
- Damages / breakages — please report immediately
- A friendly closing note
Format as a clean list with friendly but clear language. Not aggressive or legalistic.`,

  "Checkout Checklist": `Write a checkout checklist for short-term rental guests.
Include tasks for:
- Check-out time reminder
- Stripping beds / leaving linen (use [LINEN INSTRUCTIONS] placeholder)
- Washing up / dishwasher
- Emptying bins
- Returning keys / securing the property (use [KEY RETURN INSTRUCTIONS] placeholder)
- Turning off all lights, heating and appliances
- Reporting any damages
- A friendly thank-you note and invitation to return / leave a review
Format as a clean numbered checklist. Friendly, not demanding.`,

  "WiFi Card": `Write a clean, minimal WiFi card / placard for a short-term rental property.
Format as a simple card with:
- Welcome header (e.g. "Welcome to [Property Name]")
- Network name clearly labelled
- Password clearly labelled
- A note to connect to the 5GHz network if available for faster speeds
- 1–2 sentence note about the best spots in the property for signal (use [SIGNAL TIPS] placeholder)
- Brief troubleshooting: "If you have any issues, please contact [HOST]"
Keep it very clean and scannable — this will be printed or displayed in the property.`,
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
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to generate welcome content.` }, { status: 402 });
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });

  const d = parsed.data;
  const packPrompt = PACK_PROMPTS[d.packType];
  if (!packPrompt) return NextResponse.json({ error: "Unknown pack type." }, { status: 422 });

  const context = [
    `Property: ${d.propertyName}${d.propertyType ? ` (${d.propertyType})` : ""}`,
    d.hostName      ? `Host name: ${d.hostName}` : null,
    d.neighbourhood ? `Location: ${d.neighbourhood}, ${d.city}` : d.city ? `City: ${d.city}` : null,
    `Check-in time: ${d.checkInTime}`,
    `Check-out time: ${d.checkOutTime}`,
    d.wifiName      ? `WiFi name: ${d.wifiName}` : null,
    d.wifiPassword  ? `WiFi password: ${d.wifiPassword}` : null,
    d.bedrooms      !== undefined ? `Bedrooms: ${d.bedrooms}` : null,
    d.maxGuests     !== undefined ? `Max guests: ${d.maxGuests}` : null,
    d.amenities     ? `Amenities: ${d.amenities}` : null,
    d.houseRules    ? `Host's specific rules/notes: ${d.houseRules}` : null,
    d.extraContext  ? `Additional context: ${d.extraContext}` : null,
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey });

  try {
    const res = await client.messages.create({
      model,
      max_tokens: 1000,
      system: `You are a hospitality copywriter creating polished welcome pack content for short-term rental hosts.
Write in a warm, professional tone. Use the property details provided and insert [PLACEHOLDER] text where host-specific information is needed.
Make guests feel genuinely welcomed and well-informed. Avoid corporate or generic language.`,
      messages: [{
        role: "user",
        content: `Property details:\n${context}\n\nDocument to write: ${d.packType}\n\n${packPrompt}`,
      }],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    const content = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!content) return NextResponse.json({ error: "AI returned an empty response." }, { status: 502 });

    await deductCredits(userEmail, CREDITS_PER_CALL);
    return NextResponse.json({ packType: d.packType, content });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 502 });
  }
}
