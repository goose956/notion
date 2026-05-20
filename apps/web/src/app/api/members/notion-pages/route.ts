import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { NotionApiClient } from "@niche-factory/notion-client";

export interface NotionPageResult {
  id: string;
  title: string;
  icon: string | null;
  url: string;
}

function extractTitle(page: Record<string, unknown>): string {
  // Try page properties for "title" type
  const props = page["properties"] as Record<string, Record<string, unknown>> | undefined;
  if (props) {
    for (const prop of Object.values(props)) {
      if (prop["type"] === "title") {
        const arr = (prop["title"] as Array<{ plain_text: string }>) ?? [];
        const text = arr.map((t) => t.plain_text).join("").trim();
        if (text) return text;
      }
    }
  }
  return "Untitled";
}

function extractIcon(page: Record<string, unknown>): string | null {
  const icon = page["icon"] as Record<string, unknown> | null | undefined;
  if (!icon) return null;
  if (icon["type"] === "emoji") return icon["emoji"] as string;
  if (icon["type"] === "external") return null; // skip image icons
  return null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notionToken = (session as unknown as Record<string, unknown>)["notionToken"] as
    | string
    | undefined;
  if (!notionToken) {
    return NextResponse.json({ error: "No Notion token" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q") ?? "";
  const notion = new NotionApiClient({ auth: notionToken });

  try {
    const result = await notion.call((c) =>
      c.search({
        query,
        filter: { property: "object", value: "page" },
        sort: { direction: "descending", timestamp: "last_edited_time" },
        page_size: 20,
      }),
    );

    const pages: NotionPageResult[] = result.results
      .filter((r) => r.object === "page")
      .map((r) => {
        const p = r as unknown as Record<string, unknown>;
        return {
          id: r.id,
          title: extractTitle(p),
          icon: extractIcon(p),
          url: (p["url"] as string) ?? `https://notion.so/${r.id.replace(/-/g, "")}`,
        };
      });

    return NextResponse.json({ pages });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
