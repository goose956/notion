/**
 * queries.ts — typed database query helpers for niche packs and deploys.
 *
 * All queries go through Drizzle ORM — no raw SQL.
 * Import { db } is the lazy singleton from client.ts.
 */

import { eq, desc, and, ilike, or, sql, lte, isNull, gt } from "drizzle-orm";
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
  pageViews,
  appWorkspaces,
  appDatabases,
  appRows,
  activationLinks,
  funnelEvents,
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
  type PageViewRow,
  type AppWorkspaceRow,
  type NewAppWorkspaceRow,
  type AppDatabaseRow,
  type NewAppDatabaseRow,
  type AppRowRow,
  type NewAppRowRow,
  type ActivationLinkRow,
  type FunnelEventRow,
  supportTickets,
  supportMessages,
  type SupportTicketRow,
  type SupportMessageRow,
  customerWorkflows,
  type CustomerWorkflowRow,
  userConnections,
  type UserConnectionRow,
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
  row: Omit<NewDeployRow, "createdAt"> & { notionUserId?: string | null },
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
  notionUserId?: string,
): Promise<DeployRow | undefined> {
  const conditions = [
    eq(deploys.nichePackId, nichePackId),
    eq(deploys.status, "success"),
    // Match the specific user OR rows where notion_user_id was not recorded (legacy deploys)
    ...(notionUserId ? [or(eq(deploys.notionUserId, notionUserId), isNull(deploys.notionUserId))] : []),
  ];
  const rows = await db
    .select()
    .from(deploys)
    .where(and(...conditions))
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

/**
 * Returns all successful deploys for a given Notion user, joined with their
 * niche pack name — used by the profile page.
 */
export async function listDeploysByUser(notionUserId: string): Promise<
  Array<DeployRow & { nicheName: string }>
> {
  const rows = await db
    .select({
      id: deploys.id,
      nichePackId: deploys.nichePackId,
      notionUserId: deploys.notionUserId,
      notionParentPageId: deploys.notionParentPageId,
      databaseIdMap: deploys.databaseIdMap,
      status: deploys.status,
      errorMessage: deploys.errorMessage,
      durationMs: deploys.durationMs,
      createdAt: deploys.createdAt,
      completedAt: deploys.completedAt,
      nicheName: nichePacks.name,
    })
    .from(deploys)
    .innerJoin(nichePacks, eq(deploys.nichePackId, nichePacks.id))
    .where(and(eq(deploys.notionUserId, notionUserId), eq(deploys.status, "success")))
    .orderBy(desc(deploys.createdAt));
  return rows;
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
  const criteriaJson = sql`${JSON.stringify(criteria)}::jsonb`;
  const result = await db
    .insert(userCriteria)
    .values({
      id: randomUUID(),
      notionUserId,
      nichePackId,
      criteria: criteriaJson,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userCriteria.notionUserId, userCriteria.nichePackId],
      set: { criteria: criteriaJson, updatedAt: now },
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
        nichePackId: data.nichePackId,
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

/** Get the current credit balance for a customer by email. Returns 0 if not found. */
export async function getCustomerCredits(email: string): Promise<number> {
  const rows = await db
    .select({ credits: customers.credits })
    .from(customers)
    .where(eq(customers.email, email))
    .limit(1);
  return rows[0]?.credits ?? 0;
}

/**
 * Deduct `amount` credits from a customer, floored at 0.
 * Returns the new balance. Creates the customer row with 25 credits if missing.
 */
export async function deductCredits(email: string, amount: number): Promise<number> {
  const { randomUUID } = await import("node:crypto");
  const now = new Date();
  // Upsert so we never fail on a missing row (e.g. user signed in but never hit the upsert path)
  await db
    .insert(customers)
    .values({ id: randomUUID(), email, credits: Math.max(0, 25 - amount), createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: customers.email,
      set: {
        credits: sql`GREATEST(${customers.credits} - ${amount}, 0)`,
        updatedAt: now,
      },
    });
  return getCustomerCredits(email);
}

/** Set a customer's credit balance to an exact value (admin use). */
export async function setCustomerCredits(email: string, credits: number): Promise<void> {
  const { randomUUID } = await import("node:crypto");
  const now = new Date();
  await db
    .insert(customers)
    .values({ id: randomUUID(), email, credits, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: customers.email,
      set: { credits, updatedAt: now },
    });
}

/** Delete a customer by email, including dependent purchases. */
export async function deleteCustomerByEmail(email: string): Promise<boolean> {
  const rows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.email, email))
    .limit(1);

  const customerId = rows[0]?.id;
  if (!customerId) return false;

  // Delete workspace data: rows → databases → workspaces (keyed by email)
  const workspaces = await db
    .select({ id: appWorkspaces.id })
    .from(appWorkspaces)
    .where(eq(appWorkspaces.userId, email));

  for (const ws of workspaces) {
    const dbs = await db
      .select({ id: appDatabases.id })
      .from(appDatabases)
      .where(eq(appDatabases.workspaceId, ws.id));

    for (const db_ of dbs) {
      await db.delete(appRows).where(eq(appRows.databaseId, db_.id));
    }
    await db.delete(appDatabases).where(eq(appDatabases.workspaceId, ws.id));
  }
  await db.delete(appWorkspaces).where(eq(appWorkspaces.userId, email));

  await db.delete(purchases).where(eq(purchases.customerId, customerId));
  await db.delete(customers).where(eq(customers.id, customerId));
  return true;
}

/** Add credits to a customer balance and return the new total. */
export async function addCustomerCredits(email: string, amount: number): Promise<number> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return getCustomerCredits(email);
  }

  const { randomUUID } = await import("node:crypto");
  const now = new Date();
  await db
    .insert(customers)
    .values({ id: randomUUID(), email, credits: 25 + amount, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: customers.email,
      set: {
        credits: sql`${customers.credits} + ${amount}`,
        updatedAt: now,
      },
    });

  return getCustomerCredits(email);
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

