import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { NotionApiClient } from "@niche-factory/notion-client";

const BodySchema = z.object({
  /** Property name → new value */
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  /** The Notion property types, keyed by name, so we can format correctly */
  propertyTypes: z.record(z.string(), z.string()),
});

function buildNotionProperty(
  type: string,
  value: string | number | boolean | null,
): Record<string, unknown> | null {
  if (value === null || value === "") return null;

  switch (type) {
    case "title":
      return { title: [{ text: { content: String(value) } }] };
    case "rich_text":
      return { rich_text: [{ text: { content: String(value) } }] };
    case "number":
      return { number: typeof value === "number" ? value : parseFloat(String(value)) || null };
    case "select":
      return { select: { name: String(value) } };
    case "multi_select":
      return {
        multi_select: String(value)
          .split(",")
          .map((s) => ({ name: s.trim() }))
          .filter((s) => s.name),
      };
    case "checkbox":
      return { checkbox: value === true || value === "true" };
    case "url":
      return { url: String(value) };
    case "email":
      return { email: String(value) };
    case "phone_number":
      return { phone_number: String(value) };
    case "date":
      return { date: { start: String(value) } };
    case "status":
      return { status: { name: String(value) } };
    default:
      return null;
  }
}

// PATCH /api/members/workspace/[pageId] — update properties on a Notion page
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
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

  const { pageId } = await params;

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

  const notionProperties: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(parsed.data.properties)) {
    const type = parsed.data.propertyTypes[name];
    if (!type) continue;
    const built = buildNotionProperty(type, value);
    if (built !== null) notionProperties[name] = built;
  }

  if (Object.keys(notionProperties).length === 0) {
    return NextResponse.json({ ok: true }); // nothing to update
  }

  const notion = new NotionApiClient({ auth: notionToken });

  try {
    await notion.call((c) =>
      c.pages.update({
        page_id: pageId,
        properties: notionProperties as Parameters<typeof c.pages.update>[0]["properties"],
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Notion update failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/members/workspace/[pageId] — archive (delete) a row
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
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

  const { pageId } = await params;
  const notion = new NotionApiClient({ auth: notionToken });

  try {
    await notion.call((c) =>
      c.pages.update({ page_id: pageId, archived: true }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
