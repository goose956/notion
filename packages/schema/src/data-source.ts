import { z } from "zod";

/**
 * Declaration of a data adapter within a niche pack's schema.
 * The actual adapter implementation lives in niches/[niche]/sources/*.ts
 * and is loaded at runtime by the adapter registry.
 */
export const DataSourceSchema = z.object({
  /** Stable adapter ID, e.g. 'zillow-rss'. Must match the adapter's `id` field. */
  id: z.string().min(1).regex(/^[a-z0-9-]+$/, "Must be kebab-case"),
  /** Human-readable label shown in the UI */
  label: z.string().min(1),
  description: z.string().min(1),
  /**
   * Path to the adapter stub file relative to the niche pack root.
   * e.g. 'sources/zillow-rss.ts'
   */
  stubFile: z.string().min(1),
  /**
   * Environment variable names the adapter requires.
   * Customers must supply these during onboarding.
   */
  requiredCredentials: z.array(z.string()),
  /**
   * The database id (matches DatabaseSchema.id) this adapter writes rows into.
   */
  targetDatabaseId: z.string().min(1),
  /**
   * How often to run this adapter.
   * Uses a simplified cron-like descriptor for the MVP.
   */
  schedule: z
    .enum(["hourly", "daily", "weekly", "manual"])
    .default("daily"),
});

export type DataSource = z.infer<typeof DataSourceSchema>;