export async function deleteSetting(key: string): Promise<void> {
  await db.delete(appSettings).where(eq(appSettings.key, key));
}

export async function listSettingsByPrefix(prefix: string): Promise<AppSettingRow[]> {
  const { like } = await import("drizzle-orm");
  return db.select().from(appSettings).where(like(appSettings.key, `${prefix}%`));
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

// ─── Analytics queries ───────────────────────────────────────────────────────

/** Known LLM crawler user-agent substrings (case-insensitive). */
const LLM_BOT_PATTERNS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "YouBot",
  "Cohere-ai",
  "Google-Extended",
  "DuckAssistBot",
  "Applebot-Extended",
  "Bytespider",
  "PetalBot",
] as const;

/** Classify a User-Agent string into "human" | "llm" | "bot". */
export function classifyVisitor(ua: string | null | undefined): "human" | "llm" | "bot" {
  if (!ua) return "human";
  const lower = ua.toLowerCase();
  if (LLM_BOT_PATTERNS.some((p) => lower.includes(p.toLowerCase()))) return "llm";
  // Generic bot heuristics
  if (
    lower.includes("bot") ||
    lower.includes("crawler") ||
    lower.includes("spider") ||
    lower.includes("slurp") ||
    lower.includes("facebookexternalhit")
  ) {
    return "bot";
  }
  return "human";
}

/** Record a page view. Fire-and-forget safe — never throws. */
export async function recordPageView(data: {
  path: string;
  referrer?: string | null;
  userAgent?: string | null;
  country?: string | null;
}): Promise<void> {
  try {
    const { randomUUID } = await import("node:crypto");
    const visitorType = classifyVisitor(data.userAgent);
    await db.insert(pageViews).values({
      id: randomUUID(),
      path: data.path,
      referrer: data.referrer ?? null,
      userAgent: data.userAgent ?? null,
      visitorType,
      country: data.country ?? null,
    });
  } catch {
    // analytics must never break the main request
  }
}

