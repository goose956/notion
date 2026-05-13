import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listAgentDefinitions, upsertAgentDefinition } from "@niche-factory/db";

export async function GET() {
  const agents = await listAgentDefinitions();
  return NextResponse.json(agents);
}

const CreateSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, "ID must be lowercase kebab-case"),
  name: z.string().min(1),
  description: z.string().default(""),
  systemPrompt: z.string().min(1),
  model: z.string().default("claude-sonnet-4-5"),
  toolList: z.array(z.string()).default([]),
  defaultConfig: z.record(z.unknown()).default({}),
  nicheId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const data = parsed.data;
  const now = new Date();

  const agent = await upsertAgentDefinition({
    id: data.id,
    name: data.name,
    description: data.description,
    systemPrompt: data.systemPrompt,
    model: data.model,
    toolList: data.toolList,
    defaultConfig: data.defaultConfig,
    ...(data.nicheId !== undefined ? { nicheId: data.nicheId } : {}),
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json(agent, { status: 201 });
}
