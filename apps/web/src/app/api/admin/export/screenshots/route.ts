import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

// Tab indices to screenshot per niche (0 = first tab, 1 = second, 2 = third)
const NICHE_TAB_COUNT: Record<string, number> = {
  "wedding-planner":     6,
  "rainbow":             6,
  "project-manager":     4,
  "pinterest-poster":    2,
  "neurodivergent":      4,
  "side-hustle":         3,
  "neurodivergent-wedding": 6,
  "food-business":       3,
  "content-creator":     4,
  "etsy-shop":           3,
  "cake-business":       4,
  "str-guidebook":       3,
  "nail-tech":           4,
};

export async function POST(req: NextRequest) {
  const { nicheId, folder } = await req.json();

  if (!nicheId || !folder) {
    return NextResponse.json({ error: "nicheId and folder required" }, { status: 400 });
  }

  const tabCount = NICHE_TAB_COUNT[nicheId] ?? 3;
  // We screenshot up to 3 tabs
  const tabsToShoot = Math.min(tabCount, 3);

  // Resolve base URL from request
  const origin = req.headers.get("origin") || req.nextUrl.origin;

  try {
    // Dynamic import so puppeteer is only loaded server-side
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const outDir = path.resolve(folder);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const paths: string[] = [];

    for (let i = 0; i < tabsToShoot; i++) {
      const url = `${origin}/niche-preview/${nicheId}/${i}`;
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 800));

      const filePath = path.join(outDir, `${nicheId}-${i + 1}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      await page.close();
      paths.push(filePath);
    }

    await browser.close();
    return NextResponse.json({ paths });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
