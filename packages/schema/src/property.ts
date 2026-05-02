import { z } from "zod";

// ─── Notion property types ──────────────────────────────────────────────────
// All 22 Notion property types are modeled here as a discriminated union.

export const TitlePropertySchema = z.object({
  type: z.literal("title"),
  name: z.string().min(1),
});

export const RichTextPropertySchema = z.object({
  type: z.literal("rich_text"),
  name: z.string().min(1),
});

export const NumberPropertySchema = z.object({
  type: z.literal("number"),
  name: z.string().min(1),
  format: z
    .enum([
      "number",
      "number_with_commas",
      "percent",
      "dollar",
      "canadian_dollar",
      "euro",
      "pound",
      "yen",
      "ruble",
      "rupee",
      "won",
      "yuan",
      "real",
      "lira",
      "rupiah",
      "franc",
      "hong_kong_dollar",
      "new_zealand_dollar",
      "krona",
      "norwegian_krone",
      "mexican_peso",
      "rand",
      "new_taiwan_dollar",
      "danish_krone",
      "zloty",
      "baht",
      "forint",
      "koruna",
      "shekel",
      "chilean_peso",
      "philippine_peso",
      "dirham",
      "colombian_peso",
      "riyal",
      "ringgit",
      "leu",
      "argentine_peso",
      "uruguayan_peso",
      "singapore_dollar",
    ])
    .optional(),
});

export const SelectOptionSchema = z.object({
  name: z.string().min(1),
  color: z
    .enum([
      "default",
      "gray",
      "brown",
      "orange",
      "yellow",
      "green",
      "blue",
      "purple",
      "pink",
      "red",
    ])
    .optional(),
});

export const SelectPropertySchema = z.object({
  type: z.literal("select"),
  name: z.string().min(1),
  options: z.array(SelectOptionSchema).optional(),
});

export const MultiSelectPropertySchema = z.object({
  type: z.literal("multi_select"),
  name: z.string().min(1),
  options: z.array(SelectOptionSchema).optional(),
});

export const StatusPropertySchema = z.object({
  type: z.literal("status"),
  name: z.string().min(1),
});

export const DatePropertySchema = z.object({
  type: z.literal("date"),
  name: z.string().min(1),
});

export const PeoplePropertySchema = z.object({
  type: z.literal("people"),
  name: z.string().min(1),
});

export const FilesPropertySchema = z.object({
  type: z.literal("files"),
  name: z.string().min(1),
});

export const CheckboxPropertySchema = z.object({
  type: z.literal("checkbox"),
  name: z.string().min(1),
});

export const UrlPropertySchema = z.object({
  type: z.literal("url"),
  name: z.string().min(1),
});

export const EmailPropertySchema = z.object({
  type: z.literal("email"),
  name: z.string().min(1),
});

export const PhoneNumberPropertySchema = z.object({
  type: z.literal("phone_number"),
  name: z.string().min(1),
});

export const FormulaPropertySchema = z.object({
  type: z.literal("formula"),
  name: z.string().min(1),
  /** Notion formula expression string */
  expression: z.string().min(1),
});

export const RelationPropertySchema = z.object({
  type: z.literal("relation"),
  name: z.string().min(1),
  /** The `id` of the database being related to (matches DatabaseSchema.id) */
  targetDatabaseId: z.string().min(1),
  /** If set, the name of the synced property on the target database */
  syncedPropertyName: z.string().optional(),
  dualProperty: z.boolean().optional(),
});

export const RollupPropertySchema = z.object({
  type: z.literal("rollup"),
  name: z.string().min(1),
  /** Name of the relation property on this database */
  relationPropertyName: z.string().min(1),
  /** Property on the related database to roll up */
  rollupPropertyName: z.string().min(1),
  function: z.enum([
    "count",
    "count_values",
    "empty",
    "not_empty",
    "unique",
    "show_unique",
    "percent_empty",
    "percent_not_empty",
    "sum",
    "average",
    "median",
    "min",
    "max",
    "range",
    "earliest_date",
    "latest_date",
    "date_range",
    "checked",
    "unchecked",
    "percent_checked",
    "percent_unchecked",
    "show_original",
  ]),
});

export const CreatedTimePropertySchema = z.object({
  type: z.literal("created_time"),
  name: z.string().min(1),
});

export const CreatedByPropertySchema = z.object({
  type: z.literal("created_by"),
  name: z.string().min(1),
});

export const LastEditedTimePropertySchema = z.object({
  type: z.literal("last_edited_time"),
  name: z.string().min(1),
});

export const LastEditedByPropertySchema = z.object({
  type: z.literal("last_edited_by"),
  name: z.string().min(1),
});

export const UniqueIdPropertySchema = z.object({
  type: z.literal("unique_id"),
  name: z.string().min(1),
  prefix: z.string().optional(),
});

export const VerificationPropertySchema = z.object({
  type: z.literal("verification"),
  name: z.string().min(1),
});

/** Discriminated union of all 22 Notion property types */
export const PropertySchema = z.discriminatedUnion("type", [
  TitlePropertySchema,
  RichTextPropertySchema,
  NumberPropertySchema,
  SelectPropertySchema,
  MultiSelectPropertySchema,
  StatusPropertySchema,
  DatePropertySchema,
  PeoplePropertySchema,
  FilesPropertySchema,
  CheckboxPropertySchema,
  UrlPropertySchema,
  EmailPropertySchema,
  PhoneNumberPropertySchema,
  FormulaPropertySchema,
  RelationPropertySchema,
  RollupPropertySchema,
  CreatedTimePropertySchema,
  CreatedByPropertySchema,
  LastEditedTimePropertySchema,
  LastEditedByPropertySchema,
  UniqueIdPropertySchema,
  VerificationPropertySchema,
]);

export type Property = z.infer<typeof PropertySchema>;
