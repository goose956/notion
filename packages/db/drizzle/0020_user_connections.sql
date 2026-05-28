-- ─── user_connections ────────────────────────────────────────────────────────
-- Stores OAuth tokens for third-party integrations (Notion, Airtable, etc.).
-- Keyed by (user_id, provider) — one row per provider per user.
-- Designed to extend: adding Airtable/Google Sheets is just a new row.

CREATE TABLE IF NOT EXISTS user_connections (
  id               text        PRIMARY KEY,
  user_id          text        NOT NULL,   -- customer email (our user identifier)
  provider         text        NOT NULL,   -- 'notion' | future providers
  provider_user_id text,                   -- provider's user / bot ID
  access_token     text        NOT NULL,
  refresh_token    text,
  expires_at       timestamptz,
  metadata         jsonb       NOT NULL DEFAULT '{}',  -- workspace name, bot_id, etc.
  connected_at     timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_connections_user_provider_uniq UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS user_connections_user_id_idx ON user_connections (user_id);
