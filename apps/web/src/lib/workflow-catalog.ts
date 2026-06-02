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
  {
    id: "neurodivergent",
    name: "Neurodivergent Life OS",
    emoji: "🧠",
    tagline: "Work with your brain, not against it.",
    description:
      "A low-friction workspace for ADHD and autistic brains. Capture thoughts before they vanish, find tasks that match your current energy, and build habits without shame spirals.",
  },
  {
    id: "side-hustle",
    name: "Side Hustle Business Plan",
    emoji: "🚀",
    tagline: "Turn your side hustle into a real business — AI builds your plan, financials and market research.",
    description:
      "Stop staring at a blank business plan. Answer a few questions and the AI writes your executive summary, market analysis, business model and more. Plus: a 12-month financial projector and competitor map — ready for a bank loan, investor pitch, or just getting serious.",
  },
  {
    id: "neurodivergent-wedding",
    name: "ND Wedding Planner",
    emoji: "💜",
    tagline: "Plan your wedding at your own pace, one energy level at a time.",
    description:
      "Everything the Wedding Planner has, built for neurodivergent couples. Filter planning tasks by energy level, dump vendor thoughts and let AI sort them, break overwhelming tasks into tiny steps, and use seating, draft letters, speeches and honeymoon planning — all in one place.",
  },
  {
    id: "food-business",
    name: "Food Business Plan",
    emoji: "🍽️",
    tagline: "Build your complete food business plan — AI writes it, projects your P&L and generates your compliance checklist.",
    description:
      "Everything you need to open or grow a food business. AI writes your full business plan (executive summary, market analysis, operations, financials, food safety), projects a 12-month P&L with food-specific cost model (food cost %, labour %, fixed costs), and generates a tailored compliance checklist — every licence, registration and certificate you need to trade legally.",
  },
  {
    id: "content-creator",
    name: "Content Creator OS",
    emoji: "🎬",
    tagline: "Generate ideas, write scripts and captions with AI — and run your whole creator business in one place.",
    description:
      "Everything a creator needs in one workspace. Generate high-performing content ideas with hooks and angles. Write full scripts, threads, podcast outlines and blog posts tailored to your platform. Create optimised captions and hashtags with one click. Track your content calendar, brand deals and monthly analytics — all without leaving Notion.",
  },
  {
    id: "etsy-shop",
    name: "Etsy Shop Manager",
    emoji: "🛍️",
    tagline: "Run your Etsy shop like a pro — AI writes SEO listings, tracks your real profit and generates review replies.",
    description:
      "Everything an Etsy seller needs in one place. AI writes SEO-optimised titles, descriptions and 13 tags for any listing. A finance tracker applies Etsy's real fee model (6.5% transaction + 3% payment processing + $0.20/listing) to project your true profit. A review reply generator writes personalised replies for 5-star praise and 1-star complaints alike — helping your shop rank higher in Etsy search.",
  },
] as const;

export type WorkflowCatalogItem = (typeof WORKFLOW_CATALOG)[number];
export type WorkflowId = WorkflowCatalogItem["id"];

export function getWorkflowById(id: string): WorkflowCatalogItem | undefined {
  return WORKFLOW_CATALOG.find((w) => w.id === id);
}
