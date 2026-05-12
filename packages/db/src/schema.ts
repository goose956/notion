import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  unique,
  boolean,
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

/**
 * templates — the directory of Notion workflow template listings.
 *
 * Each row is a public-facing page at /templates/[slug] with editorial
 * content optimised for LLM and search discovery.
 */
export const templates = pgTable("templates", {
  id: text("id").primaryKey(),                            // uuid
  slug: text("slug").notNull().unique(),                  // url-safe slug, e.g. track-youtube-videos-forex
  title: text("title").notNull(),
  tagline: text("tagline").notNull(),                     // 1-sentence hook shown in card/og
  problemStatement: text("problem_statement").notNull(),  // the workflow pain point
  /** Long-form markdown body (intro, who it's for, what's inside, etc.) */
  body: text("body").notNull().default(""),
  /** FAQ as JSON array of { question: string; answer: string } */
  faq: jsonb("faq").notNull().default([]),
  category: text("category").notNull().default(""),
  /** JSON string[] of tags */
  tags: jsonb("tags").notNull().default([]),
  stripePaymentLink: text("stripe_payment_link").notNull().default(""),
  stripePriceId: text("stripe_price_id").notNull().default(""),
  published: boolean("published").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TemplateRow = typeof templates.$inferSelect;
export type NewTemplateRow = typeof templates.$inferInsert;

// ─── Customers ───────────────────────────────────────────────────────────────

/**
 * customers — one row per buyer, keyed by email.
 *
 * Created automatically when a Stripe checkout.session.completed webhook fires.
 * notionUserId is populated when the customer signs in with Notion OAuth.
 */
export const customers = pgTable("customers", {
  id: text("id").primaryKey(),                            // uuid
  email: text("email").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id"),
  notionUserId: text("notion_user_id"),                   // set on first sign-in
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CustomerRow = typeof customers.$inferSelect;
export type NewCustomerRow = typeof customers.$inferInsert;

// ─── Purchases ───────────────────────────────────────────────────────────────

/**
 * purchases — one row per completed Stripe checkout, linking a customer to a template.
 */
export const purchases = pgTable("purchases", {
  id: text("id").primaryKey(),                            // uuid
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id),
  templateId: text("template_id")
    .notNull()
    .references(() => templates.id),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  amountPaid: integer("amount_paid").notNull().default(0), // in cents
  currency: text("currency").notNull().default("usd"),
  purchasedAt: timestamp("purchased_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PurchaseRow = typeof purchases.$inferSelect;
export type NewPurchaseRow = typeof purchases.$inferInsert;

// ─── App Settings ───────────────────────────────────────────────────────────

/**
 * app_settings — simple key/value settings store for runtime integrations.
 */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AppSettingRow = typeof appSettings.$inferSelect;
export type NewAppSettingRow = typeof appSettings.$inferInsert;

// ─── Agent Definitions ───────────────────────────────────────────────────────

/**
 * agent_definitions — reusable agent blueprints.
 *
 * Each row defines a named agent: its system prompt, which skills it can use,
 * the model it runs on, and optional per-niche scoping.
 */
export const agentDefinitions = pgTable("agent_definitions", {
  id: text("id").primaryKey(),                            // kebab-case slug
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  systemPrompt: text("system_prompt").notNull(),
  model: text("model").notNull().default("claude-sonnet-4-5"),
  /** JSON string[] of skill IDs available to this agent */
  skillList: jsonb("skill_list").notNull().default([]),
  /** JSON object — agent-level defaults (maxTurns, timeoutMs, etc.) */
  defaultConfig: jsonb("default_config").notNull().default({}),
  /** Optional niche scoping — null means the definition is global */
  nicheId: text("niche_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AgentDefinitionRow = typeof agentDefinitions.$inferSelect;
export type NewAgentDefinitionRow = typeof agentDefinitions.$inferInsert;

// ─── Agent Runs ──────────────────────────────────────────────────────────────

export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "pending",
  "running",
  "success",
  "failed",
  "timeout",
]);

/**
 * agent_runs — one row per execution of an agent.
 *
 * Records everything needed for billing, debugging, and auditing:
 * token usage, cost, duration, which tools were called, and the final output.
 */
export const agentRuns = pgTable("agent_runs", {
  id: text("id").primaryKey(),                            // uuid
  customerId: text("customer_id").notNull(),              // fk to customers.id (soft ref for flexibility)
  agentDefId: text("agent_def_id")
    .notNull()
    .references(() => agentDefinitions.id),
  trigger: text("trigger").notNull(),                     // 'manual' | 'scheduled' | 'api'
  status: agentRunStatusEnum("status").notNull().default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  /** Caller-supplied input (e.g. pageId, prompt, context) */
  input: jsonb("input").notNull().default({}),
  /** Final agent output — the result string + any structured output */
  output: jsonb("output").notNull().default({}),
  /** Notion page/database IDs written during the run */
  notionArtifacts: jsonb("notion_artifacts").notNull().default([]),
  /** { inputTokens, outputTokens, cacheReadTokens } */
  tokenUsage: jsonb("token_usage").notNull().default({}),
  /** Estimated cost in USD */
  costUsd: text("cost_usd"),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
});

export type AgentRunRow = typeof agentRuns.$inferSelect;
export type NewAgentRunRow = typeof agentRuns.$inferInsert;

// ─── Agent Schedules ─────────────────────────────────────────────────────────

/**
 * agent_schedules — cron-style scheduling for agent runs.
 *
 * The scheduler tick queries for rows where next_run_at <= now() AND active = true,
 * fires each via runAgent(), then advances next_run_at.
 */
export const agentSchedules = pgTable("agent_schedules", {
  id: text("id").primaryKey(),                            // uuid
  customerId: text("customer_id").notNull(),
  agentDefId: text("agent_def_id")
    .notNull()
    .references(() => agentDefinitions.id),
  /** Standard cron expression e.g. "0 9 * * 1" */
  cron: text("cron").notNull(),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  /** Optional static input merged into every scheduled run */
  defaultInput: jsonb("default_input").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AgentScheduleRow = typeof agentSchedules.$inferSelect;
export type NewAgentScheduleRow = typeof agentSchedules.$inferInsert;
