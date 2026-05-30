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
    id: "real-estate-investor",
    name: "Real Estate Investor",
    emoji: "🏠",
    tagline: "Find and score investment properties from multiple data sources.",
    description:
      "Surface off-market deals, score properties automatically and track your deal pipeline from any market.",
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
    id: "local-business-lead-tracker",
    name: "Local Business Leads",
    emoji: "📍",
    tagline: "Build targeted lead lists from Google Places and enrich them automatically.",
    description:
      "Find local businesses in any area, enrich with contact details and track outreach all in one workflow.",
  },
] as const;

export type WorkflowCatalogItem = (typeof WORKFLOW_CATALOG)[number];
export type WorkflowId = WorkflowCatalogItem["id"];

export function getWorkflowById(id: string): WorkflowCatalogItem | undefined {
  return WORKFLOW_CATALOG.find((w) => w.id === id);
}
