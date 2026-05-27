-- Migration 0017: channel attribution + funnel events

-- Extend activation_links with channel metadata + click tracking
ALTER TABLE "activation_links"
  ADD COLUMN IF NOT EXISTS "source" text,
  ADD COLUMN IF NOT EXISTS "medium" text,
  ADD COLUMN IF NOT EXISTS "campaign" text,
  ADD COLUMN IF NOT EXISTS "click_count" integer NOT NULL DEFAULT 0;

-- Extend customers with source attribution (set once on first activation)
ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "source_token" text,
  ADD COLUMN IF NOT EXISTS "source_channel" text;

-- Create funnel_events table
CREATE TABLE IF NOT EXISTS "funnel_events" (
  "id" text PRIMARY KEY NOT NULL,
  "customer_id" text NOT NULL,
  "event" text NOT NULL,
  "properties" jsonb NOT NULL DEFAULT '{}',
  "source_token" text,
  "source_channel" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast querying by channel and time
CREATE INDEX IF NOT EXISTS "funnel_events_channel_created_idx"
  ON "funnel_events" ("source_channel", "created_at");

CREATE INDEX IF NOT EXISTS "funnel_events_customer_created_idx"
  ON "funnel_events" ("customer_id", "created_at");
