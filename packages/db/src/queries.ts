/**
 * queries.ts — typed database query helpers for niche packs and deploys.
 *
 * All queries go through Drizzle ORM — no raw SQL.
 * Import { db } is the lazy singleton from client.ts.
 */

import { eq, desc, and, ilike, or, sql, lte } from "drizzle-orm";
import { db } from "./client.js";
import {
  nichePacks,
  deploys,
  userCriteria,
  templates,
  customers,
  purchases,
  appSettings,
  agentDefinitions,
  agentRuns,
  agentSchedules,
  customTools,
  type NichePackRow,
  type NewNichePackRow,
  type DeployRow,
  type NewDeployRow,
  type UserCriteriaRow,
  type TemplateRow,
  type CustomerRow,
  type PurchaseRow,
  type AppSettingRow,
  type AgentDefinitionRow,
  type NewAgentDefinitionRow,
  type AgentRunRow,
  type NewAgentRunRow,
  type AgentScheduleRow,
  type CustomToolRow,
  type NewCustomToolRow,
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
    databaseIdMap?: Record<string, string>;
  },
): Promise<void> {
  await db
    .update(deploys)
    .set({
      status: update.status,
      durationMs: update.durationMs ?? null,
      errorMessage: update.errorMessage ?? null,
      ...(update.databaseIdMap !== undefined ? { databaseIdMap: update.databaseIdMap } : {}),
      completedAt: new Date(),
    })
    .where(eq(deploys.id, id));
}

export async function getLatestDeployByNiche(
  nichePackId: string,
): Promise<DeployRow | undefined> {
  const rows = await db
    .select()
    .from(deploys)
    .where(and(eq(deploys.nichePackId, nichePackId), eq(deploys.status, "success")))
    .orderBy(desc(deploys.createdAt))
    .limit(1);
  return rows[0];
}

export async function listDeploysByNiche(nichePackId: string): Promise<DeployRow[]> {
  return db
    .select()
    .from(deploys)
    .where(eq(deploys.nichePackId, nichePackId))
    .orderBy(desc(deploys.createdAt));
}

// ─── UserCriteria queries ───────────────────────────────────────────────────

export async function getUserCriteria(
  notionUserId: string,
  nichePackId: string,
): Promise<UserCriteriaRow | undefined> {
  const rows = await db
    .select()
    .from(userCriteria)
    .where(
      and(
        eq(userCriteria.notionUserId, notionUserId),
        eq(userCriteria.nichePackId, nichePackId),
      ),
    )
    .limit(1);
  return rows[0];
}

export async function upsertUserCriteria(
  notionUserId: string,
  nichePackId: string,
  criteria: Record<string, unknown>,
): Promise<UserCriteriaRow> {
  const { randomUUID } = await import("node:crypto");
  const now = new Date();
  const result = await db
    .insert(userCriteria)
    .values({
      id: randomUUID(),
      notionUserId,
      nichePackId,
      criteria,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userCriteria.notionUserId, userCriteria.nichePackId],
      set: { criteria, updatedAt: now },
    })
    .returning();
  const row = result[0];
  if (row === undefined) throw new Error("upsertUserCriteria: no row returned");
  return row;
}

// ─── Template queries ───────────────────────────────────────────────────────

export async function listTemplates(opts?: {
  publishedOnly?: boolean;
  search?: string;
  category?: string;
}): Promise<TemplateRow[]> {
  const conditions = [];
  if (opts?.publishedOnly) conditions.push(eq(templates.published, true));
  if (opts?.category) conditions.push(eq(templates.category, opts.category));
  if (opts?.search) {
    const q = `%${opts.search}%`;
    conditions.push(
      or(ilike(templates.title, q), ilike(templates.tagline, q), ilike(templates.problemStatement, q)),
    );
  }
  return db
    .select()
    .from(templates)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(templates.updatedAt));
}

export async function getTemplateById(id: string): Promise<TemplateRow | undefined> {
  const rows = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  return rows[0];
}

