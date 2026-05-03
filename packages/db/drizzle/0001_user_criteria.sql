CREATE TABLE IF NOT EXISTS "user_criteria" (
	"id" text PRIMARY KEY NOT NULL,
	"notion_user_id" text NOT NULL,
	"niche_pack_id" text NOT NULL,
	"criteria" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_criteria_notion_user_id_niche_pack_id_unique" UNIQUE("notion_user_id","niche_pack_id")
);
--> statement-breakpoint
ALTER TABLE "user_criteria" ADD CONSTRAINT "user_criteria_niche_pack_id_niche_packs_id_fk" FOREIGN KEY ("niche_pack_id") REFERENCES "public"."niche_packs"("id") ON DELETE no action ON UPDATE no action;
