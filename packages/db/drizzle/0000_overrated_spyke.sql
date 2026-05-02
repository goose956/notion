DO $$ BEGIN
 CREATE TYPE "public"."deploy_status" AS ENUM('pending', 'in_progress', 'success', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adapter_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"niche_pack_id" text NOT NULL,
	"adapter_id" text NOT NULL,
	"rows_processed" integer DEFAULT 0 NOT NULL,
	"rows_skipped" integer DEFAULT 0 NOT NULL,
	"status" "deploy_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deploys" (
	"id" text PRIMARY KEY NOT NULL,
	"niche_pack_id" text NOT NULL,
	"notion_parent_page_id" text NOT NULL,
	"database_id_map" jsonb NOT NULL,
	"status" "deploy_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "niche_packs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"schema_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adapter_runs" ADD CONSTRAINT "adapter_runs_niche_pack_id_niche_packs_id_fk" FOREIGN KEY ("niche_pack_id") REFERENCES "public"."niche_packs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "deploys" ADD CONSTRAINT "deploys_niche_pack_id_niche_packs_id_fk" FOREIGN KEY ("niche_pack_id") REFERENCES "public"."niche_packs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
