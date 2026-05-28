-- Migration 0018: support tickets + messages

CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" text PRIMARY KEY NOT NULL,
  "customer_email" text NOT NULL,
  "subject" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "ticket_id" text NOT NULL,
  "sender_type" text NOT NULL,
  "message" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "support_messages_ticket_idx"
  ON "support_messages" ("ticket_id", "created_at");

CREATE INDEX IF NOT EXISTS "support_tickets_email_idx"
  ON "support_tickets" ("customer_email");
