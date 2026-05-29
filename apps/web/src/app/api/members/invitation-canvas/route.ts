import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import {
  deductCredits,
  findOrCreateCustomer,
  getCustomerCredits,
  getSettingValue,
} from "@niche-factory/db";

const BodySchema = z.object({
  prompt: z.string().min(1),
  style: z.string().optional(),
  colours: z.string().optional(),
  coupleNames: z.string().optional(),
  weddingDate: z.string().optional(),
  venue: z.string().optional(),
  mode: z.enum(["both", "invitation", "thank-you"]).optional(),
  canvasSize: z.enum(["a5-portrait", "five-by-seven", "square-social"]).optional(),
});

const CREDITS_PER_GENERATION = 5;

interface GeneratedPayload {
  invitationText: string;
  thankYouText: string;
  colorPalette: string[];
  svg: string;
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

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```") || !trimmed.endsWith("```")) return trimmed;
  const firstLineEnd = trimmed.indexOf("\n");
  if (firstLineEnd === -1) return trimmed.replace(/```/g, "").trim();
  return trimmed.slice(firstLineEnd + 1, -3).trim();
}

function parsePayload(raw: string): GeneratedPayload {
  const parsed = JSON.parse(stripCodeFence(raw)) as Partial<GeneratedPayload>;
  return {
    invitationText: typeof parsed.invitationText === "string" ? parsed.invitationText : "",
    thankYouText: typeof parsed.thankYouText === "string" ? parsed.thankYouText : "",
    colorPalette: Array.isArray(parsed.colorPalette)
      ? parsed.colorPalette.filter((c): c is string => typeof c === "string").slice(0, 6)
      : [],
    svg: typeof parsed.svg === "string" ? parsed.svg : "",
  };
}

function sanitizeSvg(svg: string): string {
  let safe = svg.trim();
  safe = safe.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  safe = safe.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  safe = safe.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  if (!safe.startsWith("<svg")) {
    throw new Error("Model response did not include an SVG document");
  }
  return safe;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email?.trim();
  if (!userEmail) {
    return NextResponse.json({ error: "Unable to resolve account email for credits." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  await findOrCreateCustomer(userEmail).catch(() => null);
  const currentCredits = await getCustomerCredits(userEmail).catch(() => 0);
  if (currentCredits < CREDITS_PER_GENERATION) {
    return NextResponse.json(
      { error: `You need ${CREDITS_PER_GENERATION} credits to generate a canvas design.` },
      { status: 402 },
    );
  }

  const [apiKey, model] = await Promise.all([resolveApiKey(userEmail), resolveModel()]);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Claude is not configured. Missing ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  const client = new Anthropic({ apiKey });

  const coupleNames = parsed.data.coupleNames ?? "Couple Names";
  const weddingDate = parsed.data.weddingDate ?? "Wedding Date";
  const venue = parsed.data.venue ?? "Wedding Venue";
  const style = parsed.data.style ?? "Romantic";
  const colours = parsed.data.colours ?? "Soft blush and ivory";
  const mode = parsed.data.mode ?? "both";

  const prompt = `You are an expert wedding stationery designer. Create a stunning, professional-quality wedding invitation as an SVG.

Return ONLY valid JSON (no markdown, no explanation) in this exact shape:
{"invitationText":"...","thankYouText":"...","colorPalette":["#hex1","#hex2","#hex3","#hex4","#hex5"],"svg":"<svg ...>...</svg>"}

WEDDING DETAILS:
- Couple: ${coupleNames}
- Date: ${weddingDate}
- Venue: ${venue}
- Style: ${style}
- Colours: ${colours}
- Mode: ${mode}
- User brief: ${parsed.data.prompt}

CONTENT RULES:
- mode=both: provide both invitationText and thankYouText
- mode=invitation: provide invitationText, set thankYouText to ""
- mode=thank-you: provide thankYouText, set invitationText to ""

SVG DESIGN SPECIFICATION — follow every instruction precisely:

Canvas: viewBox="0 0 1200 1800" width="1200" height="1800"
No external images or fonts. Use font-family="Georgia, 'Times New Roman', serif" for elegance.

LAYER STRUCTURE (build from bottom to top):

1. BACKGROUND
   - <rect width="1200" height="1800"> filled with the lightest palette colour or a warm ivory/cream
   - A <linearGradient> from top to bottom, slightly darker at edges, lighter in centre
   - Optional: subtle repeating pattern using small <circle> or <diamond> shapes at low opacity (0.04–0.08)

2. OUTER BORDER FRAME
   - A decorative outer border: <rect x="30" y="30" width="1140" height="1740"> stroke only, stroke-width="3", rounded corners rx="8"
   - Inner border: <rect x="50" y="50" width="1100" height="1700"> stroke-width="1", same colour, slightly transparent
   - Corner ornaments at all 4 corners: draw small decorative diamond or cross shapes using <path> at coordinates (60,60), (1140,60), (60,1740), (1140,1740)

3. TOP BOTANICAL DECORATION (y: 60–380)
   - Draw an organic floral/botanical arrangement centred at x=600, y=220
   - Use <path> elements with bezier curves to draw LEAF SHAPES: e.g. "M600,80 C560,120 520,160 500,210 C530,190 570,180 600,195 C630,180 670,190 700,210 C680,160 640,120 600,80 Z"
   - Draw 4–6 leaves of different sizes radiating from a central stem
   - Add a central stem: <line x1="600" y1="80" x2="600" y2="340"> stroke-width="2"
   - Add 2–3 small circular flowers: <circle r="12"> filled with accent colour, clustered near stem top
   - Add small petal groups using ellipse rotated with transform="rotate(angle,cx,cy)"
   - Vary fill opacity (0.5–1.0) for depth

4. OPENING TEXT BLOCK (y: 380–520)
   - "Together with their families" — font-size="34" font-style="italic" text-anchor="middle" x="600" fill=secondary colour
   - Small decorative line divider: <line x1="350" y1="Y" x2="850" y2="Y"> with small diamond in centre

5. COUPLE NAMES (y: 520–720)
   - LARGE display text: "${coupleNames}"
   - If names contain "&" or "and": split onto two lines with "&" or "and" centred between them in a smaller italic font
   - Names font-size="96"–"110" (reduce if names are long), font-weight="bold", text-anchor="middle" x="600"
   - Fill with the primary/darkest palette colour
   - Add a subtle drop shadow using <filter><feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.15"/></filter>

6. CENTRAL DECORATIVE DIVIDER (y: 720–800)
   - An ornamental horizontal divider centred at x=600
   - Draw: two horizontal lines with a central ornament (small diamond <polygon> or flourish <path>)
   - Add small leaf or flower motifs at the line ends

7. INVITATION WORDING (y: 800–1050)
   - "request the pleasure of your company" — font-size="32" italic, text-anchor="middle"
   - "at the marriage of" — font-size="30" italic
   - Leave 40px gap between lines

8. EVENT DETAILS (y: 1050–1350)
   - Date: font-size="46" font-weight="bold", text-anchor="middle", fill=primary colour
   - Decorative dot or small flourish between date parts
   - "at" — font-size="30" italic
   - Time (if provided): font-size="38"
   - Venue name: font-size="44" font-weight="bold"
   - Venue address/location: font-size="32"

9. RSVP / FOOTER TEXT (y: 1350–1480)
   - "RSVP by [date if known, else 'please respond']" — font-size="28" letter-spacing="4"
   - Dress code or any additional note — font-size="26" italic

10. BOTTOM BOTANICAL DECORATION (y: 1480–1750)
    - Mirror/complement of the top botanical arrangement
    - Can be simpler — 3–4 leaves and small flowers, rotated 180°
    - Use transform="rotate(180, 600, 1620)" on a <g> group containing the floral elements

COLOUR RULES:
- Derive 5 colours from the requested palette: background (lightest), primary (darkest/richest for names/borders), accent (mid-tone for florals), text (near-dark), highlight (for small details)
- Use these consistently. Do NOT use black (#000) — use deep versions of the palette colours instead.
- Floral elements: mix 2–3 palette colours at varying opacity for depth

QUALITY CHECKLIST (every item must be present):
- At least 25 distinct SVG elements
- Gradient backgrounds using <defs><linearGradient>
- At least 8 <path> elements with bezier curves for botanical shapes
- Drop shadow filter on couple names
- Two botanical decorative zones (top and bottom)
- Decorative border with corner elements
- All text centred (text-anchor="middle" x="600")
- No placeholder text — use the actual couple names, date, and venue provided

The SVG must look like it came from a professional wedding stationery studio, not a basic template.`;



  try {
    const response = await client.messages.create({
      model,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!text) {
      return NextResponse.json({ error: "Claude returned an empty response" }, { status: 502 });
    }

    const generated = parsePayload(text);
    const safeSvg = sanitizeSvg(generated.svg);

    const newCredits = await deductCredits(userEmail, CREDITS_PER_GENERATION);

    return NextResponse.json({
      invitationText: generated.invitationText,
      thankYouText: generated.thankYouText,
      colorPalette: generated.colorPalette,
      svg: safeSvg,
      credits: newCredits,
      charged: CREDITS_PER_GENERATION,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
