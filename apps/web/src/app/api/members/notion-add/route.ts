import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { notionCreateSkill } from "@niche-factory/agent-tools/skills/notion_create/notion-create.js";
import type { SkillContext } from "@niche-factory/agent-tools";

const BodySchema = z.object({
  notionDatabaseId: z.string().min(1),
  properties: z.record(z.string(), z.unknown()),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notionToken = (session as unknown as Record<string, unknown>)["notionToken"] as
    | string
    | undefined;
  if (!notionToken) {
    return NextResponse.json(
      { error: "No Notion token — sign in with Notion first" },
      { status: 401 },
    );
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

  const ctx: SkillContext = { notionToken, customerId: session.user.email ?? "member" };

  const result = await notionCreateSkill.handler(
    {
      database_id: parsed.data.notionDatabaseId,
      properties: parsed.data.properties,
    },
    ctx,
  );

  if (result.startsWith("Error")) {
    return NextResponse.json({ error: result }, { status: 502 });
  }

  return NextResponse.json({ ok: true, message: result });
}
