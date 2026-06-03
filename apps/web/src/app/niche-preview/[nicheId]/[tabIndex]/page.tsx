import { notFound } from "next/navigation";
import { WORKFLOW_CATALOG } from "@/lib/workflow-catalog";

// Accent colours per niche (matches niche-registry.ts)
const NICHE_ACCENTS: Record<string, string> = {
  "wedding-planner":       "#be185d",
  "rainbow":               "#e11d7a",
  "project-manager":       "#4f46e5",
  "pinterest-poster":      "#e11d48",
  "neurodivergent":        "#0d9488",
  "side-hustle":           "#ea580c",
  "neurodivergent-wedding":"#7c3aed",
  "food-business":         "#16a34a",
  "content-creator":       "#0284c7",
  "etsy-shop":             "#f59e0b",
  "cake-business":         "#db2777",
  "str-guidebook":         "#0891b2",
  "nail-tech":             "#c026d3",
};

// Tab labels per niche
const NICHE_TABS: Record<string, string[]> = {
  "wedding-planner":       ["Dashboard", "Seating Chart", "Draft Letters", "Invitation Canvas", "Speech Writer", "Honeymoon Planner"],
  "rainbow":               ["Dashboard", "Seating Chart", "Draft Letters", "Invitation Canvas", "Speech Writer", "Honeymoon Planner"],
  "project-manager":       ["Dashboard", "Apply Templates", "Focus Mode", "Task Breakdown"],
  "pinterest-poster":      ["Dashboard", "Create Pin"],
  "neurodivergent":        ["Dashboard", "Brain Dump", "What Can I Do?", "Break It Down"],
  "side-hustle":           ["Dashboard", "Business Plan", "Financials", "Market Research"],
  "neurodivergent-wedding":["Dashboard", "Seating Chart", "Draft Letters", "Invitation Canvas", "Speech Writer", "Honeymoon Planner"],
  "food-business":         ["Dashboard", "Business Plan", "Financials", "Compliance"],
  "content-creator":       ["Dashboard", "Idea Generator", "Script Writer", "Caption Tool"],
  "etsy-shop":             ["Dashboard", "Listing Writer", "Finance Tracker", "Review Replies"],
  "cake-business":         ["Dashboard", "Business Plan", "Pricing Calculator", "Compliance"],
  "str-guidebook":         ["Dashboard", "Guidebook Builder", "Welcome Pack", "Guest Comms"],
  "nail-tech":             ["Dashboard", "Business Plan", "Pricing Calculator", "Compliance"],
};

// Tab descriptions for the preview screenshot
const TAB_DESCRIPTIONS: Record<string, Record<number, { heading: string; bullets: string[] }>> = {
  "wedding-planner": {
    0: { heading: "Your wedding at a glance", bullets: ["AI vendor search — find florists, venues, caterers fast", "Live guest list with RSVP tracking", "Budget tracker with category breakdown", "Countdown timer to your big day"] },
    1: { heading: "Interactive seating chart", bullets: ["Drag guests to tables visually", "AI suggests seating based on relationships", "Export as PDF to share with venue", "Handle plus-ones and dietary needs"] },
    2: { heading: "AI draft letters", bullets: ["Thank-you notes in your tone of voice", "Vendor enquiry emails auto-drafted", "RSVP follow-up messages in one click", "Edit before sending — full control"] },
  },
  "neurodivergent": {
    0: { heading: "Work with your brain, not against it", bullets: ["Energy check-in surfaces the right tasks", "Low-friction capture before thoughts vanish", "No guilt, no pressure — just momentum", "Tailored to ADHD and autistic brains"] },
    1: { heading: "Brain Dump — AI sorts everything", bullets: ["Type anything, AI categorises automatically", "Tasks, habits, ideas and feelings all handled", "Energy level tagged per item", "Nothing slips through the cracks"] },
    2: { heading: "What can I do right now?", bullets: ["Filter by your current energy level", "Context filter: home, office, 5 minutes, quiet", "AI picks the best-fit task for this moment", "No decision fatigue — just start"] },
  },
};

function getTabDescription(nicheId: string, tabIndex: number) {
  const byNiche = TAB_DESCRIPTIONS[nicheId];
  if (byNiche?.[tabIndex]) return byNiche[tabIndex];

  // Generic fallback for any tab
  const tabs = NICHE_TABS[nicheId] ?? [];
  const tabName = tabs[tabIndex] ?? "Feature";
  return {
    heading: tabName,
    bullets: [
      "AI-powered — no manual work required",
      "Results in seconds, not hours",
      "Built specifically for this workflow",
      "Works entirely inside your browser",
    ],
  };
}

