-- Hardening for app workspace scale:
-- 1) add schema_version to app_databases
-- 2) dedupe accidental duplicate pack DB rows per workspace
-- 3) add unique/index constraints for hot query paths

ALTER TABLE "app_databases"
  ADD COLUMN IF NOT EXISTS "schema_version" integer NOT NULL DEFAULT 1;

-- Keep one row per (workspace_id, pack_db_id) to allow a unique constraint.
-- Prefer the newest row by created_at (and id as tie-breaker).
DELETE FROM "app_databases" d
USING (
  SELECT id
  FROM (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY workspace_id, pack_db_id
        ORDER BY created_at DESC, id DESC
      ) AS rn
    FROM app_databases
  ) ranked
  WHERE ranked.rn > 1
) dupes
WHERE d.id = dupes.id;

CREATE UNIQUE INDEX IF NOT EXISTS "app_databases_workspace_packdb_uniq"
  ON "app_databases" ("workspace_id", "pack_db_id");

CREATE INDEX IF NOT EXISTS "app_databases_workspace_idx"
  ON "app_databases" ("workspace_id");

CREATE INDEX IF NOT EXISTS "app_rows_database_created_idx"
  ON "app_rows" ("database_id", "created_at");

CREATE INDEX IF NOT EXISTS "app_workspaces_user_status_created_idx"
  ON "app_workspaces" ("user_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "app_workspaces_user_niche_status_idx"
  ON "app_workspaces" ("user_id", "niche_pack_id", "status");
