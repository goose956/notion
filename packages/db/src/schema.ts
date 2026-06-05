import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  unique,
  index,
  boolean,
} from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const deployStatusEnum = pgEnum("deploy_status", [
  "pending",
  "in_progress",
  "success",
  "removed",
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
  /** The Notion user ID who triggered this deploy */
  notionUserId: text("notion_user_id"),
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
  /** Optional link to a niche pack — drives post-signup redirect */
  nichePackId: text("niche_pack_id"),
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
  credits: integer("credits").notNull().default(25),      // free tier starts at 25
  // Channel attribution — set once on first activation, never overwritten
  sourceToken: text("source_token"),                      // activation_links.token that brought this customer
  sourceChannel: text("source_channel"),                  // copied from activation_links.source
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
 * Each row defines a named agent: its system prompt, which tools it can use,
 * the model it runs on, and optional per-niche scoping.
 */
export const agentDefinitions = pgTable("agent_definitions", {
  id: text("id").primaryKey(),                            // kebab-case slug
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  systemPrompt: text("system_prompt").notNull(),
  model: text("model").notNull().default("claude-sonnet-4-5"),
  /** JSON string[] of tool IDs available to this agent */
  toolList: jsonb("tool_list").notNull().default([]),
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

// ─── Custom Tools ────────────────────────────────────────────────────────────

/**
 * custom_tools — user-created agent tools configured via the admin UI.
 *
 * Each row is a tool that agents can use without writing any code.
 * Currently supported tool_types:
 *   - "webhook": POSTs agent args to a URL, returns the response body
 *
 * input_schema is an Anthropic-compatible tool input schema (JSON Schema object).
 * config holds tool-type-specific settings (url, method, headers for webhook type).
 */
export const customTools = pgTable("custom_tools", {
  id: text("id").primaryKey(),                            // kebab-case slug (also the tool name)
  name: text("name").notNull().unique(),                  // same as id — used as tool name in Claude
  description: text("description").notNull(),
  toolType: text("tool_type").notNull().default("webhook"), // "webhook" | future types
  /** Type-specific config. For webhook: { url, method, headers } */
  config: jsonb("config").notNull().default({}),
  /** Anthropic-compatible input_schema for the tool */
  inputSchema: jsonb("input_schema").notNull().default({ type: "object", properties: {} }),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CustomToolRow = typeof customTools.$inferSelect;
export type NewCustomToolRow = typeof customTools.$inferInsert;

// ─── Page Views ──────────────────────────────────────────────────────────────

/**
 * page_views — lightweight analytics event log.
 *
 * visitor_type: "human" | "llm" | "bot"
 *   LLM crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) are classified as "llm".
 *   Other automated agents are "bot". Normal browsers are "human".
 */
export const pageViews = pgTable("page_views", {
  id: text("id").primaryKey(),                            // uuid
  path: text("path").notNull(),                           // e.g. /templates/wedding-planner
  referrer: text("referrer"),                             // HTTP Referer header
  userAgent: text("user_agent"),                          // raw User-Agent string
  visitorType: text("visitor_type").notNull().default("human"), // "human" | "llm" | "bot"
  country: text("country"),                               // optional, from CF-IPCountry header
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PageViewRow = typeof pageViews.$inferSelect;
export type NewPageViewRow = typeof pageViews.$inferInsert;

/** @deprecated Use CustomToolRow instead */
export type CustomSkillRow = CustomToolRow;
/** @deprecated Use NewCustomToolRow instead */
export type NewCustomSkillRow = NewCustomToolRow;

// ─── Activation Links ────────────────────────────────────────────────────────

/**
 * activation_links — one-time purchase links for Etsy (and similar) sales.
 *
 * Admin creates a link specifying a niche pack and credits amount.
 * Buyer visits /activate/[token], logs in (or signs up), and receives the
 * specified credits plus a provisioned workspace for the niche pack.
 * Each token can only be redeemed once (used_at is set on redemption).
 */
export const activationLinks = pgTable("activation_links", {
  token: text("token").primaryKey(),                       // random UUID
  nichePackId: text("niche_pack_id").notNull(),            // e.g. "wedding-planner"
  credits: integer("credits").notNull().default(500),      // credits granted on redemption
  label: text("label").notNull().default(""),              // admin note (e.g. "Etsy – May 2025")
  uses: integer("uses").notNull().default(0),              // how many times redeemed so far
  maxUses: integer("max_uses"),                            // null = unlimited
  expiresAt: timestamp("expires_at", { withTimezone: true }), // null = never
  revoked: boolean("revoked").notNull().default(false),    // admin can block a link
  usedAt: timestamp("used_at", { withTimezone: true }),    // first redemption timestamp
  usedBy: text("used_by"),                                 // email of first redeemer
  // Channel attribution
  source: text("source"),                                  // e.g. "etsy", "notion", "pinterest"
  medium: text("medium"),                                  // e.g. "pdf_guide", "free_template"
  campaign: text("campaign"),                              // e.g. "wedding-planner"
  clickCount: integer("click_count").notNull().default(0), // total URL visits (not just redemptions)
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ActivationLinkRow = typeof activationLinks.$inferSelect;
export type NewActivationLinkRow = typeof activationLinks.$inferInsert;

// ─── Funnel Events ───────────────────────────────────────────────────────────

/**
 * funnel_events — one row per tracked conversion event.
 *
 * Events: activation_link_clicked | signup_completed | activation_redeemed | workspace_created
 */
export const funnelEvents = pgTable("funnel_events", {
  id: text("id").primaryKey(),                              // uuid
  customerId: text("customer_id").notNull(),                // fk to customers.id
  event: text("event").notNull(),                           // see events above
  properties: jsonb("properties").notNull().default({}),
  sourceToken: text("source_token"),                        // activation_links.token (nullable)
  sourceChannel: text("source_channel"),                    // copied from link for fast grouping
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FunnelEventRow = typeof funnelEvents.$inferSelect;
export type NewFunnelEventRow = typeof funnelEvents.$inferInsert;

// ─── In-App Workspace ────────────────────────────────────────────────────────

/**
 * app_workspaces — one row per in-app deploy (no Notion required).
 *
 * Mirrors the `deploys` table but stores data in Postgres instead of Notion.
 * userId is the customer email used as the stable identity for non-Notion users.
 */
export const appWorkspaces = pgTable("app_workspaces", {
  id: text("id").primaryKey(),                            // uuid
  userId: text("user_id").notNull(),                      // customer email
  nichePackId: text("niche_pack_id")
    .notNull()
    .references(() => nichePacks.id),
  name: text("name").notNull(),
  /** Serialised map of pack DB id → app_database id */
  databaseIdMap: jsonb("database_id_map").notNull(),
  status: deployStatusEnum("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => ({
  userStatusCreatedIdx: index("app_workspaces_user_status_created_idx").on(t.userId, t.status, t.createdAt),
  userNicheStatusIdx: index("app_workspaces_user_niche_status_idx").on(t.userId, t.nichePackId, t.status),
}));

export type AppWorkspaceRow = typeof appWorkspaces.$inferSelect;
export type NewAppWorkspaceRow = typeof appWorkspaces.$inferInsert;

/**
 * app_databases — one row per niche-pack database inside an in-app workspace.
 */
export const appDatabases = pgTable("app_databases", {
  id: text("id").primaryKey(),                            // uuid — used as the "database ID" in the UI
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => appWorkspaces.id),
  packDbId: text("pack_db_id").notNull(),                 // e.g. "vendors", "guests"
  name: text("name").notNull(),
  /** Snapshot version of the niche pack schema used for this DB */
  schemaVersion: integer("schema_version").notNull().default(1),
  /** Array of { name: string; type: string } property definitions */
  propertiesSchema: jsonb("properties_schema").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => ({
  workspaceIdx: index("app_databases_workspace_idx").on(t.workspaceId),
  workspacePackDbUniq: unique().on(t.workspaceId, t.packDbId),
}));

export type AppDatabaseRow = typeof appDatabases.$inferSelect;
export type NewAppDatabaseRow = typeof appDatabases.$inferInsert;

/**
 * app_rows — actual data rows saved to an in-app database.
 *
 * properties is a free-form JSON object keyed by property name — same shape
 * the AI returns in the ```json block so it can be saved directly.
 */
export const appRows = pgTable("app_rows", {
  id: text("id").primaryKey(),                            // uuid
  databaseId: text("database_id")
    .notNull()
    .references(() => appDatabases.id),
  properties: jsonb("properties").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => ({
  databaseCreatedIdx: index("app_rows_database_created_idx").on(t.databaseId, t.createdAt),
}));

export type AppRowRow = typeof appRows.$inferSelect;
export type NewAppRowRow = typeof appRows.$inferInsert;

// ─── Support ──────────────────────────────────────────────────────────────────

export const supportTickets = pgTable("support_tickets", {
  id: text("id").primaryKey(),
  customerEmail: text("customer_email").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("open"), // 'open' | 'closed'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supportMessages = pgTable("support_messages", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull(),
  senderType: text("sender_type").notNull(), // 'user' | 'admin'
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SupportTicketRow = typeof supportTickets.$inferSelect;
export type SupportMessageRow = typeof supportMessages.$inferSelect;

// ─── Customer Workflows ───────────────────────────────────────────────────────

/**
 * customer_workflows — tracks which workflow packs each customer has enabled.
 * Seeded from their activation link on signup; more can be added later.
 */
export const customerWorkflows = pgTable("customer_workflows", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  nichePackId: text("niche_pack_id").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailNicheUniq: unique().on(t.email, t.nichePackId),
  emailIdx: index("customer_workflows_email_idx").on(t.email),
}));

export type CustomerWorkflowRow = typeof customerWorkflows.$inferSelect;

// ─── User Connections ─────────────────────────────────────────────────────────

/**
 * user_connections — OAuth tokens for third-party integrations.
 *
 * Keyed by (userId, provider). Adding a new provider (Airtable, Google Sheets…)
 * is just a new row — no schema change required.
 */
export const userConnections = pgTable("user_connections", {
  id: text("id").primaryKey(),
  /** Customer email — our stable user identifier. */
  userId: text("user_id").notNull(),
  /** Provider slug: "notion" | "airtable" | … */
  provider: text("provider").notNull(),
  /** Provider's own user / bot ID. */
  providerUserId: text("provider_user_id"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  /** Arbitrary provider metadata (workspace name, bot_id, etc.). */
  metadata: jsonb("metadata").notNull().default({}),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userProviderUniq: unique().on(t.userId, t.provider),
  userIdIdx: index("user_connections_user_id_idx").on(t.userId),
}));

export type UserConnectionRow = typeof userConnections.$inferSelect;
export type NewUserConnectionRow = typeof userConnections.$inferInsert;