export async function getTemplateBySlug(slug: string): Promise<TemplateRow | undefined> {
  const rows = await db.select().from(templates).where(eq(templates.slug, slug)).limit(1);
  return rows[0];
}

export async function upsertTemplate(
  data: Omit<TemplateRow, "createdAt" | "updatedAt" | "viewCount" | "clickCount">,
): Promise<TemplateRow> {
  const now = new Date();
  const result = await db
    .insert(templates)
    .values({ ...data, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: templates.id,
      set: {
        slug: data.slug,
        title: data.title,
        tagline: data.tagline,
        problemStatement: data.problemStatement,
        body: data.body,
        faq: data.faq,
        category: data.category,
        tags: data.tags,
        stripePaymentLink: data.stripePaymentLink,
        stripePriceId: data.stripePriceId,
        published: data.published,
        updatedAt: now,
      },
    })
    .returning();
  const row = result[0];
  if (row === undefined) throw new Error("upsertTemplate: no row returned");
  return row;
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.delete(templates).where(eq(templates.id, id));
}

export async function incrementTemplateView(slug: string): Promise<void> {
  await db
    .update(templates)
    .set({ viewCount: sql`${templates.viewCount} + 1` })
    .where(eq(templates.slug, slug));
}

export async function incrementTemplateClick(slug: string): Promise<void> {
  await db
    .update(templates)
    .set({ clickCount: sql`${templates.clickCount} + 1` })
    .where(eq(templates.slug, slug));
}

// ─── Customer queries ────────────────────────────────────────────────────────

/**
 * Find a customer by email, or create one if not found.
 * Optionally links a Stripe customer ID on creation.
 */
export async function findOrCreateCustomer(
  email: string,
  stripeCustomerId?: string,
): Promise<CustomerRow> {
  const { randomUUID } = await import("node:crypto");
  const now = new Date();
  const result = await db
    .insert(customers)
    .values({
      id: randomUUID(),
      email,
      stripeCustomerId: stripeCustomerId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: customers.email,
      set: {
        stripeCustomerId: stripeCustomerId ?? null,
        updatedAt: now,
      },
    })
    .returning();
  const row = result[0];
  if (row === undefined) throw new Error("findOrCreateCustomer: no row returned");
  return row;
}

/** Link a Notion user ID to an existing customer record (by email). */
export async function linkNotionUserToCustomer(
  email: string,
  notionUserId: string,
): Promise<void> {
  await db
    .update(customers)
    .set({ notionUserId, updatedAt: new Date() })
    .where(eq(customers.email, email));
}

export async function listCustomers(): Promise<CustomerRow[]> {
  return db.select().from(customers).orderBy(desc(customers.createdAt));
}

// ─── Purchase queries ────────────────────────────────────────────────────────

export async function createPurchase(data: {
  customerId: string;
  templateId: string;
  stripeSessionId: string;
  amountPaid: number;
  currency: string;
}): Promise<PurchaseRow> {
  const { randomUUID } = await import("node:crypto");
  const result = await db
    .insert(purchases)
    .values({ id: randomUUID(), ...data, purchasedAt: new Date() })
    .onConflictDoNothing()
    .returning();
  // If the session was already recorded (duplicate webhook), fetch the existing row
  if (result.length === 0) {
    const existing = await db
      .select()
      .from(purchases)
      .where(eq(purchases.stripeSessionId, data.stripeSessionId))
      .limit(1);
    if (existing[0] === undefined) throw new Error("createPurchase: no row returned");
    return existing[0];
  }
  const row = result[0];
  if (row === undefined) throw new Error("createPurchase: no row returned");
  return row;
}

/** Return all templates purchased by a given customer email. */
export async function getPurchasedTemplates(email: string): Promise<TemplateRow[]> {
  const rows = await db
    .select({ template: templates })
    .from(purchases)
    .innerJoin(customers, eq(purchases.customerId, customers.id))
    .innerJoin(templates, eq(purchases.templateId, templates.id))
    .where(eq(customers.email, email))
    .orderBy(desc(purchases.purchasedAt));
  return rows.map((r) => r.template);
}

