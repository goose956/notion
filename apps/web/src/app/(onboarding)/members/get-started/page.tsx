import { auth } from "@/auth";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
import { listDeploysByUser, getNichePack } from "@niche-factory/db";

export const metadata = { title: "Get Started — Niche Factory" };

export const dynamic = "force-dynamic";

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_BLUE = "rgb(35,131,226)";
const N_BLUE_BG = "rgba(35,131,226,0.08)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

export default async function GetStartedPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const session = await auth();
  const isLoggedIn = !!session;
  const userName = session?.user?.name?.split(" ")[0] ?? "there";
  const notionUserId = (session as unknown as Record<string, unknown>)?.[
    "notionUserId"
  ] as string | undefined;

  const deploys = notionUserId
    ? await listDeploysByUser(notionUserId).catch(() => [])
    : [];

  // Only allow same-origin relative paths to prevent open-redirect
  const rawNext = searchParams.next ?? "";
  const nextUrl =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;

  // If next points to a setup page, extract the nicheId and load the niche name
  // e.g. /members/setup/wedding-planner-for-brides
  const setupMatch = /^\/members\/setup\/([a-z0-9-]+)$/.exec(nextUrl ?? "");
  const nicheIdFromNext = setupMatch?.[1] ?? null;
  const nichePackRow = nicheIdFromNext
    ? await getNichePack(nicheIdFromNext).catch(() => undefined)
    : undefined;
  const nicheName = nichePackRow?.name ?? null;

  // Step 3 "Connect" link — preserve next param through OAuth so the user
  // returns to get-started with the next param still in place.
  const connectCallbackUrl = nextUrl
    ? `/members/get-started?next=${encodeURIComponent(nextUrl)}`
    : "/members/get-started";
  const connectHref = `/login?callbackUrl=${encodeURIComponent(connectCallbackUrl)}`;

  const STEPS = [
    {
      number: 1,
      emoji: "🔐",
      title: isLoggedIn ? "You're signed in with Notion" : "Connect with Notion",
      done: isLoggedIn,
      body: isLoggedIn ? (
        <p
          style={{ margin: 0, fontSize: "14px", color: N_MUTED, lineHeight: 1.6 }}
        >
          You authenticated with your Notion account — you&apos;re all set here.
          If you don&apos;t have a Notion account yet you can{" "}
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
      ) : (
        <>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "14px",
              color: N_MUTED,
              lineHeight: 1.6,
            }}
          >
            Click below to sign in with your Notion account. If you don&apos;t
            have one yet you can{" "}
            <a
              href="https://www.notion.so/signup"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: N_BLUE, textDecoration: "underline" }}
            >
              create a free account at notion.so
            </a>{" "}
            first.
          </p>
          <a
            href={connectHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 600,
              background: N_FG,
              color: "white",
              textDecoration: "none",
            }}
          >
            Continue with Notion →
          </a>
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
          <p
            style={{
              margin: "0 0 10px",
              fontSize: "14px",
              color: N_MUTED,
              lineHeight: 1.6,
            }}
          >
            Open Notion and create a blank page — this will be your niche
            research workspace. Give it a name like{" "}
            <strong style={{ color: N_FG, fontWeight: 600 }}>
              &quot;My Niche Research&quot;
            </strong>
            .
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
            <li>
              Click{" "}
              <strong style={{ color: N_FG }}>+ New page</strong> in your
              Notion sidebar
            </li>
            <li>
              Choose <strong style={{ color: N_FG }}>Blank page</strong>
            </li>
            <li>
              Give it a title, e.g.{" "}
              <em>&quot;Niche Factory Workspace&quot;</em>
            </li>
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
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "14px",
              color: N_MUTED,
              lineHeight: 1.6,
            }}
          >
            {isLoggedIn
              ? "Click below to grant access to additional Notion pages, or to reconnect."
              : "After signing in with Notion (step 1), you'll be asked which pages to share — pick the one you just created."}
          </p>
          {isLoggedIn && (
            <a
              href={connectHref}
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
          )}
        </>
      ),
    },
    {
      number: 4,
      emoji: nicheName ? "🚀" : "🔍",
      title: nicheName
        ? `Set up your ${nicheName} workspace`
        : "Run your first niche research",
      done: false,
      body: (
        <>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: "14px",
              color: N_MUTED,
              lineHeight: 1.6,
            }}
          >
            {nicheName ? (
              <>
                Click below to enter your details and publish your{" "}
                <strong style={{ color: N_FG }}>{nicheName}</strong> workspace
                into Notion. You&apos;ll be asked a few short setup questions —
                then your Notion databases are created automatically in the page
                you connected above.
              </>
            ) : (
              <>
                Open the Research Assistant and select your niche. The{" "}
                <strong style={{ color: N_FG }}>first time</strong> you use a
                niche, a short setup form will appear asking a few questions —
                things like your target location or budget range. Once you
                submit, your Notion databases are created automatically in the
                page you connected above.
              </>
            )}
          </p>
          {!nicheName && (
            <p
              style={{
                margin: "0 0 14px",
                fontSize: "14px",
                color: N_MUTED,
                lineHeight: 1.6,
              }}
            >
              After that, just type your research question and results will
              appear ready to save straight into Notion.
            </p>
          )}
          <Link
            href={(nextUrl ?? "/members/chat") as never}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 500,
              background: isLoggedIn ? N_FG : "rgba(55,53,47,0.15)",
              color: isLoggedIn ? "white" : N_MUTED,
              textDecoration: "none",
              cursor: isLoggedIn ? "pointer" : "default",
              pointerEvents: isLoggedIn ? undefined : "none",
            }}
          >
            {nicheName ? `Set up ${nicheName}` : "Open Research Assistant"}
            <ArrowRight size={14} />
          </Link>
        </>
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "white",
        fontFamily: N_FONT,
        color: N_FG,
      }}
    >
      {/* Minimal top bar */}
      <div
        style={{
          borderBottom: `1px solid ${N_BORDER}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <div
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "3px",
            background: "#37352F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "white", fontSize: "11px", fontWeight: 700 }}>
            N
          </span>
        </div>
        <span
          style={{ fontSize: "14px", fontWeight: 600, color: N_FG }}
        >
          Niche Factory
        </span>
        {isLoggedIn && (
          <Link
            href="/members/chat"
            style={{
              marginLeft: "auto",
              fontSize: "13px",
              color: N_BLUE,
              textDecoration: "none",
            }}
          >
            Go to members area →
          </Link>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "48px 24px",
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
            {isLoggedIn
              ? `Let's get you set up, ${userName} 👋`
              : "You're almost ready 👋"}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              color: N_MUTED,
              lineHeight: 1.6,
            }}
          >
            {isLoggedIn
              ? "Niche Factory connects to your Notion workspace to deliver research results straight to your pages. Follow these steps to get everything connected."
              : "Niche Factory pushes research results straight into your Notion workspace. Follow these steps to connect your account and start researching."}
          </p>
        </div>

        {/* "You're almost there" banner when coming from a template sign-up */}
        {nextUrl && (
          <div
            style={{
              marginBottom: "28px",
              padding: "14px 18px",
              borderRadius: "6px",
              background: "rgba(35,131,226,0.06)",
              border: "1px solid rgba(35,131,226,0.2)",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <span style={{ fontSize: "20px", lineHeight: 1 }}>🎉</span>
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: N_FG,
                }}
              >
                {nicheName
                  ? `You're getting: ${nicheName}`
                  : "Account created — you're almost there!"}
              </p>
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: "13px",
                  color: N_MUTED,
                  lineHeight: 1.5,
                }}
              >
                {isLoggedIn
                  ? nicheName
                    ? `Connect a Notion page (step 3), then click "Set up ${nicheName}" to publish your workspace.`
                    : "Connect your Notion workspace (step 3) and you'll be ready to go."
                  : nicheName
                  ? `Sign in with Notion (step 1) and we'll walk you through publishing your ${nicheName} workspace.`
                  : "Sign in with Notion (step 1) and you'll be good to go."}
              </p>
              {isLoggedIn && (
                <a
                  href={nextUrl}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 12px",
                    borderRadius: "4px",
                    fontSize: "13px",
                    fontWeight: 500,
                    background: N_BLUE_BG,
                    color: N_BLUE,
                    textDecoration: "none",
                    border: "1px solid rgba(35,131,226,0.25)",
                  }}
                >
                  Skip to Research Assistant →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Connected Workspaces (shown once at least one deploy exists) */}
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
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
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
                  <span
                    style={{ fontSize: "14px", color: N_FG, fontWeight: 500 }}
                  >
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
          <strong style={{ color: N_FG }}>Need help?</strong> If you run into
          trouble connecting Notion, click the &quot;Continue with Notion&quot; button in
          step 1 again — Notion will let you add more pages. You can also
          reconnect by signing out and signing back in.
        </div>
      </div>
    </div>
  );
}
