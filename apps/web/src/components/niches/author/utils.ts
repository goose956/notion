export function asText(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

export const ACCENT        = "#d97706";
export const ACCENT_LIGHT  = "rgba(217,119,6,0.07)";
export const ACCENT_BORDER = "rgba(217,119,6,0.22)";
export const ACCENT_TEXT   = "#92400e";

export const OUTLINE_SECTIONS = [
  "Premise & Hook",
  "Three-Act Structure",
  "Chapter-by-Chapter Outline",
  "Subplots & Themes",
  "Opening Scene",
  "Climax & Resolution",
] as const;

export type OutlineSection = typeof OUTLINE_SECTIONS[number];

export const GENRE_LIST = [
  "Fantasy", "Romance", "Thriller", "Sci-Fi", "Mystery",
  "Horror", "Literary Fiction", "Contemporary", "Historical Fiction",
  "Young Adult", "Crime", "Adventure",
] as const;

export const GOAL_BADGE: Record<string, { label: string }> = {
  "Finish first draft":       { label: "✍️ First draft" },
  "Self-publish":             { label: "📚 Self-publish" },
  "Traditional publishing":   { label: "🏛️ Traditional publishing" },
  "NaNoWriMo":                { label: "🏃 NaNoWriMo" },
};
