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

// ─── Pinterest Poster tab IDs ─────────────────────────────────────────────────
export const PINTEREST_TABS = {
  DASHBOARD:  "__pinterest_dashboard__",
  CREATE_PIN: "__pinterest_create__",
} as const;

// ─── Project HQ tab IDs ───────────────────────────────────────────────────────
export const PROJECT_MANAGER_TABS = {
  DASHBOARD:       "__pm_dashboard__",
  APPLY_TEMPLATES: "__pm_apply_templates__",
  FOCUS_MODE:      "__pm_focus_mode__",
  TASK_BREAKDOWN:  "__pm_task_breakdown__",
} as const;

// ─── Neurodivergent Life OS tab IDs ──────────────────────────────────────────
export const NEURODIVERGENT_TABS = {
  DASHBOARD:  "__nd_dashboard__",
  BRAIN_DUMP: "__nd_brain_dump__",
  FOCUS:      "__nd_focus__",
  BREAKDOWN:  "__nd_breakdown__",
} as const;

// ─── Content Creator OS tab IDs ──────────────────────────────────────────────
export const CC_TABS = {
  DASHBOARD: "__cc_dashboard__",
  IDEAS:     "__cc_ideas__",
  SCRIPT:    "__cc_script__",
  CAPTION:   "__cc_caption__",
} as const;

// ─── Cake Business Planner tab IDs ───────────────────────────────────────────
export const CAKE_TABS = {
  DASHBOARD:  "__cake_dashboard__",
  PLAN:       "__cake_plan__",
  PRICING:    "__cake_pricing__",
  COMPLIANCE: "__cake_compliance__",
} as const;

// ─── Freelancer OS tab IDs ───────────────────────────────────────────────────
export const FREELANCER_TABS = {
  DASHBOARD: "__fl_dashboard__",
  PROPOSAL:  "__fl_proposal__",
  INVOICE:   "__fl_invoice__",
  OUTREACH:  "__fl_outreach__",
  LIBRARY:   "__fl_library__",
} as const;

// ─── Vibe Coder OS tab IDs ───────────────────────────────────────────────────
export const VIBE_CODER_TABS = {
  DASHBOARD: "__vc_dashboard__",
  SCORE:     "__vc_score__",
  PLAN:      "__vc_plan__",
  LAUNCH:    "__vc_launch__",
  LIBRARY:   "__vc_library__",
} as const;

// ─── Podcast OS tab IDs ──────────────────────────────────────────────────────
export const PODCAST_TABS = {
  DASHBOARD:  "__podcast_dashboard__",
  EPISODE:    "__podcast_episode__",
  SHOW_NOTES: "__podcast_shownotes__",
  OUTREACH:   "__podcast_outreach__",
  TRANSCRIPT: "__podcast_transcript__",
  LIBRARY:    "__podcast_library__",
} as const;

// ─── Amazon FBA Seller OS tab IDs ────────────────────────────────────────────
export const FBA_TABS = {
  DASHBOARD: "__fba_dashboard__",
  RESEARCH:  "__fba_research__",
  LISTING:   "__fba_listing__",
  SUPPLIER:  "__fba_supplier__",
  LIBRARY:   "__fba_library__",
} as const;

// ─── SEND Parent OS tab IDs ──────────────────────────────────────────────────
export const SEND_TABS = {
  DASHBOARD:    "__send_dashboard__",
  APPOINTMENTS: "__send_appointments__",
  BEHAVIOUR:    "__send_behaviour__",
  EHCP:         "__send_ehcp__",
  LETTERS:      "__send_letters__",
  DOCUMENTS:    "__send_documents__",
} as const;

// ─── Keto OS tab IDs ─────────────────────────────────────────────────────────
export const KETO_TABS = {
  DASHBOARD:   "__keto_dashboard__",
  PLANNER:     "__keto_planner__",
  ANALYSER:    "__keto_analyser__",
  MACROS:      "__keto_macros__",
  MY_MEALS:    "__keto_my_meals__",
  INGREDIENTS: "__keto_ingredients__",
} as const;

// ─── Personal Trainer Business OS tab IDs ────────────────────────────────────
export const PT_TABS = {
  DASHBOARD:  "__pt_dashboard__",
  PROGRAMME:  "__pt_programme__",
  CHECKIN:    "__pt_checkin__",
  NUTRITION:  "__pt_nutrition__",
  LIBRARY:    "__pt_library__",
} as const;

