-- Add stripe_price_id to templates
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "stripe_price_id" text DEFAULT '' NOT NULL;

-- Customers: one row per buyer, keyed by email
CREATE TABLE IF NOT EXISTS "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"stripe_customer_id" text,
	"notion_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);

-- Purchases: one row per completed Stripe checkout
CREATE TABLE IF NOT EXISTS "purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"template_id" text NOT NULL,
	"stripe_session_id" text NOT NULL,
	"amount_paid" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_stripe_session_id_unique" UNIQUE("stripe_session_id")
);

ALTER TABLE "purchases" ADD CONSTRAINT "purchases_customer_id_customers_id_fk"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_template_id_templates_id_fk"
  FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE no action ON UPDATE no action;