/** Check if a customer (by email) owns a specific template. */
export async function customerOwnsTemplate(
  email: string,
  templateId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: purchases.id })
    .from(purchases)
    .innerJoin(customers, eq(purchases.customerId, customers.id))
    .where(and(eq(customers.email, email), eq(purchases.templateId, templateId)))
    .limit(1);
  return rows.length > 0;
}

/** List all purchases with customer + template info (for admin). */
export async function listPurchasesWithDetails(): Promise<
  Array<PurchaseRow & { customerEmail: string; templateTitle: string; templateSlug: string }>
> {
  const rows = await db
    .select({
      id: purchases.id,
      customerId: purchases.customerId,
      templateId: purchases.templateId,
      stripeSessionId: purchases.stripeSessionId,
      amountPaid: purchases.amountPaid,
      currency: purchases.currency,
      purchasedAt: purchases.purchasedAt,
      customerEmail: customers.email,
      templateTitle: templates.title,
      templateSlug: templates.slug,
    })
    .from(purchases)
    .innerJoin(customers, eq(purchases.customerId, customers.id))
    .innerJoin(templates, eq(purchases.templateId, templates.id))
    .orderBy(desc(purchases.purchasedAt));
  return rows;
}

// ─── App settings queries ───────────────────────────────────────────────────

export async function getSetting(key: string): Promise<AppSettingRow | undefined> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return rows[0];
}

export async function getSettingValue(key: string): Promise<string | undefined> {
  const row = await getSetting(key);
  return row?.value;
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const rows = await db.select().from(appSettings);
  const keySet = new Set(keys);
  return rows.reduce<Record<string, string>>((acc, row) => {
    if (keySet.has(row.key)) acc[row.key] = row.value;
    return acc;
  }, {});
}

export async function upsertSetting(key: string, value: string): Promise<AppSettingRow> {
  const now = new Date();
  const result = await db
    .insert(appSettings)
    .values({ key, value, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: now },
    })
    .returning();
  const row = result[0];
  if (row === undefined) throw new Error("upsertSetting: no row returned");
  return row;
}

export async function upsertSettings(values: Record<string, string>): Promise<void> {
  const entries = Object.entries(values).filter(([, v]) => v.trim().length > 0);
  for (const [key, value] of entries) {
    await upsertSetting(key, value);
  }
}

// ─── Agent definition queries ────────────────────────────────────────────────

export async function listAgentDefinitions(): Promise<AgentDefinitionRow[]> {
  return db.select().from(agentDefinitions).orderBy(desc(agentDefinitions.updatedAt));
}

export async function getAgentDefinition(id: string): Promise<AgentDefinitionRow | undefined> {
  const rows = await db.select().from(agentDefinitions).where(eq(agentDefinitions.id, id)).limit(1);
  return rows[0];
}

export async function upsertAgentDefinition(row: NewAgentDefinitionRow): Promise<AgentDefinitionRow> {
  const now = new Date();
  const result = await db
    .insert(agentDefinitions)
    .values({ ...row, updatedAt: now })
    .onConflictDoUpdate({
      target: agentDefinitions.id,
      set: {
        name: row.name,
        description: row.description ?? "",
        systemPrompt: row.systemPrompt,
        model: row.model ?? "claude-sonnet-4-5",
        toolList: row.toolList ?? [],
        defaultConfig: row.defaultConfig ?? {},
        nicheId: row.nicheId ?? null,
        updatedAt: now,
      },
    })
    .returning();
  const inserted = result[0];
  if (inserted === undefined) throw new Error("upsertAgentDefinition: no row returned");
  return inserted;
}

// ─── Agent run queries ───────────────────────────────────────────────────────

