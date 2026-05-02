import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { NichePackSchema } from "@niche-factory/schema";
import { exportPack } from "@niche-factory/exporter";
import { NotionApiClient } from "@niche-factory/notion-client";

const ExportRequestSchema = z.object({
  parentPageId: z.string().min(1),
  databaseIds: z.record(z.string(), z.string()),
  existingPack: NichePackSchema.optional(),
});

// POST /api/export — pull a niche pack from a Notion workspace
export async function POST(request: NextRequest) {
  const notionToken = process.env["NOTION_TOKEN"];
  if (!notionToken) {
    return NextResponse.json(
      { error: "NOTION_TOKEN is not configured on the server" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = ExportRequestSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: input.error.issues },
      { status: 422 },
    );
  }

  const client = new NotionApiClient({ auth: notionToken });

  let pack;
  try {
    const exportOpts = {
      parentPageId: input.data.parentPageId,
      databaseIds: input.data.databaseIds,
      ...(input.data.existingPack !== undefined
        ? { existingPack: input.data.existingPack }
        : {}),
    };
    pack = await exportPack(client, exportOpts);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ pack });
}