/** Total views grouped by day for the last N days. */
export async function getDailyViews(
  days = 30,
): Promise<{ date: string; human: number; llm: number; bot: number }[]> {
  const rows = await db.execute(sql`
    SELECT
      DATE_TRUNC('day', created_at AT TIME ZONE 'UTC') AS day,
      visitor_type,
      COUNT(*)::int AS cnt
    FROM page_views
    WHERE created_at >= NOW() - (${days} || ' days')::interval
    GROUP BY 1, 2
    ORDER BY 1
  `);
  const map = new Map<string, { human: number; llm: number; bot: number }>();
  for (const r of rows as unknown as Array<{ day: Date; visitor_type: string; cnt: number }>) {
    const key = r.day.toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, { human: 0, llm: 0, bot: 0 });
    const entry = map.get(key)!;
    const t = r.visitor_type as "human" | "llm" | "bot";
    if (t === "human" || t === "llm" || t === "bot") entry[t] += Number(r.cnt);
  }
  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
}

/** Top N paths by total views. */
export async function getTopPages(
  limit = 20,
  days = 30,
): Promise<{ path: string; total: number; human: number; llm: number }[]> {
  const rows = await db.execute(sql`
    SELECT
      path,
      COUNT(*)::int AS total,
      SUM(CASE WHEN visitor_type = 'human' THEN 1 ELSE 0 END)::int AS human,
      SUM(CASE WHEN visitor_type = 'llm' THEN 1 ELSE 0 END)::int AS llm
    FROM page_views
    WHERE created_at >= NOW() - (${days} || ' days')::interval
    GROUP BY path
    ORDER BY total DESC
    LIMIT ${limit}
  `);
  return rows as unknown as Array<{ path: string; total: number; human: number; llm: number }>;
}