export async function createAgentRun(row: NewAgentRunRow): Promise<AgentRunRow> {
  const result = await db.insert(agentRuns).values(row).returning();
  const inserted = result[0];
  if (inserted === undefined) throw new Error("createAgentRun: no row returned");
  return inserted;
}

export async function updateAgentRun(
  id: string,
  update: Partial<Pick<AgentRunRow,
    "status" | "completedAt" | "output" | "notionArtifacts" | "tokenUsage" | "costUsd" | "errorMessage" | "durationMs"
  >>,
): Promise<void> {
  await db.update(agentRuns).set(update).where(eq(agentRuns.id, id));
}

export async function getAgentRun(id: string): Promise<AgentRunRow | undefined> {
  const rows = await db.select().from(agentRuns).where(eq(agentRuns.id, id)).limit(1);
  return rows[0];
}

export async function listAgentRunsByCustomer(customerId: string, limit = 50): Promise<AgentRunRow[]> {
  return db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.customerId, customerId))
    .orderBy(desc(agentRuns.startedAt))
    .limit(limit);
}

export async function listAgentRunsByDef(agentDefId: string, limit = 50): Promise<AgentRunRow[]> {
  return db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.agentDefId, agentDefId))
    .orderBy(desc(agentRuns.startedAt))
    .limit(limit);
}

// ─── Agent schedule queries ──────────────────────────────────────────────────

export async function listDueSchedules(): Promise<AgentScheduleRow[]> {
  return db
    .select()
    .from(agentSchedules)
    .where(and(eq(agentSchedules.active, true), lte(agentSchedules.nextRunAt, new Date())));
}

export async function updateScheduleAfterRun(
  id: string,
  nextRunAt: Date,
): Promise<void> {
  await db
    .update(agentSchedules)
    .set({ lastRunAt: new Date(), nextRunAt, updatedAt: new Date() })
    .where(eq(agentSchedules.id, id));
}

// ─── Custom tool queries ──────────────────────────────────────────────────────

export async function listCustomTools(enabledOnly = false): Promise<CustomToolRow[]> {
  if (enabledOnly) {
    return db
      .select()
      .from(customTools)
      .where(eq(customTools.enabled, true))
      .orderBy(customTools.name);
  }
  return db.select().from(customTools).orderBy(customTools.name);
}

export async function getCustomTool(id: string): Promise<CustomToolRow | undefined> {
  const rows = await db
    .select()
    .from(customTools)
    .where(eq(customTools.id, id))
    .limit(1);
  return rows[0];
}

export async function upsertCustomTool(row: NewCustomToolRow): Promise<CustomToolRow> {
  const [result] = await db
    .insert(customTools)
    .values({ ...row, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: customTools.id,
      set: {
        name: row.name,
        description: row.description,
        ...(row.toolType !== undefined ? { toolType: row.toolType } : {}),
        config: row.config,
        inputSchema: row.inputSchema,
        ...(row.enabled !== undefined ? { enabled: row.enabled } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();
  return result!;
}

export async function deleteCustomTool(id: string): Promise<void> {
  await db.delete(customTools).where(eq(customTools.id, id));
}

/** @deprecated Use listCustomTools instead */
export const listCustomSkills = listCustomTools;
/** @deprecated Use getCustomTool instead */
export const getCustomSkill = getCustomTool;
/** @deprecated Use upsertCustomTool instead */
export const upsertCustomSkill = upsertCustomTool;
/** @deprecated Use deleteCustomTool instead */
export const deleteCustomSkill = deleteCustomTool;

export async function upsertAgentSchedule(row: AgentScheduleRow): Promise<AgentScheduleRow> {
  const now = new Date();
  const result = await db
    .insert(agentSchedules)
    .values({ ...row, updatedAt: now })
    .onConflictDoUpdate({
      target: agentSchedules.id,
      set: { ...row, updatedAt: now },
    })
    .returning();
  const inserted = result[0];
  if (inserted === undefined) throw new Error("upsertAgentSchedule: no row returned");
  return inserted;
}

