-- Migration 0006: custom_skills table
-- Stores user-created agent skills configured via the admin UI.

CREATE TABLE IF NOT EXISTS "custom_skills" (
  "id"           text PRIMARY KEY,
  "name"         text NOT NULL UNIQUE,
  "description"  text NOT NULL,
  "skill_type"   text NOT NULL DEFAULT 'webhook',
  "config"       jsonb NOT NULL DEFAULT '{}',
  "input_schema" jsonb NOT NULL DEFAULT '{"type":"object","properties":{}}',
  "enabled"      boolean NOT NULL DEFAULT true,
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  "updated_at"   timestamptz NOT NULL DEFAULT now()
);
