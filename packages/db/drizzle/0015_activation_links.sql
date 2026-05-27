-- activation_links: one-time purchase links for Etsy (and similar) sales.
-- Each link grants a fixed number of credits and provisions a niche pack on first use.
CREATE TABLE "activation_links" (
  "token"          text PRIMARY KEY,
  "niche_pack_id"  text NOT NULL,
  "credits"        integer NOT NULL DEFAULT 500,
  "label"          text NOT NULL DEFAULT '',
  "used_at"        timestamp with time zone,
  "used_by"        text,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now()
);
