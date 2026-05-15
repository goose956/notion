-- Add notion_user_id to deploys so each deploy is scoped to the user who triggered it.
-- Nullable so existing rows remain valid.
ALTER TABLE "deploys" ADD COLUMN "notion_user_id" text;
