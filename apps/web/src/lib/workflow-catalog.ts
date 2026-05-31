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
] as const;

export type WorkflowCatalogItem = (typeof WORKFLOW_CATALOG)[number];
export type WorkflowId = WorkflowCatalogItem["id"];

export function getWorkflowById(id: string): WorkflowCatalogItem | undefined {
  return WORKFLOW_CATALOG.find((w) => w.id === id);
}
