/**
 * migrate.ts — run pending Drizzle migrations then exit.
 * Called by Railway's startCommand before the Next.js server launches.
 * Loads .env.local for local development.
 */
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import fs from "node:fs";

// Load .env.local for local development if it exists
const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocalPath = join(__dirname, "../../../apps/web/.env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").replace(/^['"]|['"]$/g, "");
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

const url = process.env["DATABASE_URL"];
if (!url) {
  console.error("DATABASE_URL is not set — skipping migrations.");
  process.exit(0);
}

const migrationsFolderPath = join(__dirname, "../drizzle");

const client = postgres(url, { max: 1 });
const db = drizzle(client);

console.log("Running database migrations...");
await migrate(db, { migrationsFolder: migrationsFolderPath });
console.log("Migrations complete.");

// Belt-and-suspenders: idempotent fixups for columns that may have been missed
// if Drizzle's migration tracking was ever out of sync.
console.log("Running schema fixups...");
await client.unsafe(`
  ALTER TABLE deploys ADD COLUMN IF NOT EXISTS notion_user_id text;
`);

// Recovery fix: if migration history drifted, make sure in-app workspace tables exist.
const appWorkspaceRegclass = await client.unsafe(
  "select to_regclass('public.app_workspaces') as regclass",
);
const hasAppWorkspaceTable = appWorkspaceRegclass?.[0]?.["regclass"] !== null;
if (!hasAppWorkspaceTable) {
  const appWorkspaceSqlPath = join(__dirname, "../drizzle/0013_app_workspace.sql");
  const appWorkspaceSql = fs.readFileSync(appWorkspaceSqlPath, "utf-8");
  await client.unsafe(appWorkspaceSql);
  console.log("Applied fallback migration: 0013_app_workspace.sql");
}

// Recovery fix: same pattern for activation_links table.
const activationLinksRegclass = await client.unsafe(
  "select to_regclass('public.activation_links') as regclass",
);
const hasActivationLinksTable = activationLinksRegclass?.[0]?.["regclass"] !== null;
if (!hasActivationLinksTable) {
  const activationLinksSqlPath = join(__dirname, "../drizzle/0015_activation_links.sql");
  const activationLinksSql = fs.readFileSync(activationLinksSqlPath, "utf-8");
  await client.unsafe(activationLinksSql);
  console.log("Applied fallback migration: 0015_activation_links.sql");
}

// Recovery fix: add multi-use columns to activation_links if they don't exist yet.
const usesColumnCheck = await client.unsafe(`
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'activation_links' AND column_name = 'uses'
  LIMIT 1
`);
if (!usesColumnCheck?.[0]) {
  const v2SqlPath = join(__dirname, "../drizzle/0016_activation_links_v2.sql");
  const v2Sql = fs.readFileSync(v2SqlPath, "utf-8");
  await client.unsafe(v2Sql);
  console.log("Applied fallback migration: 0016_activation_links_v2.sql");
}

// Recovery fix: add channel attribution columns if they don't exist (migration 0017 fallback).
await client.unsafe(`
  ALTER TABLE activation_links
    ADD COLUMN IF NOT EXISTS source text,
    ADD COLUMN IF NOT EXISTS medium text,
    ADD COLUMN IF NOT EXISTS campaign text,
    ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;
`);
await client.unsafe(`
  ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS source_token text,
    ADD COLUMN IF NOT EXISTS source_channel text;
`);
await client.unsafe(`
  CREATE TABLE IF NOT EXISTS funnel_events (
    id text PRIMARY KEY NOT NULL,
    customer_id text NOT NULL,
    event text NOT NULL,
    properties jsonb NOT NULL DEFAULT '{}',
    source_token text,
    source_channel text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
  );
`);
// Fallback fixups for 0018_support — safe to repeat (IF NOT EXISTS throughout).
await client.unsafe(`
  CREATE TABLE IF NOT EXISTS support_tickets (
    id text PRIMARY KEY NOT NULL,
    customer_email text NOT NULL,
    subject text NOT NULL,
    status text NOT NULL DEFAULT 'open',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
  );
`);
await client.unsafe(`
  CREATE TABLE IF NOT EXISTS support_messages (
    id text PRIMARY KEY NOT NULL,
    ticket_id text NOT NULL,
    sender_type text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
  );
`);
await client.unsafe(`
  CREATE INDEX IF NOT EXISTS support_messages_ticket_idx
    ON support_messages (ticket_id, created_at);
`);
await client.unsafe(`
  CREATE INDEX IF NOT EXISTS support_tickets_email_idx
    ON support_tickets (customer_email);
`);
await client.unsafe(`
  CREATE INDEX IF NOT EXISTS funnel_events_channel_created_idx
    ON funnel_events (source_channel, created_at);
`);
await client.unsafe(`
  CREATE INDEX IF NOT EXISTS funnel_events_customer_created_idx
    ON funnel_events (customer_id, created_at);
`);

// Recovery fix: ensure customer_workflows table exists.
await client.unsafe(`
  CREATE TABLE IF NOT EXISTS customer_workflows (
    id              text        PRIMARY KEY,
    email           text        NOT NULL,
    niche_pack_id   text        NOT NULL,
    added_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT customer_workflows_email_niche_uniq UNIQUE (email, niche_pack_id)
  );
  CREATE INDEX IF NOT EXISTS customer_workflows_email_idx ON customer_workflows (email);

  -- Seed from activation links if not yet done
  INSERT INTO customer_workflows (id, email, niche_pack_id, added_at)
  SELECT
    gen_random_uuid()::text,
    c.email,
    al.niche_pack_id,
    COALESCE(c.created_at, now())
  FROM customers c
  JOIN activation_links al ON al.token = c.source_token
  WHERE c.source_token IS NOT NULL
  ON CONFLICT (email, niche_pack_id) DO NOTHING;
`);

// Recovery fix: ensure user_connections exists for provider OAuth persistence.
await client.unsafe(`
  CREATE TABLE IF NOT EXISTS user_connections (
    id               text        PRIMARY KEY,
    user_id          text        NOT NULL,
    provider         text        NOT NULL,
    provider_user_id text,
    access_token     text        NOT NULL,
    refresh_token    text,
    expires_at       timestamptz,
    metadata         jsonb       NOT NULL DEFAULT '{}',
    connected_at     timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_connections_user_provider_uniq UNIQUE (user_id, provider)
  );

  CREATE INDEX IF NOT EXISTS user_connections_user_id_idx
    ON user_connections (user_id);
`);

console.log("Schema fixups complete.");

await client.end();