// ─── Teacher Planning OS tab IDs ─────────────────────────────────────────────
export const TEACHER_TABS = {
  DASHBOARD:    "__teacher_dashboard__",
  YEAR_PLANNER: "__teacher_year_planner__",
  LESSONS:      "__teacher_lessons__",
  REPORTS:      "__teacher_reports__",
  ASSESSMENTS:  "__teacher_assessments__",
  TASKS:        "__teacher_tasks__",
  KEY_DATES:    "__teacher_key_dates__",
  LIBRARY:      "__teacher_library__",
} as const;

// ─── Author & Book Writing OS tab IDs ────────────────────────────────────────
export const AUTHOR_TABS = {
  DASHBOARD:  "__author_dashboard__",
  OUTLINE:    "__author_outline__",
  CHARACTERS: "__author_characters__",
  SCENE:      "__author_scene__",
  COVER:      "__author_cover__",
  LIBRARY:    "__author_library__",
} as const;

// ─── Nail Tech & Beauty Business Planner tab IDs ─────────────────────────────
export const NAIL_TABS = {
  DASHBOARD:  "__nail_dashboard__",
  PLAN:       "__nail_plan__",
  PRICING:    "__nail_pricing__",
  COMPLIANCE: "__nail_compliance__",
} as const;

// ─── STR Guidebook & Welcome Portal tab IDs ──────────────────────────────────
export const STR_TABS = {
  DASHBOARD:   "__str_dashboard__",
  GUIDEBOOK:   "__str_guidebook__",
  WELCOME_PACK: "__str_welcome_pack__",
  GUEST_COMMS: "__str_guest_comms__",
} as const;

// ─── Etsy Shop Manager tab IDs ───────────────────────────────────────────────
export const ETSY_TABS = {
  DASHBOARD:      "__etsy_dashboard__",
  LISTING_WRITER: "__etsy_listing_writer__",
  FINANCIALS:     "__etsy_financials__",
  REVIEWS:        "__etsy_reviews__",
} as const;

// ─── Food Business Plan tab IDs ──────────────────────────────────────────────
export const FD_TABS = {
  DASHBOARD:   "__fd_dashboard__",
  PLAN:        "__fd_plan__",
  FINANCIALS:  "__fd_financials__",
  COMPLIANCE:  "__fd_compliance__",
} as const;

// ─── Side Hustle Business Plan tab IDs ───────────────────────────────────────
export const SH_TABS = {
  DASHBOARD:  "__sh_dashboard__",
  PLAN:       "__sh_plan__",
  FINANCIALS: "__sh_financials__",
  MARKET:     "__sh_market__",
} as const;

