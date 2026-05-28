import { z } from "zod";
import { PropertySchema } from "./property.js";

export const ViewFilterSchema = z.object({
  propertyName: z.string(),
  condition: z.string(),
  value: z.unknown(),
});

export const ViewSortSchema = z.object({
  propertyName: z.string(),
  direction: z.enum(["ascending", "descending"]),
});

export const ViewSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["table", "board", "gallery", "list", "calendar", "timeline"]),
  filters: z.array(ViewFilterSchema).optional(),
  sorts: z.array(ViewSortSchema).optional(),
  /** For board views: the property to group by */
  groupByProperty: z.string().optional(),
});

export type View = z.infer<typeof ViewSchema>;

export const DatabaseSchema = z.object({
  /** Stable identifier used for cross-references in relations */
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  /**
   * Whether this DB should be deployed to Notion.
   * Default behavior is true when omitted.
   * Set false for app-only helper/state databases.
   */
  notionDeploy: z.boolean().optional(),
  /** The first property must be a title property */
  properties: z.array(PropertySchema).min(1),
  views: z.array(ViewSchema).optional(),
});

export type Database = z.infer<typeof DatabaseSchema>;
