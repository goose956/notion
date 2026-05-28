-- ─── customer_workflows ──────────────────────────────────────────────────────
-- Tracks which workflow packs each customer has enabled.
-- One row per (email, niche_pack_id) pair.

CREATE TABLE IF NOT EXISTS customer_workflows (
  id              text        PRIMARY KEY,
  email           text        NOT NULL,
  niche_pack_id   text        NOT NULL,
  added_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_workflows_email_niche_uniq UNIQUE (email, niche_pack_id)
);

CREATE INDEX IF NOT EXISTS customer_workflows_email_idx ON customer_workflows (email);

-- Seed initial workflows from existing customers via their activation link
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