// ─── Neurodivergent Wedding Planner tab IDs ──────────────────────────────────
export const NDW_TABS = {
  DASHBOARD:   "__ndw_dashboard__",
  SEATING:     "__ndw_seating__",
  DRAFT:       "__ndw_draft__",
  INVITATION:  "__ndw_invitation__",
  SPEECH:      "__ndw_speech__",
  HONEYMOON:   "__ndw_honeymoon__",
  VENDOR_DUMP: "__ndw_vendor_dump__",
  FOCUS:       "__ndw_focus__",
  BREAKDOWN:   "__ndw_breakdown__",
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

// ─── Project HQ accent ───────────────────────────────────────────────────────
const PROJECT_MANAGER_ACCENT: NicheAccent = {
  hex:            "#4f46e5",
  fgActive:       "#3730a3",
  fgHeader:       "#1e1b4b",
  bgActive:       "rgba(79,70,229,0.10)",
  bgHover:        "rgba(79,70,229,0.05)",
  bgGroupHeader:  "rgba(79,70,229,0.06)",
  borderTop:      "1px solid rgba(79,70,229,0.15)",
};

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

  // ── Project HQ ───────────────────────────────────────────────────────────
  {
    nicheId:       "project-manager",
    displayName:   "Project HQ",
    virtualTabIds: new Set(Object.values(PROJECT_MANAGER_TABS)),
    defaultTabId:  PROJECT_MANAGER_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent:        PROJECT_MANAGER_ACCENT,
    sidebarEmoji:  "🗂️",
    topTabs: [
      { tabId: PROJECT_MANAGER_TABS.DASHBOARD, label: "Dashboard", icon: "🏠", appOnly: true },
    ],
    afterDbNamePattern: /^tasks$/i,
    afterDbTabs: [
      { tabId: PROJECT_MANAGER_TABS.APPLY_TEMPLATES, label: "Apply Templates", icon: "📋", appOnly: true },
      { tabId: PROJECT_MANAGER_TABS.FOCUS_MODE,      label: "Focus Mode",       icon: "🎯", appOnly: true },
      { tabId: PROJECT_MANAGER_TABS.TASK_BREAKDOWN,  label: "Task Breakdown",   icon: "🔨", appOnly: true },
    ],
  },

  // ── Pinterest Poster ─────────────────────────────────────────────────────
  {
    nicheId:       "pinterest-poster",
    displayName:   "Pinterest Poster",
    virtualTabIds: new Set(Object.values(PINTEREST_TABS)),
    defaultTabId:  PINTEREST_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#e60023",
      fgActive:      "#ad081b",
      fgHeader:      "#6f0110",
      bgActive:      "rgba(230,0,35,0.10)",
      bgHover:       "rgba(230,0,35,0.05)",
      bgGroupHeader: "rgba(230,0,35,0.06)",
      borderTop:     "1px solid rgba(230,0,35,0.15)",
    },
    sidebarEmoji: "📌",
    topTabs: [
      { tabId: PINTEREST_TABS.DASHBOARD,  label: "Dashboard",   icon: "🏠", appOnly: true },
      { tabId: PINTEREST_TABS.CREATE_PIN, label: "Create Pin",  icon: "✏️", appOnly: true },
    ],
  },

  // ── Neurodivergent Life OS ───────────────────────────────────────────────
  {
    nicheId:       "neurodivergent",
    displayName:   "Neurodivergent Life OS",
    virtualTabIds: new Set(Object.values(NEURODIVERGENT_TABS)),
    defaultTabId:  NEURODIVERGENT_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#0d9488",
      fgActive:      "#0f766e",
      fgHeader:      "#134e4a",
      bgActive:      "rgba(13,148,136,0.10)",
      bgHover:       "rgba(13,148,136,0.05)",
      bgGroupHeader: "rgba(13,148,136,0.06)",
      borderTop:     "1px solid rgba(13,148,136,0.15)",
    },
    sidebarEmoji: "🧠",
    topTabs: [
      { tabId: NEURODIVERGENT_TABS.DASHBOARD, label: "Dashboard", icon: "🏠", appOnly: true },
    ],
    afterDbNamePattern: /^tasks$/i,
    afterDbTabs: [
      { tabId: NEURODIVERGENT_TABS.FOCUS,     label: "What can I do?",  icon: "⚡", appOnly: true },
      { tabId: NEURODIVERGENT_TABS.BRAIN_DUMP, label: "Brain Dump",     icon: "🌀", appOnly: true },
      { tabId: NEURODIVERGENT_TABS.BREAKDOWN,  label: "Break It Down",  icon: "🔨", appOnly: true },
    ],
  },

  // ── Neurodivergent Wedding Planner ───────────────────────────────────────
  {
    nicheId:       "neurodivergent-wedding",
    displayName:   "ND Wedding Planner",
    virtualTabIds: new Set(Object.values(NDW_TABS)),
    defaultTabId:  NDW_TABS.DASHBOARD,
    hiddenDbIds:   ["honeymoon"],
    accent: {
      hex:           "#7c3aed",
      fgActive:      "#6d28d9",
      fgHeader:      "#3b0764",
      bgActive:      "rgba(124,58,237,0.10)",
      bgHover:       "rgba(124,58,237,0.05)",
      bgGroupHeader: "rgba(124,58,237,0.06)",
      borderTop:     "1px solid rgba(124,58,237,0.15)",
    },
    sidebarEmoji: "💜",
    topTabs: [
      { tabId: NDW_TABS.DASHBOARD, label: "Dashboard", icon: "🏠", appOnly: true },
    ],
    afterDbNamePattern: /planning\s*(timetable|timeline)/i,
    afterDbTabs: [
      { tabId: NDW_TABS.FOCUS,       label: "What can I do?",   icon: "⚡", appOnly: true },
      { tabId: NDW_TABS.VENDOR_DUMP, label: "Vendor Brain Dump", icon: "🌀", appOnly: true },
      { tabId: NDW_TABS.BREAKDOWN,   label: "Break It Down",     icon: "🔨", appOnly: true },
      { tabId: NDW_TABS.SEATING,     label: "Seating Planner",   icon: "🪑", appOnly: true },
      { tabId: NDW_TABS.DRAFT,       label: "Draft Letters",     icon: "✍️", appOnly: true, requiresDbId: "documents" },
      { tabId: NDW_TABS.INVITATION,  label: "Invitation Canvas", icon: "🎨", appOnly: true },
      { tabId: NDW_TABS.SPEECH,      label: "AI Speech Writer",  icon: "🎤", appOnly: true },
      { tabId: NDW_TABS.HONEYMOON,   label: "Honeymoon Planner", icon: "🌴", appOnly: true },
    ],
    dbPropertyInjections: {
      documents: [{ id: "Email", name: "Email", type: "email" }],
    },
    savedResearchDbIds: ["documents"],
  },

  // ── Side Hustle Business Plan ────────────────────────────────────────────
  {
    nicheId:       "side-hustle",
    displayName:   "Side Hustle Business Plan",
    virtualTabIds: new Set(Object.values(SH_TABS)),
    defaultTabId:  SH_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#f97316",
      fgActive:      "#ea580c",
      fgHeader:      "#7c2d12",
      bgActive:      "rgba(249,115,22,0.10)",
      bgHover:       "rgba(249,115,22,0.05)",
      bgGroupHeader: "rgba(249,115,22,0.06)",
      borderTop:     "1px solid rgba(249,115,22,0.15)",
    },
    sidebarEmoji: "🚀",
    topTabs: [
      { tabId: SH_TABS.DASHBOARD,  label: "Dashboard",          icon: "🏠", appOnly: true },
      { tabId: SH_TABS.PLAN,       label: "Plan Builder",        icon: "✍️", appOnly: true },
      { tabId: SH_TABS.FINANCIALS, label: "Financial Projector", icon: "📊", appOnly: true },
      { tabId: SH_TABS.MARKET,     label: "Market Analyser",     icon: "🔍", appOnly: true },
    ],
  },

  // ── Food Business Plan ──────────────────────────────────────────────────────
  {
    nicheId:       "food-business",
    displayName:   "Food Business Plan",
    virtualTabIds: new Set(Object.values(FD_TABS)),
    defaultTabId:  FD_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#dc2626",
      fgActive:      "#b91c1c",
      fgHeader:      "#450a0a",
      bgActive:      "rgba(220,38,38,0.10)",
      bgHover:       "rgba(220,38,38,0.05)",
      bgGroupHeader: "rgba(220,38,38,0.06)",
      borderTop:     "1px solid rgba(220,38,38,0.15)",
    },
    sidebarEmoji: "🍽️",
    topTabs: [
      { tabId: FD_TABS.DASHBOARD,  label: "Dashboard",          icon: "🏠", appOnly: true },
      { tabId: FD_TABS.PLAN,       label: "Plan Builder",        icon: "✍️", appOnly: true },
      { tabId: FD_TABS.FINANCIALS, label: "Financial Projector", icon: "📊", appOnly: true },
      { tabId: FD_TABS.COMPLIANCE, label: "Compliance",          icon: "✅", appOnly: true },
    ],
  },

  // ── Content Creator OS ─────────────────────────────────────────────────────
  {
    nicheId:       "content-creator",
    displayName:   "Content Creator OS",
    virtualTabIds: new Set(Object.values(CC_TABS)),
    defaultTabId:  CC_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#6366f1",
      fgActive:      "#4f46e5",
      fgHeader:      "#1e1b4b",
      bgActive:      "rgba(99,102,241,0.10)",
      bgHover:       "rgba(99,102,241,0.05)",
      bgGroupHeader: "rgba(99,102,241,0.06)",
      borderTop:     "1px solid rgba(99,102,241,0.15)",
    },
    sidebarEmoji: "🎬",
    topTabs: [
      { tabId: CC_TABS.DASHBOARD, label: "Dashboard",      icon: "🏠", appOnly: true },
      { tabId: CC_TABS.IDEAS,     label: "Idea Generator", icon: "💡", appOnly: true },
      { tabId: CC_TABS.SCRIPT,    label: "Script Writer",  icon: "✍️", appOnly: true },
      { tabId: CC_TABS.CAPTION,   label: "Caption Writer", icon: "🖊️", appOnly: true },
    ],
  },

  // ── Etsy Shop Manager ────────────────────────────────────────────────────
  {
    nicheId:       "etsy-shop",
    displayName:   "Etsy Shop Manager",
    virtualTabIds: new Set(Object.values(ETSY_TABS)),
    defaultTabId:  ETSY_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#f1641e",
      fgActive:      "#c2410c",
      fgHeader:      "#7c2d12",
      bgActive:      "rgba(241,100,30,0.10)",
      bgHover:       "rgba(241,100,30,0.05)",
      bgGroupHeader: "rgba(241,100,30,0.06)",
      borderTop:     "1px solid rgba(241,100,30,0.15)",
    },
    sidebarEmoji: "🛍️",
    topTabs: [
      { tabId: ETSY_TABS.DASHBOARD,      label: "Dashboard",       icon: "🏠", appOnly: true },
      { tabId: ETSY_TABS.LISTING_WRITER, label: "Listing Writer",  icon: "✍️", appOnly: true },
      { tabId: ETSY_TABS.FINANCIALS,     label: "Finance Tracker", icon: "📊", appOnly: true },
      { tabId: ETSY_TABS.REVIEWS,        label: "Review Manager",  icon: "⭐", appOnly: true },
    ],
  },

  // ── Cake Business Planner ────────────────────────────────────────────────────
  {
    nicheId:       "cake-business",
    displayName:   "Cake Business Planner",
    virtualTabIds: new Set(Object.values(CAKE_TABS)),
    defaultTabId:  CAKE_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#db2777",
      fgActive:      "#be185d",
      fgHeader:      "#500724",
      bgActive:      "rgba(219,39,119,0.10)",
      bgHover:       "rgba(219,39,119,0.05)",
      bgGroupHeader: "rgba(219,39,119,0.06)",
      borderTop:     "1px solid rgba(219,39,119,0.15)",
    },
    sidebarEmoji: "🎂",
    topTabs: [
      { tabId: CAKE_TABS.DASHBOARD,  label: "Dashboard",            icon: "🏠", appOnly: true },
      { tabId: CAKE_TABS.PLAN,       label: "Plan Builder",          icon: "✍️", appOnly: true },
      { tabId: CAKE_TABS.PRICING,    label: "Pricing & Financials",  icon: "🎂", appOnly: true },
      { tabId: CAKE_TABS.COMPLIANCE, label: "Compliance",            icon: "✅", appOnly: true },
    ],
  },

  // ── STR Guidebook & Welcome Portal ──────────────────────────────────────────
  {
    nicheId:       "str-guidebook",
    displayName:   "STR Guidebook & Welcome Portal",
    virtualTabIds: new Set(Object.values(STR_TABS)),
    defaultTabId:  STR_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#0891b2",
      fgActive:      "#0e7490",
      fgHeader:      "#164e63",
      bgActive:      "rgba(8,145,178,0.10)",
      bgHover:       "rgba(8,145,178,0.05)",
      bgGroupHeader: "rgba(8,145,178,0.06)",
      borderTop:     "1px solid rgba(8,145,178,0.15)",
    },
    sidebarEmoji: "🏡",
    topTabs: [
      { tabId: STR_TABS.DASHBOARD,    label: "Dashboard",      icon: "🏠", appOnly: true },
      { tabId: STR_TABS.GUIDEBOOK,    label: "Guidebook",      icon: "📖", appOnly: true },
      { tabId: STR_TABS.WELCOME_PACK, label: "Welcome Pack",   icon: "💌", appOnly: true },
      { tabId: STR_TABS.GUEST_COMMS,  label: "Guest Messages", icon: "💬", appOnly: true },
    ],
  },

  // ── Nail Tech & Beauty Business Planner ─────────────────────────────────────
  {
    nicheId:       "nail-tech",
    displayName:   "Nail Tech & Beauty Planner",
    virtualTabIds: new Set(Object.values(NAIL_TABS)),
    defaultTabId:  NAIL_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#c026d3",
      fgActive:      "#a21caf",
      fgHeader:      "#4a044e",
      bgActive:      "rgba(192,38,211,0.10)",
      bgHover:       "rgba(192,38,211,0.05)",
      bgGroupHeader: "rgba(192,38,211,0.06)",
      borderTop:     "1px solid rgba(192,38,211,0.15)",
    },
    sidebarEmoji: "💅",
    topTabs: [
      { tabId: NAIL_TABS.DASHBOARD,  label: "Dashboard",            icon: "🏠", appOnly: true },
      { tabId: NAIL_TABS.PLAN,       label: "Plan Builder",          icon: "✍️", appOnly: true },
      { tabId: NAIL_TABS.PRICING,    label: "Pricing & Financials",  icon: "💅", appOnly: true },
      { tabId: NAIL_TABS.COMPLIANCE, label: "Compliance",            icon: "✅", appOnly: true },
    ],
  },

  // ── Author & Book Writing OS ────────────────────────────────────────────────
  {
    nicheId:       "author",
    displayName:   "Author & Book Writing OS",
    virtualTabIds: new Set(Object.values(AUTHOR_TABS)),
    defaultTabId:  AUTHOR_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#d97706",
      fgActive:      "#b45309",
      fgHeader:      "#78350f",
      bgActive:      "rgba(217,119,6,0.10)",
      bgHover:       "rgba(217,119,6,0.05)",
      bgGroupHeader: "rgba(217,119,6,0.06)",
      borderTop:     "1px solid rgba(217,119,6,0.15)",
    },
    sidebarEmoji: "📖",
    topTabs: [
      { tabId: AUTHOR_TABS.DASHBOARD,  label: "Dashboard",        icon: "🏠", appOnly: true },
      { tabId: AUTHOR_TABS.OUTLINE,    label: "Story Planner",    icon: "📜", appOnly: true },
      { tabId: AUTHOR_TABS.CHARACTERS, label: "Character Builder", icon: "🧑‍🎨", appOnly: true },
      { tabId: AUTHOR_TABS.SCENE,      label: "Scene Writer",     icon: "✍️", appOnly: true },
      { tabId: AUTHOR_TABS.COVER,      label: "Cover Studio",     icon: "🎨", appOnly: true },
      { tabId: AUTHOR_TABS.LIBRARY,    label: "My Library",       icon: "📚", appOnly: true },
    ],
  },

  // ── Teacher Planning OS ──────────────────────────────────────────────────
  {
    nicheId:       "teacher",
    displayName:   "Teacher Planning OS",
    virtualTabIds: new Set(Object.values(TEACHER_TABS)),
    defaultTabId:  TEACHER_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#2563eb",
      fgActive:      "#1d4ed8",
      fgHeader:      "#1e3a8a",
      bgActive:      "rgba(37,99,235,0.10)",
      bgHover:       "rgba(37,99,235,0.05)",
      bgGroupHeader: "rgba(37,99,235,0.06)",
      borderTop:     "1px solid rgba(37,99,235,0.15)",
    },
    sidebarEmoji: "🏫",
    topTabs: [
      { tabId: TEACHER_TABS.DASHBOARD,    label: "Dashboard",       icon: "🏠", appOnly: true },
      { tabId: TEACHER_TABS.YEAR_PLANNER,label: "Year Planner",    icon: "📅", appOnly: true },
      { tabId: TEACHER_TABS.LESSONS,     label: "Lesson Planner",  icon: "📋", appOnly: true },
      { tabId: TEACHER_TABS.REPORTS,     label: "Report Writer",   icon: "📝", appOnly: true },
      { tabId: TEACHER_TABS.ASSESSMENTS, label: "Assessments",     icon: "📊", appOnly: true },
      { tabId: TEACHER_TABS.TASKS,       label: "Tasks",           icon: "✅", appOnly: true },
      { tabId: TEACHER_TABS.KEY_DATES,   label: "Key Dates",       icon: "📌", appOnly: true },
      { tabId: TEACHER_TABS.LIBRARY,     label: "My Documents",    icon: "📁", appOnly: true },
    ],
  },

  // ── Freelancer OS ───────────────────────────────────────────────────────────
  {
    nicheId:       "freelancer",
    displayName:   "Freelancer OS",
    virtualTabIds: new Set(Object.values(FREELANCER_TABS)),
    defaultTabId:  FREELANCER_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#4f46e5",
      fgActive:      "#3730a3",
      fgHeader:      "#1e1b4b",
      bgActive:      "rgba(79,70,229,0.10)",
      bgHover:       "rgba(79,70,229,0.05)",
      bgGroupHeader: "rgba(79,70,229,0.06)",
      borderTop:     "1px solid rgba(79,70,229,0.15)",
    },
    sidebarEmoji: "💼",
    topTabs: [
      { tabId: FREELANCER_TABS.DASHBOARD, label: "Dashboard",       icon: "🏠", appOnly: true },
      { tabId: FREELANCER_TABS.PROPOSAL,  label: "Proposal Writer", icon: "📄", appOnly: true },
      { tabId: FREELANCER_TABS.INVOICE,   label: "Invoice Builder", icon: "🧾", appOnly: true },
      { tabId: FREELANCER_TABS.OUTREACH,  label: "Outreach Writer", icon: "📧", appOnly: true },
      { tabId: FREELANCER_TABS.LIBRARY,   label: "My Documents",    icon: "📁", appOnly: true },
    ],
  },

  // ── Personal Trainer Business OS ────────────────────────────────────────────
  {
    nicheId:       "personal-trainer",
    displayName:   "Personal Trainer Business OS",
    virtualTabIds: new Set(Object.values(PT_TABS)),
    defaultTabId:  PT_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#16a34a",
      fgActive:      "#15803d",
      fgHeader:      "#14532d",
      bgActive:      "rgba(22,163,74,0.10)",
      bgHover:       "rgba(22,163,74,0.05)",
      bgGroupHeader: "rgba(22,163,74,0.06)",
      borderTop:     "1px solid rgba(22,163,74,0.15)",
    },
    sidebarEmoji: "💪",
    topTabs: [
      { tabId: PT_TABS.DASHBOARD,  label: "Dashboard",          icon: "🏠", appOnly: true },
      { tabId: PT_TABS.PROGRAMME,  label: "Programme Builder",  icon: "📋", appOnly: true },
      { tabId: PT_TABS.CHECKIN,    label: "Client Check-In",    icon: "✅", appOnly: true },
      { tabId: PT_TABS.NUTRITION,  label: "Nutrition Guide",    icon: "🥗", appOnly: true },
      { tabId: PT_TABS.LIBRARY,    label: "My Documents",       icon: "📁", appOnly: true },
    ],
  },

  // ── Vibe Coder OS ───────────────────────────────────────────────────────────
  {
    nicheId:       "vibe-coder",
    displayName:   "Vibe Coder OS",
    virtualTabIds: new Set(Object.values(VIBE_CODER_TABS)),
    defaultTabId:  VIBE_CODER_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#84cc16",
      fgActive:      "#65a30d",
      fgHeader:      "#3f6212",
      bgActive:      "rgba(132,204,22,0.12)",
      bgHover:       "rgba(132,204,22,0.06)",
      bgGroupHeader: "rgba(132,204,22,0.06)",
      borderTop:     "1px solid rgba(132,204,22,0.20)",
    },
    sidebarEmoji: "💻",
    topTabs: [
      { tabId: VIBE_CODER_TABS.DASHBOARD, label: "Dashboard",       icon: "🏠", appOnly: true },
      { tabId: VIBE_CODER_TABS.SCORE,     label: "Idea Scorer",     icon: "⚡", appOnly: true },
      { tabId: VIBE_CODER_TABS.PLAN,      label: "Project Planner", icon: "🔨", appOnly: true },
      { tabId: VIBE_CODER_TABS.LAUNCH,    label: "Launch Kit",      icon: "🚀", appOnly: true },
      { tabId: VIBE_CODER_TABS.LIBRARY,   label: "My Documents",    icon: "📁", appOnly: true },
    ],
  },

  // ── Podcast OS ──────────────────────────────────────────────────────────────
  {
    nicheId:       "podcast",
    displayName:   "Podcast OS",
    virtualTabIds: new Set(Object.values(PODCAST_TABS)),
    defaultTabId:  PODCAST_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#7c3aed",
      fgActive:      "#6d28d9",
      fgHeader:      "#3b0764",
      bgActive:      "rgba(124,58,237,0.10)",
      bgHover:       "rgba(124,58,237,0.05)",
      bgGroupHeader: "rgba(124,58,237,0.06)",
      borderTop:     "1px solid rgba(124,58,237,0.15)",
    },
    sidebarEmoji: "🎙️",
    topTabs: [
      { tabId: PODCAST_TABS.DASHBOARD,  label: "Dashboard",           icon: "🏠", appOnly: true },
      { tabId: PODCAST_TABS.EPISODE,    label: "Episode Planner",     icon: "📋", appOnly: true },
      { tabId: PODCAST_TABS.SHOW_NOTES, label: "Show Notes",          icon: "📝", appOnly: true },
      { tabId: PODCAST_TABS.OUTREACH,   label: "Guest Outreach",      icon: "📧", appOnly: true },
      { tabId: PODCAST_TABS.TRANSCRIPT, label: "Transcript Summary",  icon: "🎧", appOnly: true },
      { tabId: PODCAST_TABS.LIBRARY,    label: "My Documents",        icon: "📁", appOnly: true },
    ],
  },

  // ── Amazon FBA Seller OS ────────────────────────────────────────────────────
  {
    nicheId:       "amazon-fba",
    displayName:   "Amazon FBA Seller OS",
    virtualTabIds: new Set(Object.values(FBA_TABS)),
    defaultTabId:  FBA_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#ea580c",
      fgActive:      "#c2410c",
      fgHeader:      "#7c2d12",
      bgActive:      "rgba(234,88,12,0.10)",
      bgHover:       "rgba(234,88,12,0.05)",
      bgGroupHeader: "rgba(234,88,12,0.06)",
      borderTop:     "1px solid rgba(234,88,12,0.15)",
    },
    sidebarEmoji: "📦",
    topTabs: [
      { tabId: FBA_TABS.DASHBOARD, label: "Dashboard",       icon: "🏠", appOnly: true },
      { tabId: FBA_TABS.RESEARCH,  label: "Product Research", icon: "🔍", appOnly: true },
      { tabId: FBA_TABS.LISTING,   label: "Listing Writer",   icon: "✍️", appOnly: true },
      { tabId: FBA_TABS.SUPPLIER,  label: "Supplier Brief",   icon: "📋", appOnly: true },
      { tabId: FBA_TABS.LIBRARY,   label: "My Documents",     icon: "📁", appOnly: true },
    ],
  },

  // ── Keto OS ─────────────────────────────────────────────────────────────────
  {
    nicheId:       "keto",
    displayName:   "Keto OS",
    virtualTabIds: new Set(Object.values(KETO_TABS)),
    defaultTabId:  KETO_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#059669",
      fgActive:      "#047857",
      fgHeader:      "#064e3b",
      bgActive:      "rgba(5,150,105,0.10)",
      bgHover:       "rgba(5,150,105,0.05)",
      bgGroupHeader: "rgba(5,150,105,0.06)",
      borderTop:     "1px solid rgba(5,150,105,0.15)",
    },
    sidebarEmoji: "🥑",
    topTabs: [
      { tabId: KETO_TABS.DASHBOARD, label: "Dashboard",        icon: "🏠", appOnly: true },
      { tabId: KETO_TABS.PLANNER,   label: "Meal Planner",     icon: "📅", appOnly: true },
      { tabId: KETO_TABS.ANALYSER,  label: "Recipe Analyser",  icon: "🔬", appOnly: true },
      { tabId: KETO_TABS.MACROS,    label: "Macro Calculator", icon: "📊", appOnly: true },
      { tabId: KETO_TABS.MY_MEALS,    label: "My Meals",           icon: "🍽️", appOnly: true },
      { tabId: KETO_TABS.INGREDIENTS, label: "What Can I Make?",   icon: "🥘", appOnly: true },
    ],
  },

  // ── Neurodivergent Family OS ─────────────────────────────────────────────────
  {
    nicheId:       "send-parent",
    displayName:   "Neurodivergent Family OS",
    virtualTabIds: new Set(Object.values(SEND_TABS)),
    defaultTabId:  SEND_TABS.DASHBOARD,
    hiddenDbIds:   [],
    accent: {
      hex:           "#8b5cf6",
      fgActive:      "#6d28d9",
      fgHeader:      "#4c1d95",
      bgActive:      "rgba(139,92,246,0.10)",
      bgHover:       "rgba(139,92,246,0.05)",
      bgGroupHeader: "rgba(139,92,246,0.06)",
      borderTop:     "1px solid rgba(139,92,246,0.15)",
    },
    sidebarEmoji: "💜",
    topTabs: [
      { tabId: SEND_TABS.DASHBOARD,    label: "Dashboard",    icon: "🏠", appOnly: true },
      { tabId: SEND_TABS.APPOINTMENTS, label: "Appointments", icon: "📋", appOnly: true },
      { tabId: SEND_TABS.BEHAVIOUR,    label: "Behaviour Log", icon: "📊", appOnly: true },
      { tabId: SEND_TABS.EHCP,         label: "EHCP Builder", icon: "📄", appOnly: true },
      { tabId: SEND_TABS.LETTERS,      label: "Letter Writer", icon: "✉️", appOnly: true },
      { tabId: SEND_TABS.DOCUMENTS,    label: "Documents",    icon: "🗂️", appOnly: true },
    ],
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
