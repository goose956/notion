import { auth } from "@/auth";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
import { listDeploysByUser } from "@niche-factory/db";

export const metadata = { title: "Get Started — Niche Factory" };

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_BLUE = "rgb(35,131,226)";
const N_BLUE_BG = "rgba(35,131,226,0.08)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

const STEPS = [
  {
    number: 1,
    emoji: "🔐",
    title: "You're signed in with Notion",
    done: true,
    body: (
      <>
        <p style={{ margin: 0, fontSize: "14px", color: N_MUTED, lineHeight: 1.6 }}>
          You authenticated with your Notion account — you're all set here. If you don't have a
          Notion account yet you can{" "}
          <a
            href="https://www.notion.so/signup"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: N_BLUE, textDecoration: "underline" }}
          >
            sign up for free at notion.so
          </a>
          , then come back and sign in.
        </p>
      </>
    ),
  },
  {
    number: 2,
    emoji: "📄",
    title: "Create a new page in Notion",
    done: false,
    body: (
      <>
        <p style={{ margin: "0 0 10px", fontSize: "14px", color: N_MUTED, lineHeight: 1.6 }}>
          Open Notion and create a blank page — this will be your niche research workspace. Give
          it a name like <strong style={{ color: N_FG, fontWeight: 600 }}>"My Niche Research"</strong>.
        </p>
        <ol
          style={{
            margin: 0,
            paddingLeft: "20px",
            fontSize: "14px",
            color: N_MUTED,
            lineHeight: 1.8,
          }}
        >
          <li>Click <strong style={{ color: N_FG }}>+ New page</strong> in your Notion sidebar</li>
          <li>Choose <strong style={{ color: N_FG }}>Blank page</strong></li>
          <li>Give it a title, e.g. <em>"Niche Factory Workspace"</em></li>
        </ol>
        <a
          href="https://www.notion.so/new"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            marginTop: "12px",
            padding: "5px 12px",
            borderRadius: "4px",
            fontSize: "13px",
            fontWeight: 500,
            background: N_BLUE_BG,
            color: N_BLUE,
            textDecoration: "none",
            border: `1px solid rgba(35,131,226,0.25)`,
          }}
        >
          Open Notion →
        </a>
      </>
    ),
  },
  {
    number: 3,
    emoji: "🔗",
    title: "Grant Niche Factory access to your page",
    done: false,
    body: (
      <>
        <p style={{ margin: "0 0 12px", fontSize: "14px", color: N_MUTED, lineHeight: 1.6 }}>
          Click the button below to connect your Notion pages. Notion will ask you to select
          which pages to share — pick the one you just created. You only need to do this once.
        </p>
        <a
          href="/login?callbackUrl=/members/get-started"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "7px 16px",
            borderRadius: "4px",
            fontSize: "14px",
            fontWeight: 500,
            background: N_BLUE_BG,
            color: N_BLUE,
            textDecoration: "none",
            border: `1px solid rgba(35,131,226,0.25)`,
          }}
        >
          Connect a Notion page →
        </a>
      </>
    ),
  },
  {
    number: 4,
    emoji: "🔍",
    title: "Run your first niche research",
    done: false,
    body: (
      <>
        <p style={{ margin: "0 0 10px", fontSize: "14px", color: N_MUTED, lineHeight: 1.6 }}>
          Open the Research Assistant and select your niche. The <strong style={{ color: N_FG }}>first time</strong> you
          use a niche, a short setup form will appear asking a few questions — things like your
          target location or budget range. Once you submit, your Notion databases are created
          automatically in the page you connected above.
        </p>
        <p style={{ margin: "0 0 14px", fontSize: "14px", color: N_MUTED, lineHeight: 1.6 }}>
          After that, just type your research question and results will appear ready to save
          straight into Notion.
        </p>
        <Link
          href="/members/chat"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 16px",
            borderRadius: "4px",
            fontSize: "14px",
            fontWeight: 500,
            background: N_FG,
            color: "white",
            textDecoration: "none",
          }}
        >
          Open Research Assistant
          <ArrowRight size={14} />
        </Link>
      </>
    ),
  },
] as const;