/** Summary totals for dashboard cards. */
export async function getAnalyticsSummary(): Promise<{
  totalViews: number;
  totalLlm: number;
  totalHuman: number;
  todayViews: number;
  todayLlm: number;
}> {
  const rows = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total_views,
      SUM(CASE WHEN visitor_type = 'llm' THEN 1 ELSE 0 END)::int AS total_llm,
      SUM(CASE WHEN visitor_type = 'human' THEN 1 ELSE 0 END)::int AS total_human,
      SUM(CASE WHEN created_at >= DATE_TRUNC('day', NOW()) THEN 1 ELSE 0 END)::int AS today_views,
      SUM(CASE WHEN visitor_type = 'llm' AND created_at >= DATE_TRUNC('day', NOW()) THEN 1 ELSE 0 END)::int AS today_llm
    FROM page_views
  `);
  const r = (rows as unknown as Array<{ total_views: number; total_llm: number; total_human: number; today_views: number; today_llm: number }>)[0];
  return {
    totalViews: Number(r?.total_views ?? 0),
    totalLlm: Number(r?.total_llm ?? 0),
    totalHuman: Number(r?.total_human ?? 0),
    todayViews: Number(r?.today_views ?? 0),
    todayLlm: Number(r?.today_llm ?? 0),
  };
}

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

// ─── In-App Workspace queries ─────────────────────────────────────────────────

export async function createAppWorkspace(
  row: NewAppWorkspaceRow,
): Promise<AppWorkspaceRow> {
  const result = await db.insert(appWorkspaces).values(row).returning();
  const created = result[0];
  if (created === undefined) throw new Error("createAppWorkspace: no row returned");
  return created;
}

export async function updateAppWorkspaceStatus(
  id: string,
  update: {
    status: AppWorkspaceRow["status"];
    durationMs?: number;
    errorMessage?: string;
    databaseIdMap?: Record<string, string>;
  },
): Promise<void> {
  await db
    .update(appWorkspaces)
    .set({
      status: update.status,
      durationMs: update.durationMs ?? null,
      errorMessage: update.errorMessage ?? null,
      ...(update.databaseIdMap !== undefined ? { databaseIdMap: update.databaseIdMap } : {}),
      completedAt: new Date(),
    })
    .where(eq(appWorkspaces.id, id));
}

export async function getLatestAppWorkspaceByNiche(
  userId: string,
  nichePackId: string,
): Promise<AppWorkspaceRow | undefined> {
  const rows = await db
    .select()
    .from(appWorkspaces)
    .where(
      and(
        eq(appWorkspaces.userId, userId),
        eq(appWorkspaces.nichePackId, nichePackId),
        eq(appWorkspaces.status, "success"),
      ),
    )
    .orderBy(desc(appWorkspaces.createdAt))
    .limit(1);
  return rows[0];
}

export async function createAppDatabase(
  row: NewAppDatabaseRow,
): Promise<AppDatabaseRow> {
  const result = await db.insert(appDatabases).values(row).returning();
  const created = result[0];
  if (created === undefined) throw new Error("createAppDatabase: no row returned");
  return created;
}

export async function updateAppDatabaseSchema(
  id: string,
  update: {
    propertiesSchema: Record<string, unknown>[];
    schemaVersion?: number;
    name?: string;
  },
): Promise<void> {
  await db
    .update(appDatabases)
    .set({
      propertiesSchema: update.propertiesSchema,
      ...(typeof update.schemaVersion === "number" ? { schemaVersion: update.schemaVersion } : {}),
      ...(typeof update.name === "string" ? { name: update.name } : {}),
    })
    .where(eq(appDatabases.id, id));
}

export async function getAppDatabase(id: string): Promise<AppDatabaseRow | undefined> {
  const rows = await db
    .select()
    .from(appDatabases)
    .where(eq(appDatabases.id, id))
    .limit(1);
  return rows[0];
}

export async function createAppRow(row: NewAppRowRow): Promise<AppRowRow> {
  // Explicitly cast properties to jsonb — the postgres.js driver sends plain
  // objects as text strings, which PostgreSQL stores as a jsonb string value
  // (double-serialised) rather than a jsonb object.
  const result = await db.insert(appRows).values({
    ...row,
    properties: sql`${JSON.stringify(row.properties)}::jsonb`,
  }).returning();
  const created = result[0];
  if (created === undefined) throw new Error("createAppRow: no row returned");
  return created;
}

/** Return the workspace row for a given app database (for ownership checks). */
export async function getAppWorkspaceForDatabase(
  databaseId: string,
): Promise<AppWorkspaceRow | undefined> {
  const rows = await db
    .select({ workspace: appWorkspaces })
    .from(appDatabases)
    .innerJoin(appWorkspaces, eq(appDatabases.workspaceId, appWorkspaces.id))
    .where(eq(appDatabases.id, databaseId))
    .limit(1);
  return rows[0]?.workspace;
}

export async function listAppWorkspacesByUser(
  userId: string,
): Promise<AppWorkspaceRow[]> {
  return db
    .select()
    .from(appWorkspaces)
    .where(
      and(
        eq(appWorkspaces.userId, userId),
        eq(appWorkspaces.status, "success"),
      ),
    )
    .orderBy(desc(appWorkspaces.createdAt));
}

export async function listAppDatabasesByWorkspace(
  workspaceId: string,
): Promise<AppDatabaseRow[]> {
  return db
    .select()
    .from(appDatabases)
    .where(eq(appDatabases.workspaceId, workspaceId))
    .orderBy(appDatabases.createdAt);
}

export async function listAppRowsByDatabase(
  databaseId: string,
  opts?: { limit?: number },
): Promise<AppRowRow[]> {
  const limit = Math.max(1, Math.min(opts?.limit ?? 50, 200));
  return db
    .select()
    .from(appRows)
    .where(eq(appRows.databaseId, databaseId))
    .orderBy(appRows.createdAt)
    .limit(limit);
}

export async function updateAppRow(
  id: string,
  partialProperties: Record<string, string | number | boolean | null>,
): Promise<void> {
  const partial = JSON.stringify(partialProperties);
  await db
    .update(appRows)
    .set({
      // Use CASE to guard against non-object jsonb values (e.g. legacy string rows).
      // If properties is an object, merge; otherwise replace with the partial update.
      properties: sql`CASE
        WHEN jsonb_typeof(${appRows.properties}) = 'object'
        THEN ${appRows.properties} || ${partial}::jsonb
        ELSE ${partial}::jsonb
      END`,
      updatedAt: new Date(),
    })
    .where(eq(appRows.id, id));
}

export async function deleteAppRow(id: string): Promise<void> {
  await db.delete(appRows).where(eq(appRows.id, id));
}

// ─── Activation Link queries ─────────────────────────────────────────────────

/** Create a new activation link and return the generated token. */
export async function createActivationLink(
  nichePackId: string,
  credits: number,
  label: string,
  maxUses?: number,
  expiresAt?: Date,
  source?: string,
  medium?: string,
  campaign?: string,
): Promise<ActivationLinkRow> {
  const { randomUUID } = await import("node:crypto");
  const token = randomUUID();
  const result = await db
    .insert(activationLinks)
    .values({
      token,
      nichePackId,
      credits,
      label,
      createdAt: new Date(),
      ...(maxUses != null ? { maxUses } : {}),
      ...(expiresAt != null ? { expiresAt } : {}),
      ...(source != null ? { source } : {}),
      ...(medium != null ? { medium } : {}),
      ...(campaign != null ? { campaign } : {}),
    })
    .returning();
  const row = result[0];
  if (!row) throw new Error("createActivationLink: no row returned");
  return row;
}

/** Fetch a single activation link by token. Returns undefined if not found. */
export async function getActivationLink(token: string): Promise<ActivationLinkRow | undefined> {
  const rows = await db
    .select()
    .from(activationLinks)
    .where(eq(activationLinks.token, token))
    .limit(1);
  return rows[0];
}

/** Return all activation links ordered newest first. */
export async function listActivationLinks(): Promise<ActivationLinkRow[]> {
  return db.select().from(activationLinks).orderBy(desc(activationLinks.createdAt));
}

/**
 * Redeem an activation link for the given user email.
 *
 * Supports multi-use links. Validity rules (all checked atomically in the UPDATE WHERE):
 *   - not revoked
 *   - not expired  (expires_at IS NULL OR expires_at > NOW())
 *   - uses not exhausted  (max_uses IS NULL OR uses < max_uses)
 *
 * Sets the user's credits to MAX(current, link.credits) so upgrades never lower a balance.
 * Throws a descriptive error if the token is invalid or any rule fails.
 */
export async function redeemActivationLink(
  token: string,
  email: string,
): Promise<ActivationLinkRow> {
  const link = await getActivationLink(token);
  if (!link) throw new Error("Activation link not found");
  if (link.revoked) throw new Error("Activation link has been revoked");
  if (link.expiresAt && link.expiresAt < new Date()) throw new Error("Activation link has expired");
  if (link.maxUses != null && link.uses >= link.maxUses) throw new Error("Activation link has reached its maximum uses");

  const now = new Date();
  const updated = await db
    .update(activationLinks)
    .set({
      uses: sql`${activationLinks.uses} + 1`,
      usedAt: sql`COALESCE(${activationLinks.usedAt}, ${now.toISOString()})`,
      usedBy: sql`COALESCE(${activationLinks.usedBy}, ${email})`,
    })
    .where(
      and(
        eq(activationLinks.token, token),
        eq(activationLinks.revoked, false),
        or(
          isNull(activationLinks.expiresAt),
          gt(activationLinks.expiresAt, now),
        ),
        or(
          isNull(activationLinks.maxUses),
          sql`${activationLinks.uses} < ${activationLinks.maxUses}`,
        ),
      ),
    )
    .returning();

  if (!updated[0]) throw new Error("Activation link could not be redeemed");

  // Grant credits — use MAX so an existing high balance is never reduced.
  const currentCredits = await getCustomerCredits(email);
  const newCredits = Math.max(currentCredits, link.credits);
  await setCustomerCredits(email, newCredits);

  // Set attribution on customer record (only if not already set — first touch)
  if (link.source) {
    await db
      .update(customers)
      .set({
        sourceToken: sql`COALESCE(${customers.sourceToken}, ${token})`,
        sourceChannel: sql`COALESCE(${customers.sourceChannel}, ${link.source})`,
        updatedAt: now,
      })
      .where(eq(customers.email, email));
  }

  return updated[0];
}

/** Increment the click counter on an activation link. Fire-and-forget safe. */
export async function trackLinkClick(token: string): Promise<void> {
  try {
    await db
      .update(activationLinks)
      .set({ clickCount: sql`${activationLinks.clickCount} + 1` })
      .where(eq(activationLinks.token, token));
  } catch {
    // never break the page load
  }
}

// ─── Support tickets ───────────────────────────────────────────────────────

export type { SupportTicketRow, SupportMessageRow };

/** Create a new ticket with its first message. */
export async function createSupportTicket(
  email: string,
  subject: string,
  firstMessage: string,
): Promise<SupportTicketRow> {
  const { randomUUID } = await import("crypto");
  const ticketId = randomUUID();
  await db.insert(supportTickets).values({
    id: ticketId,
    customerEmail: email,
    subject,
  });
  await db.insert(supportMessages).values({
    id: randomUUID(),
    ticketId,
    senderType: "user",
    message: firstMessage,
  });
  const rows = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  if (!rows[0]) throw new Error("Failed to create support ticket");
  return rows[0];
}

/** Add a message to an existing ticket. */
export async function addSupportMessage(
  ticketId: string,
  senderType: "user" | "admin",
  message: string,
): Promise<void> {
  const { randomUUID } = await import("crypto");
  await db.insert(supportMessages).values({
    id: randomUUID(),
    ticketId,
    senderType,
    message,
  });
  await db
    .update(supportTickets)
    .set({ updatedAt: new Date() })
    .where(eq(supportTickets.id, ticketId));
}

/** Get all tickets (admin). Most recently updated first. */
export async function getSupportTickets(): Promise<SupportTicketRow[]> {
  return db
    .select()
    .from(supportTickets)
    .orderBy(desc(supportTickets.updatedAt));
}

/** Get tickets filtered by status. */
export async function getSupportTicketsByStatus(
  status: "open" | "closed",
): Promise<SupportTicketRow[]> {
  return db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.status, status))
    .orderBy(desc(supportTickets.updatedAt));
}

/** Get a ticket with all its messages. */
export async function getTicketWithMessages(
  ticketId: string,
): Promise<{ ticket: SupportTicketRow; messages: SupportMessageRow[] } | null> {
  const tickets = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  if (!tickets[0]) return null;
  const messages = await db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.ticketId, ticketId))
    .orderBy(supportMessages.createdAt);
  return { ticket: tickets[0], messages };
}

/** Get tickets belonging to a specific user (by email). */
export async function getUserTickets(email: string): Promise<SupportTicketRow[]> {
  return db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.customerEmail, email))
    .orderBy(desc(supportTickets.updatedAt));
}

/** Close or reopen a ticket. */
export async function setTicketStatus(
  ticketId: string,
  status: "open" | "closed",
): Promise<void> {
  await db
    .update(supportTickets)
    .set({ status, updatedAt: new Date() })
    .where(eq(supportTickets.id, ticketId));
}

/** Count open tickets (for admin badge). */
export async function getOpenTicketCount(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(supportTickets)
    .where(eq(supportTickets.status, "open"));
  return rows[0]?.count ?? 0;
}

/**
 * Count tickets where the latest message is from admin and the ticket is open.
 * Used to show a notification dot on the user's Support nav item.
 */
export async function getPendingAdminRepliesCount(email: string): Promise<number> {
  const rows = await db.execute(sql`
    SELECT COUNT(DISTINCT sm.ticket_id)::int AS count
    FROM support_messages sm
    INNER JOIN support_tickets st ON st.id = sm.ticket_id
    WHERE st.customer_email = ${email}
      AND st.status = 'open'
      AND sm.sender_type = 'admin'
      AND sm.created_at = (
        SELECT MAX(sm2.created_at)
        FROM support_messages sm2
        WHERE sm2.ticket_id = sm.ticket_id
      )
  `);
  const row = rows[0] as { count?: number } | undefined;
  return row?.count ?? 0;
}

/** Log a funnel event. Fire-and-forget safe — never throws. */
export async function logFunnelEvent(data: {
  customerId: string;
  event: string;
  properties?: Record<string, unknown>;
  sourceToken?: string | null;
  sourceChannel?: string | null;
}): Promise<void> {
  try {
    const { randomUUID } = await import("node:crypto");
    await db.insert(funnelEvents).values({
      id: randomUUID(),
      customerId: data.customerId,
      event: data.event,
      properties: data.properties ?? {},
      ...(data.sourceToken != null ? { sourceToken: data.sourceToken } : {}),
      ...(data.sourceChannel != null ? { sourceChannel: data.sourceChannel } : {}),
    });
  } catch {
    // analytics must never break the main request
  }
}

export type { FunnelEventRow };

/**
 * Funnel stats by channel for the admin dashboard.
 * Returns one row per channel with click, signup, activation, and workspace counts.
 */
export async function getFunnelStats(days = 30): Promise<
  Array<{
    channel: string;
    clicks: number;
    signups: number;
    activations: number;
    workspacesCreated: number;
    conversionRate: number;
  }>
> {
  const rows = await db.execute(sql`
    SELECT
      COALESCE(source_channel, 'unknown') AS channel,
      SUM(CASE WHEN event = 'activation_link_clicked' THEN 1 ELSE 0 END)::int  AS clicks,
      SUM(CASE WHEN event = 'signup_completed'        THEN 1 ELSE 0 END)::int  AS signups,
      SUM(CASE WHEN event = 'activation_redeemed'     THEN 1 ELSE 0 END)::int  AS activations,
      SUM(CASE WHEN event = 'workspace_created'       THEN 1 ELSE 0 END)::int  AS workspaces_created
    FROM funnel_events
    WHERE created_at >= NOW() - (${days} || ' days')::interval
    GROUP BY 1
    ORDER BY activations DESC, clicks DESC
  `);

  return (rows as unknown as Array<{
    channel: string;
    clicks: number;
    signups: number;
    activations: number;
    workspaces_created: number;
  }>).map((r) => ({
    channel: r.channel,
    clicks: Number(r.clicks),
    signups: Number(r.signups),
    activations: Number(r.activations),
    workspacesCreated: Number(r.workspaces_created),
    conversionRate: r.clicks > 0 ? Math.round((r.activations / r.clicks) * 100) : 0,
  }));
}

/** Funnel totals for summary cards. */
export async function getFunnelTotals(days = 30): Promise<{
  totalClicks: number;
  totalSignups: number;
  totalActivations: number;
  overallConversion: number;
}> {
  const rows = await db.execute(sql`
    SELECT
      SUM(CASE WHEN event = 'activation_link_clicked' THEN 1 ELSE 0 END)::int AS total_clicks,
      SUM(CASE WHEN event = 'signup_completed'        THEN 1 ELSE 0 END)::int AS total_signups,
      SUM(CASE WHEN event = 'activation_redeemed'     THEN 1 ELSE 0 END)::int AS total_activations
    FROM funnel_events
    WHERE created_at >= NOW() - (${days} || ' days')::interval
  `);
  const r = (rows as unknown as Array<{ total_clicks: number; total_signups: number; total_activations: number }>)[0];
  const clicks = Number(r?.total_clicks ?? 0);
  const activations = Number(r?.total_activations ?? 0);
  return {
    totalClicks: clicks,
    totalSignups: Number(r?.total_signups ?? 0),
    totalActivations: activations,
    overallConversion: clicks > 0 ? Math.round((activations / clicks) * 100) : 0,
  };
}

/** Revoke a link so it can no longer be redeemed. Idempotent. */
export async function revokeActivationLink(token: string): Promise<void> {
  await db
    .update(activationLinks)
    .set({ revoked: true })
    .where(eq(activationLinks.token, token));
}

/** Permanently delete an activation link. */
export async function deleteActivationLink(token: string): Promise<void> {
  await db
    .delete(activationLinks)
    .where(eq(activationLinks.token, token));
}

// ─── Customer Workflows ───────────────────────────────────────────────────────

export type { CustomerWorkflowRow };

/**
 * Returns the list of niche_pack_id slugs the customer has enabled.
 * E.g. ["wedding-planner", "real-estate-investor"]
 */
export async function getCustomerWorkflows(email: string): Promise<string[]> {
  const rows = await db
    .select({ nichePackId: customerWorkflows.nichePackId })
    .from(customerWorkflows)
    .where(eq(customerWorkflows.email, email))
    .orderBy(customerWorkflows.addedAt);
  return rows.map((r) => r.nichePackId);
}

/**
 * Add a workflow to the customer's account.
 * Idempotent — does nothing if already present.
 */
export async function addCustomerWorkflow(
  email: string,
  nichePackId: string,
): Promise<void> {
  const { randomUUID } = await import("node:crypto");
  await db
    .insert(customerWorkflows)
    .values({ id: randomUUID(), email, nichePackId })
    .onConflictDoNothing();
}

/** Remove a workflow from the customer's account. */
export async function removeCustomerWorkflow(
  email: string,
  nichePackId: string,
): Promise<void> {
  await db
    .delete(customerWorkflows)
    .where(
      and(
        eq(customerWorkflows.email, email),
        eq(customerWorkflows.nichePackId, nichePackId),
      ),
    );
}

// ─── User Connections queries ────────────────────────────────────────────────

/** Upsert an OAuth connection for a user. On conflict, updates the token + metadata. */
export async function upsertUserConnection(data: {
  userId: string;
  provider: string;
  providerUserId?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { randomUUID } = await import("node:crypto");
  await db
    .insert(userConnections)
    .values({
      id: randomUUID(),
      userId: data.userId,
      provider: data.provider,
      providerUserId: data.providerUserId ?? null,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      expiresAt: data.expiresAt ?? null,
      metadata: (data.metadata ?? {}) as Record<string, unknown>,
      connectedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userConnections.userId, userConnections.provider],
      set: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? null,
        expiresAt: data.expiresAt ?? null,
        providerUserId: data.providerUserId ?? null,
        metadata: (data.metadata ?? {}) as Record<string, unknown>,
        updatedAt: new Date(),
      },
    });
}

/** Get a single connection for a user+provider. Returns undefined if not connected. */
export async function getUserConnection(
  userId: string,
  provider: string,
): Promise<UserConnectionRow | undefined> {
  const rows = await db
    .select()
    .from(userConnections)
    .where(and(eq(userConnections.userId, userId), eq(userConnections.provider, provider)))
    .limit(1);
  return rows[0];
}

/** List all connections for a user. */
export async function listUserConnections(userId: string): Promise<UserConnectionRow[]> {
  return db.select().from(userConnections).where(eq(userConnections.userId, userId));
}

/** Remove a connection. */
export async function deleteUserConnection(userId: string, provider: string): Promise<void> {
  await db
    .delete(userConnections)
    .where(and(eq(userConnections.userId, userId), eq(userConnections.provider, provider)));
}

