-- Add credits to customers. New signups default to 25 free credits.
-- Existing rows get 25 credits so no one is locked out immediately.
ALTER TABLE "customers" ADD COLUMN "credits" integer NOT NULL DEFAULT 25;
