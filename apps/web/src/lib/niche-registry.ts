// ─── Niche Registry ────────────────────────────────────────────────────────────
//
// Add ONE entry here to register a new niche's special tabs and sidebar config.
// The workspace page reads this registry instead of hard-coding per-niche logic.
//
// Usage when building a new niche:
//   1. Create components/niches/<your-niche>/ with dashboard + tool files
//   2. Add a NICHE_TABS constant and an entry to NICHE_REGISTRY below
//   3. Add an import + render case in renderNicheContent() in page.tsx
//   That's it — navigation, sidebar, and selection logic are fully data-driven.

// ─── Wedding Planner tab IDs ───────────────────────────────────────────────────
export const WEDDING_TABS = {
  DASHBOARD:  "__workspace_dashboard__",
  SEATING:    "__workspace_seating__",
  DRAFT:      "__workspace_draft_letters__",
  INVITATION: "__workspace_invitation_canvas__",
  SPEECH:     "__workspace_speech_writer__",
  HONEYMOON:  "__workspace_honeymoon_planner__",
} as const;

// ─── Rainbow Wedding Planner tab IDs ─────────────────────────────────────────
// Must be unique — never share IDs with another niche or both shells activate.
export const RAINBOW_TABS = {
  DASHBOARD:  "__rainbow_dashboard__",
  SEATING:    "__rainbow_seating__",
  DRAFT:      "__rainbow_draft_letters__",
  INVITATION: "__rainbow_invitation_canvas__",
  SPEECH:     "__rainbow_speech_writer__",
  HONEYMOON:  "__rainbow_honeymoon_planner__",
} as const;

// ─── Accent palette ───────────────────────────────────────────────────────────
export interface NicheAccent {
  /** Primary colour hex, used for active borders and icon tints. */
  hex: string;
  /** Active tab text colour. */
  fgActive: string;
  /** Group header text colour. */
  fgHeader: string;
  /** Active tab background. */
  bgActive: string;
  /** Hover background for tab buttons. */
  bgHover: string;
  /** Niche group header background. */
  bgGroupHeader: string;
  /** Niche group header top border (full CSS value). */
  borderTop: string;
}

// ─── Sidebar tab definition ────────────────────────────────────────────────────
export interface NicheSidebarTab {
  tabId: string;
  label: string;
  /** Emoji shown as the icon. */
  icon: string;
  /** True for app-only tool tabs that are not standalone Notion databases. */
  appOnly?: boolean;
  /**
   * When set, the tab is disabled/greyed out if no DB with this dbId
   * exists in the user's workspace.
   */
  requiresDbId?: string;
}

// ─── Registry entry shape ─────────────────────────────────────────────────────
export interface NicheRegistryEntry {
  nicheId: string;
  /** Human-readable name shown in the "Add workspace" list. */
  displayName: string;
  /** All virtual (non-database) tab IDs this niche owns. */
  virtualTabIds: Set<string>;
  /** Tab to activate when user first lands on /members/workspace. */
  defaultTabId: string;
  /** Database IDs to hide from the sidebar (e.g. helper DBs). */
  hiddenDbIds: string[];
  /** Accent colour palette for the sidebar. */
  accent: NicheAccent;
  /** Emoji prefix shown in the sidebar group header. */
  sidebarEmoji: string;
  /** Tabs rendered at the top of the niche group (before DB rows). */
  topTabs: NicheSidebarTab[];
  /**
   * Pattern to match the DB name that acts as an "anchor".
   * `afterDbTabs` are injected directly after that DB's row.
   */
  afterDbNamePattern?: RegExp;
  /** Tabs injected after the anchor DB row. */
  afterDbTabs?: NicheSidebarTab[];
  /**
   * Virtual properties to inject when displaying a specific DB in the table view.
   * Keyed by dbId. Used for e.g. injecting an Email column into the documents table.
   */
  dbPropertyInjections?: Record<string, Array<{ id: string; name: string; type: string }>>;
  /**
   * DB IDs where saved research notes should be shown as a section below the table.
   */
  savedResearchDbIds?: string[];
}

// ─── Wedding Planner accent ───────────────────────────────────────────────────
const WEDDING_ACCENT: NicheAccent = {
  hex:            "#be185d",
  fgActive:       "#9d174d",
  fgHeader:       "#6b2040",
  bgActive:       "rgba(190,24,93,0.12)",
  bgHover:        "rgba(190,24,93,0.06)",
  bgGroupHeader:  "rgba(190,24,93,0.06)",
  borderTop:      "1px solid rgba(190,24,93,0.12)",
};

// ─── Rainbow accent ───────────────────────────────────────────────────────────
const RAINBOW_ACCENT: NicheAccent = {
  hex:            "#e11d7a",
  fgActive:       "#c2185b",
  fgHeader:       "#880e4f",
  bgActive:       "rgba(225,29,122,0.10)",
  bgHover:        "rgba(225,29,122,0.05)",
  bgGroupHeader:  "linear-gradient(135deg,rgba(255,0,0,0.08),rgba(255,165,0,0.08),rgba(0,200,83,0.08),rgba(33,150,243,0.08),rgba(156,39,176,0.08))",
  borderTop:      "2px solid rgba(225,29,122,0.30)",
};

