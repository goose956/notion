/**
 * queries.ts — typed database query helpers for niche packs and deploys.
 *
 * All queries go through Drizzle ORM — no raw SQL.
 * Import { db } is the lazy singleton from client.ts.
 */

import { eq, desc } from "drizzle-orm";
import { db } from "./client.js";
import {
  nichePacks,
  deploys,
  type NichePackRow,
  type NewNichePackRow,
  type DeployRow,
  type NewDeployRow,
} from "./schema.js";
import type { NichePack } from "@niche-factory/schema";

// ─── NichePack queries ──────────────────────────────────────────────────────

export async function listNichePacks(): Promise<NichePackRow[]> {
  return db.select().from(nichePacks).orderBy(desc(nichePacks.updatedAt));
}

export async function getNichePack(id: string): Promise<NichePackRow | undefined> {
  const rows = await db
    .select()
    .from(nichePacks)
    .where(eq(nichePacks.id, id))
    .limit(1);
  return rows[0];
}

/**
 * Upsert a niche pack. On conflict (same id), increments version and
 * updates schemaSnapshot + updatedAt.
 */
export async function upsertNichePack(pack: NichePack): Promise<NichePackRow> {
  const now = new Date();
  const row: NewNichePackRow = {
    id: pack.id,
    name: pack.name,
    description: pack.description,
    version: 1,
    schemaSnapshot: pack as unknown as Record<string, unknown>,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db
    .insert(nichePacks)
    .values(row)
    .onConflictDoUpdate({
      target: nichePacks.id,
      set: {
        name: row.name,
        description: row.description,
        schemaSnapshot: row.schemaSnapshot,
        updatedAt: now,
      },
    })
    .returning();

  const updated = result[0];
  if (updated === undefined) {
    throw new Error(`upsertNichePack: no row returned for id '${pack.id}'`);
  }
  return updated;
}

export async function deleteNichePack(id: string): Promise<void> {
  await db.delete(nichePacks).where(eq(nichePacks.id, id));
}

// ─── Deploy queries ─────────────────────────────────────────────────────────

export async function createDeploy(
  row: Omit<NewDeployRow, "createdAt">,
): Promise<DeployRow> {
  const result = await db
    .insert(deploys)
    .values({ ...row, createdAt: new Date() })
    .returning();
  const created = result[0];
  if (created === undefined) {
    throw new Error("createDeploy: no row returned");
  }
  return created;
}

export async function updateDeployStatus(
  id: string,
  update: {
    status: DeployRow["status"];
    durationMs?: number;
    errorMessage?: string;
  },
): Promise<void> {
  await db
    .update(deploys)
    .set({
      status: update.status,
      durationMs: update.durationMs,
      errorMessage: update.errorMessage,
      completedAt: new Date(),
    })
    .where(eq(deploys.id, id));
}

export async function listDeploysByNiche(nichePackId: string): Promise<DeployRow[]> {
  return db
    .select()
    .from(deploys)
    .where(eq(deploys.nichePackId, nichePackId))
    .orderBy(desc(deploys.createdAt));
}
