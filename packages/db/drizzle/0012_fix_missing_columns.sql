-- Idempotent patch: add any columns that may have been missed by earlier migrations.
-- Safe to run multiple times thanks to IF NOT EXISTS.
ALTER TABLE "deploys" ADD COLUMN IF NOT EXISTS "notion_user_id" text;
