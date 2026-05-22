-- In-app workspace tables: allow users to deploy niche packs without Notion.

CREATE TABLE IF NOT EXISTS "app_workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"niche_pack_id" text NOT NULL,
	"name" text NOT NULL,
	"database_id_map" jsonb NOT NULL,
	"status" "deploy_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "app_workspaces_niche_pack_id_niche_packs_id_fk"
		FOREIGN KEY ("niche_pack_id") REFERENCES "niche_packs"("id")
		ON DELETE no action ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "app_databases" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"pack_db_id" text NOT NULL,
	"name" text NOT NULL,
	"properties_schema" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_databases_workspace_id_app_workspaces_id_fk"
		FOREIGN KEY ("workspace_id") REFERENCES "app_workspaces"("id")
		ON DELETE cascade ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "app_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"database_id" text NOT NULL,
	"properties" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_rows_database_id_app_databases_id_fk"
		FOREIGN KEY ("database_id") REFERENCES "app_databases"("id")
		ON DELETE cascade ON UPDATE no action
);
