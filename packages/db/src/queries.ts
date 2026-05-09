/**
 * queries.ts — typed database query helpers for niche packs and deploys.
 *
 * All queries go through Drizzle ORM — no raw SQL.
 * Import { db } is the lazy singleton from client.ts.
 */

import { eq, desc, and, ilike, or, sql } from "drizzle-orm";
import { db } from "./client.js";
import {
  nichePacks,
  deploys,
  userCriteria,
  templates,
  customers,
  purchases,
  type NichePackRow,
  type NewNichePackRow,
  type DeployRow,
  type NewDeployRow,
  type UserCriteriaRow,
  type TemplateRow,
  type CustomerRow,
  type PurchaseRow,
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
      durationMs: update.durationMs ?? null,
      errorMessage: update.errorMessage ?? null,
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

