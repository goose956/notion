DO $$ BEGIN
  CREATE TYPE "agent_run_status" AS ENUM ('pending', 'running', 'success', 'failed', 'timeout');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "agent_definitions" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "system_prompt" text NOT NULL,
  "model" text NOT NULL DEFAULT 'claude-sonnet-4-5',
  "skill_list" jsonb NOT NULL DEFAULT '[]',
  "default_config" jsonb NOT NULL DEFAULT '{}',
  "niche_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "agent_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "customer_id" text NOT NULL,
  "agent_def_id" text NOT NULL REFERENCES "agent_definitions"("id"),
  "trigger" text NOT NULL,
  "status" "agent_run_status" NOT NULL DEFAULT 'pending',
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "input" jsonb NOT NULL DEFAULT '{}',
  "output" jsonb NOT NULL DEFAULT '{}',
  "notion_artifacts" jsonb NOT NULL DEFAULT '[]',
  "token_usage" jsonb NOT NULL DEFAULT '{}',
  "cost_usd" text,
  "error_message" text,
  "duration_ms" integer
);

CREATE TABLE IF NOT EXISTS "agent_schedules" (
  "id" text PRIMARY KEY NOT NULL,
  "customer_id" text NOT NULL,
  "agent_def_id" text NOT NULL REFERENCES "agent_definitions"("id"),
  "cron" text NOT NULL,
  "next_run_at" timestamp with time zone NOT NULL,
  "last_run_at" timestamp with time zone,
  "active" boolean NOT NULL DEFAULT true,
  "default_input" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Seed: default-enrichment-agent (global, used by /api/enrich migration)
INSERT INTO "agent_definitions" (
  "id", "name", "description", "system_prompt", "model", "skill_list", "default_config"
) VALUES (
  'default-enrichment-agent',
  'Default Enrichment Agent',
  'Enriches a Notion page property using an AI prompt. Reads context, runs the prompt, writes the result back.',
  'You are an AI enrichment agent for Notion. You receive a prompt template and context values. Substitute the context into the prompt, generate the best possible response, and write it to the specified Notion page property using the notion_write skill. Be concise and directly useful. Do not add preamble.',
  'claude-sonnet-4-5',
  '["enrich_record", "notion_write"]',
  '{"maxTurns": 5, "timeoutMs": 30000}'
) ON CONFLICT ("id") DO NOTHING;
