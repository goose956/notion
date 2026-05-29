"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_BLUE = "rgb(35,131,226)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

const FAQS: { section: string; items: { q: string; a: string }[] }[] = [
  {
    section: "Getting started",
    items: [
      {
        q: "What is Stridivo?",
        a: "Stridivo is an AI-powered research and workflow platform. It gives you a live AI research agent that searches the web, finds and scores results, drafts outreach emails, and saves everything directly into your Notion workspace — so you spend less time on grunt work and more time on decisions.",
      },
      {
        q: "What do I get on the free plan?",
        a: "Every new account starts with 25 free credits. You can use them across any feature — research queries, email drafts, seating calculations, and more. When you run out, you can top up via Etsy.",
      },
      {
        q: "How do I connect my Notion workspace?",
        a: "Go to Connections in the sidebar. Click 'Connect Notion', then authorise the integration in Notion's popup. Once connected, your databases will appear in the Workspace tab automatically. You only need to do this once.",
      },
    ],
  },
  {
    section: "Credits",
    items: [
      {
        q: "What are credits?",
        a: "Credits are consumed each time the AI performs a task — a research query, a web search, generating an email draft, and so on. Simple lookups use 1 credit; heavier research tasks (multiple searches, scoring, summarising) may use 2–3.",
      },
      {
        q: "How do I get more credits?",
        a: "Purchase a credit top-up through our Etsy shop. After your order is confirmed, credits are added to your account automatically within a few minutes. You can check your balance at any time in the Credits page (bottom of the sidebar).",
      },
      {
        q: "Do credits expire?",
        a: "No. Credits stay on your account until you use them — there is no expiry date.",
      },
    ],
  },
  {
    section: "Research assistant",
    items: [
      {
        q: "What can the Research Assistant do?",
        a: "The Research Assistant searches the live web on your behalf. Ask it to find vendors, compare services, look up pricing, research venues, read reviews, or answer any question relevant to your niche. It returns results in plain language and, where relevant, as a structured list you can save directly to your workspace.",
      },
      {
        q: "How does the AI know which niche I'm working on?",
        a: "When you select a database from a specific niche pack (e.g. Wedding Planner), the assistant picks up that context automatically. You'll see the active niche shown as a badge in the header. If no niche is selected, the assistant works as a general-purpose research tool.",
      },
      {
        q: "Does the Research Assistant remember what we discussed?",
        a: "Yes — within a session the assistant keeps the full conversation history, so you can ask follow-up questions and it will understand the context. History resets when you refresh the page.",
      },
      {
        q: "Can I save research notes?",
        a: "Yes. After the assistant returns an informational answer (not a list), a 'Save as note' button appears. Give it a title and it will be saved under the Documents tab in your workspace, linked to the active niche.",
      },
    ],
  },
  {
    section: "Workspace & Notion",
    items: [
      {
        q: "What is the Workspace tab?",
        a: "The Workspace tab shows your connected Notion databases in a live, editable table view. You can add rows, edit cells, and delete entries directly — changes sync to Notion in real time.",
      },
      {
        q: "What does 'Push to Notion' do?",
        a: "Push to Notion copies all rows from the app's internal database into your connected Notion database. Use it after the AI has populated a list of results that you want to store permanently in Notion. You can also set a schedule (daily or weekly) to keep things in sync automatically.",
      },
      {
        q: "Can I edit my Notion data directly from here?",
        a: "Yes. Click any cell in the workspace table to edit it. Changes are saved to Notion immediately. Supported types include text, numbers, dates, select dropdowns, checkboxes, and URLs.",
      },
      {
        q: "What if my Notion connection breaks?",
        a: "Go to Connections and reconnect. If the issue persists, open a support ticket and we'll take a look.",
      },
    ],
  },
  {
    section: "Niche packs",
    items: [
      {
        q: "What is a niche pack?",
        a: "A niche pack is a pre-built set of AI workflows, databases, and prompts tailored to a specific use case. The Wedding Planner pack, for example, includes vendor research, email drafting, guest management, seating planning, and a honeymoon research tool — all wired up and ready to use.",
      },
      {
        q: "Can I use more than one niche pack?",
        a: "Yes. If you have multiple niche packs active, they each appear as separate entries in the My Workspace dropdown in the sidebar. Switch between them by clicking the relevant one.",
      },
      {
        q: "How do I get a new niche pack?",
        a: "Purchase additional packs from our Etsy shop. Once your order is confirmed the pack is unlocked in your account automatically.",
      },
    ],
  },
  {
    section: "Account & privacy",
    items: [
      {
        q: "How is my data stored?",
        a: "Research results and workspace data are stored in your own Notion workspace — we never hold your business data long-term. Account information (email, credits, settings) is stored securely in our database and is never shared with third parties.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes. Open a support ticket requesting account deletion and we will remove your account and all associated data within 7 days.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderBottom: `1px solid ${N_BORDER}`,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          width: "100%",
          padding: "14px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: N_FONT,
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: 500, color: N_FG, flex: 1, lineHeight: 1.4 }}>
          {q}
        </span>
        {open
          ? <ChevronDown style={{ width: "15px", height: "15px", flexShrink: 0, color: N_SUBTLE }} />
          : <ChevronRight style={{ width: "15px", height: "15px", flexShrink: 0, color: N_SUBTLE }} />
        }
      </button>
      {open && (
        <p style={{ margin: "0 0 14px", fontSize: "14px", color: N_MUTED, lineHeight: 1.65 }}>
          {a}
        </p>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div style={{ fontFamily: N_FONT, maxWidth: 680, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700, color: N_FG, margin: "0 0 6px" }}>
        Frequently asked questions
      </h1>
      <p style={{ fontSize: "14px", color: N_MUTED, margin: "0 0 40px", lineHeight: 1.5 }}>
        Everything you need to know about using Stridivo. Can't find an answer?{" "}
        <a href={"/members/support" as never} style={{ color: N_BLUE, textDecoration: "none" }}>
          Open a support ticket
        </a>{" "}
        and we'll get back to you.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
        {FAQS.map((section) => (
          <div key={section.section}>
            <h2
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: N_SUBTLE,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                margin: "0 0 4px",
              }}
            >
              {section.section}
            </h2>
            <div
              style={{
                borderTop: `1px solid ${N_BORDER}`,
              }}
            >
              {section.items.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
