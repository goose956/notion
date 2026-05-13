import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listCustomTools, upsertCustomTool } from "@niche-factory/db";

const InputParamSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "object"]),
  description: z.string().default(""),
  required: z.boolean().default(false),
});

const CreateCustomToolSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, "ID must be lowercase letters, numbers, and underscores only"),
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, "Name must be lowercase letters, numbers, and underscores only"),
  description: z.string().min(1, "Description is required"),
  toolType: z.enum(["webhook"]).default("webhook"),
  /** Webhook config */
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  method: z.enum(["GET", "POST", "PUT", "PATCH"]).default("POST"),
  authHeader: z.string().optional(),
  /** Input parameters */
  params: z.array(InputParamSchema).default([]),
  enabled: z.boolean().default(true),
});

/** Build an Anthropic-compatible input_schema from the params list */
function buildInputSchema(params: z.infer<typeof InputParamSchema>[]) {
  const properties: Record<string, { type: string; description: string }> = {};
  const required: string[] = [];

  for (const p of params) {
    properties[p.name] = { type: p.type, description: p.description };
    if (p.required) required.push(p.name);
  }

  return {
    type: "object" as const,
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

export async function GET() {
  try {
    const rows = await listCustomTools();
    return NextResponse.json(rows);
  } catch (err) {
    console.error("[GET /api/tools/custom]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load custom tools" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateCustomToolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const inputSchema = buildInputSchema(data.params);

  const config: Record<string, unknown> = {
    method: data.method,
  };
  if (data.url && data.url.trim() !== "") config["url"] = data.url.trim();
  if (data.authHeader && data.authHeader.trim() !== "") {
    config["headers"] = { Authorization: data.authHeader.trim() };
  }

  const row = await upsertCustomTool({
    id: data.id,
    name: data.name,
    description: data.description,
    toolType: data.toolType,
    config,
    inputSchema,
    enabled: data.enabled,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return NextResponse.json(row, { status: 201 });
}
