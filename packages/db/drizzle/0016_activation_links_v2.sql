-- Activation links v2: multi-use support, expiry, revocation
ALTER TABLE "activation_links" ADD COLUMN IF NOT EXISTS "uses"       integer NOT NULL DEFAULT 0;
ALTER TABLE "activation_links" ADD COLUMN IF NOT EXISTS "max_uses"   integer;
ALTER TABLE "activation_links" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
ALTER TABLE "activation_links" ADD COLUMN IF NOT EXISTS "revoked"    boolean NOT NULL DEFAULT false;
