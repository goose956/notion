export const WORKFLOW_CATALOG = [
  {
    id: "wedding-planner",
    name: "Wedding Planner",
    emoji: "💒",
    tagline: "Track guests, vendors, budget and seating for your wedding.",
    description:
      "Manage your full wedding planning workflow — guests, vendors, seating chart, budget and timeline — all in one place.",
  },
  {
    id: "rainbow",
    name: "Rainbow Wedding Planner",
    emoji: "🌈",
    tagline: "Plan your LGBTQ+ wedding — vendors, guests, budget and timeline in one place.",
    description:
      "Everything the Wedding Planner has, built for LGBTQ+ couples — LGBTQ+ friendly vendor search, gender-neutral guest management, and full budget and timeline tracking.",
  },
  {
    id: "project-manager",
    name: "Project HQ",
    emoji: "🗂️",
    tagline: "Every project, every task, one place.",
    description:
      "Track all your business projects and tasks in one workspace. Apply reusable task templates, get AI focus recommendations, and plan your week — all in one place.",
  },
  {
    id: "pinterest-poster",
    name: "Pinterest Poster",
    emoji: "📌",
    tagline: "Create and post Pinterest pins with AI-generated copy.",
    description:
      "Generate SEO-optimised pin titles, descriptions and tags with AI. Upload your own image or generate one — then post directly to your Pinterest board and track your history.",
  },
] as const;

export type WorkflowCatalogItem = (typeof WORKFLOW_CATALOG)[number];
export type WorkflowId = WorkflowCatalogItem["id"];

export function getWorkflowById(id: string): WorkflowCatalogItem | undefined {
  return WORKFLOW_CATALOG.find((w) => w.id === id);
}
