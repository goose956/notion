import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const deployStatusEnum = pgEnum("deploy_status", [
  "pending",
  "in_progress",
  "success",
  "failed",
]);

// ─── Tables ─────────────────────────────────────────────────────────────────

/**
 * niche_packs — the canonical store for all authored niche packs.
 *
 * schema_snapshot is the full NichePack JSON at the time of last save.
 * version is a monotonically increasing integer per pack (for optimistic locking).
 */
export const nichePacks = pgTable("niche_packs", {
  id: text("id").primaryKey(),                          // matches NichePack.id
  name: text("name").notNull(),
  description: text("description").notNull(),
  version: integer("version").notNull().default(1),
  /** Full NichePack JSON */
  schemaSnapshot: jsonb("schema_snapshot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * deploys — audit log of every Push operation to a Notion workspace.
 */
export const deploys = pgTable("deploys", {
  id: text("id").primaryKey(),                          // uuid
  nichePackId: text("niche_pack_id")
    .notNull()
    .references(() => nichePacks.id),
  /** The Notion workspace page ID this pack was deployed to */
  notionParentPageId: text("notion_parent_page_id").notNull(),
  /** Serialized map of pack DB id → Notion DB id */
  databaseIdMap: jsonb("database_id_map").notNull(),
  status: deployStatusEnum("status").notNull().default("pending"),
  /** Error message if status = failed */
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

/**
 * adapter_runs — future home of sync engine execution records (v0.2).
 * Scaffolded now so the DB schema is forward-compatible.
 */
export const adapterRuns = pgTable("adapter_runs", {
  id: text("id").primaryKey(),                          // uuid
  nichePackId: text("niche_pack_id")
    .notNull()
    .references(() => nichePacks.id),
  adapterId: text("adapter_id").notNull(),              // e.g. 'zillow-rss'
  rowsProcessed: integer("rows_processed").notNull().default(0),
  rowsSkipped: integer("rows_skipped").notNull().default(0),
  status: deployStatusEnum("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type NichePackRow = typeof nichePacks.$inferSelect;
export type NewNichePackRow = typeof nichePacks.$inferInsert;
export type DeployRow = typeof deploys.$inferSelect;
export type NewDeployRow = typeof deploys.$inferInsert;
export type AdapterRunRow = typeof adapterRuns.$inferSelect;
export type NewAdapterRunRow = typeof adapterRuns.$inferInsert;

/**
 * user_criteria — persists per-user, per-niche onboarding answers.
 *
 * Keyed by (notionUserId, nichePackId). Allows each user to have
 * their own settings (market, budget, etc.) for every niche they deploy.
 */
export const userCriteria = pgTable("user_criteria", {
  id: text("id").primaryKey(),
  notionUserId: text("notion_user_id").notNull(),
  nichePackId: text("niche_pack_id")
    .notNull()
    .references(() => nichePacks.id),
  criteria: jsonb("criteria").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => ({ uniq: unique().on(t.notionUserId, t.nichePackId) }));

export type UserCriteriaRow = typeof userCriteria.$inferSelect;
export type NewUserCriteriaRow = typeof userCriteria.$inferInsert;
