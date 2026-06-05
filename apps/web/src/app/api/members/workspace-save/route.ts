import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getAppDatabase, getAppWorkspaceForDatabase, createAppRow } from "@niche-factory/db";
import { randomUUID } from "node:crypto";

const BodySchema = z.object({
  databaseId: z.string().min(1),
  properties: z.record(z.string(), z.unknown()),
});

interface PropertyDef {
  name: string;
  type: string;
}

/**
 * Validate and coerce AI-returned properties against the stored schema for this database.
 *
 * Returns:
 *   - coerced:  the cleaned properties to save (unknown keys stripped, types coerced)
 *   - dropped:  keys that were in the payload but not in the schema
 *   - missing:  schema fields not supplied (informational)
 *   - valid:    false if no properties survived (caller should reject the save)
 */
function validateAgainstSchema(
  properties: Record<string, unknown>,
  schema: PropertyDef[],
): {
  coerced: Record<string, unknown>;
  dropped: string[];
  missing: string[];
  valid: boolean;
} {
  const schemaMap = new Map(schema.map((p) => [p.name.toLowerCase(), p]));
  const coerced: Record<string, unknown> = {};
  const dropped: string[] = [];

  for (const [key, value] of Object.entries(properties)) {
    const def = schemaMap.get(key.toLowerCase());
    if (!def) {
      // Key not in schema — check if it's a case-mismatch
      const caseFix = schema.find((p) => p.name.toLowerCase() === key.toLowerCase());
      if (caseFix) {
        // Accept under the correct casing
        coerced[caseFix.name] = coerceValue(value, caseFix.type);
      } else {
        dropped.push(key);
      }
      continue;
    }
    coerced[def.name] = coerceValue(value, def.type);
  }

  // Fields present in schema but not in the payload
  const missing = schema
    .filter((p) => !(p.name in coerced))
    .map((p) => p.name);

  return {
    coerced,
    dropped,
    missing,
    valid: Object.keys(coerced).length > 0,
  };
}

function coerceValue(value: unknown, type: string): unknown {
  if (value === null || value === undefined || value === "") return value;

  switch (type) {
    case "number": {
      if (typeof value === "number") return value;
      const n = Number(String(value).replace(/[^0-9.-]/g, ""));
      return isNaN(n) ? value : n; // fall back to raw value if unparseable
    }
    case "checkbox":
      if (typeof value === "boolean") return value;
      if (typeof value === "string") return value.toLowerCase() === "true" || value === "1";
      return Boolean(value);
    case "select":
    case "title":
    case "rich_text":
    case "url":
    case "email":
    case "phone_number":
    default:
      return typeof value === "string" ? value : String(value);
  }
}

/**
 * POST /api/members/workspace-save
 *
 * Saves a result item to an in-app database row.
 * Validates and coerces properties against the database's stored schema.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const { databaseId, properties } = parsed.data;

  // Verify the database exists
  const appDb = await getAppDatabase(databaseId).catch(() => undefined);
  if (!appDb) {
    return NextResponse.json({ error: "Database not found" }, { status: 404 });
  }

  // Verify ownership
  const workspace = await getAppWorkspaceForDatabase(databaseId).catch(() => undefined);
  if (!workspace || workspace.userId !== session.user.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Schema validation ────────────────────────────────────────────────────────
  const schema = (appDb.propertiesSchema ?? []) as PropertyDef[];

  let finalProperties = properties;
  let warnings: string[] = [];

  if (schema.length > 0) {
    const { coerced, dropped, valid } = validateAgainstSchema(properties, schema);

    if (!valid) {
      const knownFields = schema.map((p) => `"${p.name}" (${p.type})`).join(", ");
      const receivedFields = Object.keys(properties).join(", ");
      return NextResponse.json(
        {
          error: "schema_mismatch",
          message: `None of the fields returned by the AI match this database's schema. Make sure you have the right database selected.`,
          details: {
            expected: knownFields,
            received: receivedFields,
          },
        },
        { status: 422 },
      );
    }

    if (dropped.length > 0) {
      warnings = [`Dropped unknown fields: ${dropped.join(", ")}`];
      console.warn(`[workspace-save] Dropped unknown fields for db ${databaseId}:`, dropped);
    }

    finalProperties = coerced;
  }

  try {
    await createAppRow({
      id: randomUUID(),
      databaseId,
      properties: finalProperties,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save row";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...(warnings.length > 0 ? { warnings } : {}) });
}