export default function NichePreviewPage({
  params,
  searchParams,
}: {
  params: { nicheId: string; tabIndex: string };
  searchParams: { accent?: string };
}) {
  const { nicheId, tabIndex } = params;
  const tabIdx = parseInt(tabIndex, 10);

  const niche = WORKFLOW_CATALOG.find((w) => w.id === nicheId);
  if (!niche) notFound();

  // Query param overrides the default — allows per-screenshot colour control
  const accent = searchParams.accent ?? NICHE_ACCENTS[nicheId] ?? "#6366f1";
  const tabs = NICHE_TABS[nicheId] ?? [];
  const activeTab = tabs[tabIdx] ?? tabs[0] ?? "Dashboard";
  const { heading, bullets } = getTabDescription(nicheId, tabIdx);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=1280" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f11; color: #f4f4f5; width: 1280px; height: 800px; overflow: hidden; }
          .layout { display: flex; height: 800px; }
          .sidebar { width: 220px; background: #18181b; border-right: 1px solid #27272a; padding: 20px 0; display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
          .sidebar-header { padding: 0 16px 16px; border-bottom: 1px solid #27272a; margin-bottom: 8px; }
          .sidebar-brand { font-size: 13px; font-weight: 700; color: #f4f4f5; letter-spacing: -0.3px; }
          .sidebar-niche { font-size: 11px; color: #71717a; margin-top: 2px; }
          .sidebar-tab { display: flex; align-items: center; gap: 8px; padding: 7px 16px; font-size: 13px; cursor: pointer; border-radius: 0; color: #a1a1aa; transition: background 0.1s; }
          .sidebar-tab.active { background: color-mix(in srgb, VAR_ACCENT 15%, transparent); color: VAR_ACCENT; font-weight: 600; border-left: 2px solid VAR_ACCENT; }
          .sidebar-tab:not(.active):hover { background: #27272a; }
          .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
          .topbar { display: flex; align-items: center; gap: 12px; padding: 14px 24px; border-bottom: 1px solid #27272a; background: #0f0f11; }
          .topbar-tab { font-size: 13px; font-weight: 600; color: VAR_ACCENT; border-bottom: 2px solid VAR_ACCENT; padding-bottom: 2px; }
          .content { flex: 1; padding: 32px 32px; overflow: hidden; }
          .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 28px 32px; }
          .card-heading { font-size: 22px; font-weight: 700; margin-bottom: 20px; color: #f4f4f5; }
          .bullet-list { list-style: none; display: flex; flex-direction: column; gap: 12px; }
          .bullet-item { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #a1a1aa; line-height: 1.5; }
          .bullet-dot { width: 8px; height: 8px; border-radius: 50%; background: VAR_ACCENT; margin-top: 5px; flex-shrink: 0; }
          .badge { display: inline-flex; align-items: center; gap: 6px; border: 1px solid; border-radius: 999px; padding: 4px 12px; font-size: 11px; font-weight: 600; margin-bottom: 16px; }
          .ai-chip { display: inline-flex; align-items: center; gap: 6px; background: color-mix(in srgb, VAR_ACCENT 12%, transparent); color: VAR_ACCENT; border: 1px solid color-mix(in srgb, VAR_ACCENT 30%, transparent); border-radius: 6px; padding: 5px 10px; font-size: 12px; font-weight: 600; margin-top: 20px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
          .mini-card { background: #1f1f23; border: 1px solid #27272a; border-radius: 8px; padding: 16px; }
          .mini-card-label { font-size: 11px; color: #52525b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
          .mini-card-value { font-size: 18px; font-weight: 700; color: VAR_ACCENT; }
          .mini-card-sub { font-size: 12px; color: #71717a; margin-top: 2px; }
          .stridivo-badge { position: absolute; bottom: 20px; right: 24px; font-size: 11px; color: #3f3f46; }
        `.replace(/VAR_ACCENT/g, accent)}
        </style>
      </head>
      <body>
        <div className="layout" style={{ display: "flex", height: "800px" }}>
          {/* Sidebar */}
          <div style={{ width: 220, background: "#18181b", borderRight: "1px solid #27272a", paddingTop: 20, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "0 16px 16px", borderBottom: "1px solid #27272a", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f4f5", letterSpacing: "-0.3px" }}>Stridivo</div>
              <div style={{ fontSize: 11, color: accent, marginTop: 2 }}>{niche.emoji} {niche.name}</div>
            </div>
            {tabs.map((tab, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 16px",
                  fontSize: 13,
                  color: i === tabIdx ? accent : "#a1a1aa",
                  fontWeight: i === tabIdx ? 600 : 400,
                  background: i === tabIdx ? `color-mix(in srgb, ${accent} 15%, transparent)` : "transparent",
                  borderLeft: i === tabIdx ? `2px solid ${accent}` : "2px solid transparent",
                }}
              >
                <span style={{ fontSize: 15 }}>{i === 0 ? niche.emoji : "·"}</span>
                {tab}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0f0f11", position: "relative" }}>
            {/* Topbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 24px", borderBottom: "1px solid #27272a" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 2 }}>
                {activeTab}
              </span>
              <span style={{ fontSize: 12, color: "#52525b", marginLeft: "auto" }}>
                {niche.name} — powered by AI
              </span>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: "32px 32px", overflow: "hidden" }}>
              {/* Badge */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
                borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 600,
                color: accent, marginBottom: 16,
                background: `color-mix(in srgb, ${accent} 8%, transparent)`,
              }}>
                ✦ AI-Powered
              </div>

              {/* Main card */}
              <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12, padding: "28px 32px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, color: "#f4f4f5" }}>
                  {heading}
                </div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                  {bullets.map((b, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#a1a1aa", lineHeight: 1.5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent, marginTop: 5, flexShrink: 0, display: "inline-block" }} />
                      {b}
                    </li>
                  ))}
                </ul>

                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: `color-mix(in srgb, ${accent} 12%, transparent)`,
                  color: accent,
                  border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
                  borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, marginTop: 20,
                }}>
                  ✦ AI ready — no setup required
                </div>
              </div>

              {/* Mini stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 }}>
                {[
                  { label: "Time saved", value: "4–6 hrs", sub: "vs doing manually" },
                  { label: "AI model", value: "Claude", sub: "Anthropic — state of the art" },
                  { label: "Setup time", value: "< 2 min", sub: "Connect and go" },
                ].map((stat) => (
                  <div key={stat.label} style={{ background: "#1f1f23", border: "1px solid #27272a", borderRadius: 8, padding: 16 }}>
                    <div style={{ fontSize: 11, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{stat.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: accent }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: "#71717a", marginTop: 2 }}>{stat.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ position: "absolute", bottom: 20, right: 24, fontSize: 11, color: "#3f3f46" }}>
              stridivo.com
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