export default async function GetStartedPage() {
  const session = await auth();
  const userName = session?.user?.name?.split(" ")[0] ?? "there";
  const notionUserId = (session as unknown as Record<string, unknown>)?.["notionUserId"] as string | undefined;

  const deploys = notionUserId
    ? await listDeploysByUser(notionUserId).catch(() => [])
    : [];

  return (
    <div
      style={{
        padding: "48px 60px",
        maxWidth: "720px",
        fontFamily: N_FONT,
        color: N_FG,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "36px" }}>
        <p
          style={{
            margin: "0 0 6px",
            fontSize: "12px",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: N_SUBTLE,
          }}
        >
          Welcome
        </p>
        <h1
          style={{
            margin: "0 0 10px",
            fontSize: "28px",
            fontWeight: 700,
            color: N_FG,
            lineHeight: 1.2,
          }}
        >
          Let's get you set up, {userName} 👋
        </h1>
        <p style={{ margin: 0, fontSize: "15px", color: N_MUTED, lineHeight: 1.6 }}>
          Niche Factory connects to your Notion workspace to deliver research results straight to
          your pages. Follow these steps to get everything connected.
        </p>
      </div>

      {/* ── Connected Workspaces (shown once at least one deploy exists) ── */}
      {deploys.length > 0 && (
        <div
          style={{
            marginBottom: "36px",
            padding: "16px 18px",
            borderRadius: "6px",
            background: "rgba(15,123,108,0.06)",
            border: "1px solid rgba(15,123,108,0.2)",
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "rgb(15,123,108)",
            }}
          >
            ✓ Connected Workspaces
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {deploys.map((d) => (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "14px", color: N_FG, fontWeight: 500 }}>
                  {d.nicheName}
                </span>
                <a
                  href={`https://notion.so/${d.notionParentPageId.replace(/-/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 12px",
                    borderRadius: "4px",
                    fontSize: "13px",
                    fontWeight: 500,
                    background: "white",
                    color: "rgb(15,123,108)",
                    textDecoration: "none",
                    border: "1px solid rgba(15,123,108,0.3)",
                    flexShrink: 0,
                  }}
                >
                  Open in Notion
                  <ExternalLink size={12} />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {STEPS.map((step, i) => (
          <div key={step.number} style={{ display: "flex", gap: "0" }}>
            {/* Timeline spine */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "40px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: step.done ? "rgb(15,123,108)" : N_BLUE_BG,
                  border: `2px solid ${step.done ? "rgb(15,123,108)" : N_BLUE}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "15px",
                }}
              >
                {step.done ? (
                  <CheckCircle2 size={16} color="white" />
                ) : (
                  <span>{step.emoji}</span>
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    width: "2px",
                    background: N_BORDER,
                    minHeight: "24px",
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div
              style={{
                flex: 1,
                paddingBottom: i < STEPS.length - 1 ? "28px" : "0",
                paddingLeft: "16px",
                paddingTop: "4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 600,
                    color: N_FG,
                  }}
                >
                  {step.title}
                </h2>
                {step.done && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      padding: "2px 7px",
                      borderRadius: "12px",
                      background: "rgba(15,123,108,0.1)",
                      color: "rgb(15,123,108)",
                    }}
                  >
                    Done
                  </span>
                )}
              </div>
              {step.body}
            </div>
          </div>
        ))}
      </div>

      {/* Footer help */}
      <div
        style={{
          marginTop: "40px",
          padding: "14px 16px",
          borderRadius: "6px",
          background: "#F7F6F3",
          border: `1px solid ${N_BORDER}`,
          fontSize: "13px",
          color: N_MUTED,
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: N_FG }}>Need help?</strong> If you run into trouble connecting
        Notion, click the "Connect a Notion page" button in step 3 again — Notion will let you
        add more pages. You can also reconnect by signing out and signing back in.
      </div>
    </div>
  );
}
