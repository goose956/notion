export const TEMPLATE_CATEGORIES = [
  "Finance",
  "Marketing",
  "Productivity",
  "Real Estate",
  "Sales",
  "Content Creation",
  "Operations",
  "Local SEO",
  "Creator Ops",
  "Health",
  "Research",
  "Other",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export function slugifyTemplateCategory(category: string): string {
  return category
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function humanizeTemplateCategorySlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
