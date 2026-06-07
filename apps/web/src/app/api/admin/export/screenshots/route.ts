import { NextRequest, NextResponse } from "next/server";

// Tab count per niche (we screenshot up to 3)
const NICHE_TAB_COUNT: Record<string, number> = {
  "wedding-planner":        6,
  "rainbow":                6,
  "project-manager":        4,
  "pinterest-poster":       2,
  "neurodivergent":         4,
  "side-hustle":            3,
  "neurodivergent-wedding": 6,
  "food-business":          3,
  "content-creator":        4,
  "etsy-shop":              3,
  "cake-business":          4,
  "str-guidebook":          3,
  "nail-tech":              4,
};

export async function POST(req: NextRequest) {
  const { nicheId, accents } = await req.json();
  const accentList: string[] = Array.isArray(accents) ? accents : [];

  if (!nicheId) {
    return NextResponse.json({ error: "nicheId required" }, { status: 400 });
  }

  const tabCount = NICHE_TAB_COUNT[nicheId] ?? 3;
  const tabsToShoot = Math.min(tabCount, 3);
  const origin = req.headers.get("origin") || req.nextUrl.origin;

  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const dataUrls: string[] = [];

    for (let i = 0; i < tabsToShoot; i++) {
      const accent = accentList[i] ? `?accent=${encodeURIComponent(accentList[i]!)}` : "";
      const url = `${origin}/niche-preview/${nicheId}/${i}${accent}`;
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 800));

      // Screenshot returns a Buffer — no file path needed
      const buffer = await page.screenshot({ fullPage: false }) as Buffer;
      await page.close();

      const base64 = buffer.toString("base64");
      dataUrls.push(`data:image/png;base64,${base64}`);
    }

    await browser.close();
    return NextResponse.json({ dataUrls });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
