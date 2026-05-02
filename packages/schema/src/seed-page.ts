import { z } from "zod";

export const SeedPagePropertyValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);

export const SeedPageSchema = z.object({
  /** Matches DatabaseSchema.id */
  databaseId: z.string().min(1),
  /** Map of property name → value to seed */
  properties: z.record(z.string(), SeedPagePropertyValueSchema),
  /** Optional child page content (Notion block children are out of scope for v0.1) */
  content: z.string().optional(),
});

export type SeedPage = z.infer<typeof SeedPageSchema>;