// ─── Registry ─────────────────────────────────────────────────────────────────
export const NICHE_REGISTRY: NicheRegistryEntry[] = [
  // ── Wedding Planner ──────────────────────────────────────────────────────────
  {
    nicheId:      "wedding-planner",
    displayName:  "Wedding Planner",
    virtualTabIds: new Set(Object.values(WEDDING_TABS)),
    defaultTabId: WEDDING_TABS.DASHBOARD,
    hiddenDbIds:  ["honeymoon"],
    accent:       WEDDING_ACCENT,
    sidebarEmoji: "🌸",
    topTabs: [
      { tabId: WEDDING_TABS.DASHBOARD, label: "Dashboard", icon: "🏠", appOnly: true },
    ],
    afterDbNamePattern: /planning\s*(timetable|timeline)/i,
    afterDbTabs: [
      { tabId: WEDDING_TABS.SEATING,    label: "Seating Planner",   icon: "🪑", appOnly: true },
      { tabId: WEDDING_TABS.DRAFT,      label: "Draft Letters",     icon: "✍️", appOnly: true, requiresDbId: "documents" },
      { tabId: WEDDING_TABS.INVITATION, label: "Invitation Canvas", icon: "🎨", appOnly: true },
      { tabId: WEDDING_TABS.SPEECH,     label: "AI Speech Writer",  icon: "🎤", appOnly: true },
      { tabId: WEDDING_TABS.HONEYMOON,  label: "Honeymoon Planner", icon: "🌴", appOnly: true },
    ],
    dbPropertyInjections: {
      documents: [{ id: "Email", name: "Email", type: "email" }],
    },
    savedResearchDbIds: ["documents"],
  },

  // ── Rainbow Wedding Planner ───────────────────────────────────────────────
  {
    nicheId:      "rainbow",
    displayName:  "Rainbow Wedding Planner",
    virtualTabIds: new Set(Object.values(RAINBOW_TABS)),
    defaultTabId: RAINBOW_TABS.DASHBOARD,
    hiddenDbIds:  ["honeymoon"],
    accent:       RAINBOW_ACCENT,
    sidebarEmoji: "🌈",
    topTabs: [
      { tabId: RAINBOW_TABS.DASHBOARD, label: "Dashboard", icon: "🏠", appOnly: true },
    ],
    afterDbNamePattern: /planning\s*(timetable|timeline)/i,
    afterDbTabs: [
      { tabId: RAINBOW_TABS.SEATING,    label: "Seating Planner",   icon: "🪑", appOnly: true },
      { tabId: RAINBOW_TABS.DRAFT,      label: "Draft Letters",     icon: "✍️", appOnly: true, requiresDbId: "documents" },
      { tabId: RAINBOW_TABS.INVITATION, label: "Invitation Canvas", icon: "🎨", appOnly: true },
      { tabId: RAINBOW_TABS.SPEECH,     label: "AI Speech Writer",  icon: "🎤", appOnly: true },
      { tabId: RAINBOW_TABS.HONEYMOON,  label: "Honeymoon Planner", icon: "🌴", appOnly: true },
    ],
    dbPropertyInjections: {
      documents: [{ id: "Email", name: "Email", type: "email" }],
    },
    savedResearchDbIds: ["documents"],
  },

  // ── Add your next niche here ──────────────────────────────────────────────
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

/** True when the tab is a virtual niche tab explicitly marked app-only. */
export function isAppOnlyVirtualTab(tabId: string): boolean {
  return NICHE_REGISTRY.some((entry) => {
    const top = entry.topTabs.some((t) => t.tabId === tabId && t.appOnly === true);
    const after = (entry.afterDbTabs ?? []).some((t) => t.tabId === tabId && t.appOnly === true);
    return top || after;
  });
}

/**
 * Returns the tab that should be active when databases are first loaded.
 * Checks registry entries in order; first niche that has loaded databases wins.
 * Falls back to the first database's notionId.
 */
export function getDefaultTabId(
  databases: Array<{ nicheId: string; notionId: string }>,
): string {
  // Follow the order niches appear in the databases array (most recently
  // added workspace first), not the registry declaration order.
  // This ensures the niche the user just added becomes the active tab.
  const seen = new Set<string>();
  for (const db of databases) {
    if (seen.has(db.nicheId)) continue;
    seen.add(db.nicheId);
    const entry = NICHE_REGISTRY.find((e) => e.nicheId === db.nicheId);
    if (entry?.defaultTabId) return entry.defaultTabId;
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

/** True if the given DB should show saved research notes below its table. */
export function showsSavedResearch(nicheId: string, dbId: string): boolean {
  return getNicheEntry(nicheId)?.savedResearchDbIds?.includes(dbId) ?? false;
}
