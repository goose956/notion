import { NextRequest, NextResponse } from "next/server";
import { buildMagicLink } from "@/lib/magic-link";

const DEMO_EMAIL = "demo@stridivo.com";

export async function POST(req: NextRequest) {
  const body = await req.json() as { nicheId?: string; tabLabels?: string[]; accents?: string[] };
  const { nicheId, tabLabels } = body;

  if (!nicheId) {
    return NextResponse.json({ error: "nicheId required" }, { status: 400 });
  }

  const tabs: string[] = Array.isArray(tabLabels) && tabLabels.length > 0
    ? tabLabels.slice(0, 3)
    : ["Dashboard"];

  const secret = process.env["MAGIC_LINK_SECRET"] ?? process.env["AUTH_SECRET"] ?? "dev-secret";
  const origin = req.headers.get("origin") || req.nextUrl.origin;

  const magicUrl = buildMagicLink(
    DEMO_EMAIL,
    secret,
    origin,
    `/members/workspace`,
  );

  try {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");

    const browser = await puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Log in via magic link
    await page.goto(magicUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Navigate to workspace for this niche
    await page.goto(`${origin}/members/workspace?nicheId=${encodeURIComponent(nicheId)}`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 3000));

    const dataUrls: string[] = [];

    for (let i = 0; i < tabs.length; i++) {
      const label = tabs[i]!;

      if (i > 0) {
        // Click the sidebar tab with this label
        await page.evaluate((lbl: string) => {
          const candidates = document.querySelectorAll<HTMLElement>(
            'button, [role="button"], div[style*="cursor: pointer"]',
          );
          for (const el of candidates) {
            if (el.textContent?.trim().includes(lbl)) {
              el.click();
              break;
            }
          }
        }, label);
        await new Promise((r) => setTimeout(r, 1500));
      }

      const buffer = await page.screenshot({ fullPage: false }) as Buffer;
      dataUrls.push(`data:image/png;base64,${buffer.toString("base64")}`);
    }

    await browser.close();
    return NextResponse.json({ dataUrls });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
