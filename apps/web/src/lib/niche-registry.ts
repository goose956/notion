// ─── Niche Registry ────────────────────────────────────────────────────────────
//
// Add ONE entry here to register a new niche's special tabs and sidebar config.
// The workspace page reads this registry instead of hard-coding per-niche logic.
//
// Usage when building a new niche:
//   1. Create components/niches/<your-niche>/ with dashboard + sidebar-tabs files
//   2. Add an entry to NICHE_REGISTRY below
//   3. Add an import + render case in the main content switch in page.tsx
//   4. Add <YourNicheSidebarTabs> in the sidebar section of page.tsx
//
// That's it — all navigation/selection logic is driven from this file.

// ─── Wedding Planner tab IDs ───────────────────────────────────────────────────
export const WEDDING_TABS = {
  DASHBOARD:  "__workspace_dashboard__",
  SEATING:    "__workspace_seating__",
  DRAFT:      "__workspace_draft_letters__",
  INVITATION: "__workspace_invitation_canvas__",
  SPEECH:     "__workspace_speech_writer__",
  HONEYMOON:  "__workspace_honeymoon_planner__",
} as const;

// ─── Registry entry shape ─────────────────────────────────────────────────────
export interface NicheRegistryEntry {
  nicheId: string;
  /** All virtual (non-database) tab IDs this niche owns. */
  virtualTabIds: Set<string>;
  /** Tab to activate when user first lands on /members/workspace. */
  defaultTabId: string;
  /** Database IDs to hide from the sidebar (e.g. helper DBs). */
  hiddenDbIds: string[];
}

// ─── Registry ─────────────────────────────────────────────────────────────────
export const NICHE_REGISTRY: NicheRegistryEntry[] = [
  // ── Wedding Planner ──────────────────────────────────────────────────────────
  {
    nicheId: "wedding-planner",
    virtualTabIds: new Set(Object.values(WEDDING_TABS)),
    defaultTabId: WEDDING_TABS.DASHBOARD,
    hiddenDbIds: ["honeymoon"],
  },

  // ── Add your next niche here ──────────────────────────────────────────────
  // {
  //   nicheId: "local-business-lead-tracker",
  //   virtualTabIds: new Set(Object.values(LOCAL_BUSINESS_TABS)),
  //   defaultTabId: LOCAL_BUSINESS_TABS.DASHBOARD,
  //   hiddenDbIds: [],
  // },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the registry entry for a niche, if it has one. */
export function getNicheEntry(nicheId: string): NicheRegistryEntry | undefined {
  return NICHE_REGISTRY.find((e) => e.nicheId === nicheId);
}

/**
 * True if the given tab ID is a virtual tab owned by any registered niche.
 * Used to prevent the navigation logic from clobbering a user's current view.
 */
export function isVirtualTab(tabId: string): boolean {
  return NICHE_REGISTRY.some((e) => e.virtualTabIds.has(tabId));
}

/**
 * Returns the tab that should be active when databases are first loaded.
 * Checks registry entries in order; first niche that has loaded databases wins.
 * Falls back to the first database's notionId.
 */
export function getDefaultTabId(
  databases: Array<{ nicheId: string; notionId: string }>,
): string {
  for (const entry of NICHE_REGISTRY) {
    if (entry.defaultTabId && databases.some((d) => d.nicheId === entry.nicheId)) {
      return entry.defaultTabId;
    }
  }
  return databases[0]?.notionId ?? "";
}

/**
 * Returns the set of database IDs that should be hidden from the sidebar
 * for a given niche.
 */
export function getHiddenDbIds(nicheId: string): string[] {
  return getNicheEntry(nicheId)?.hiddenDbIds ?? [];
}
