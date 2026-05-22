import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
import {
  listDeploysByUser,
  getNichePack,
  getLatestAppWorkspaceByNiche,
  getUserCriteria,
  createAppWorkspace,
  createAppDatabase,
  updateAppWorkspaceStatus,
} from "@niche-factory/db";
import { randomUUID } from "node:crypto";
import { MembersNav } from "../../../(members)/members-nav";

export const metadata = { title: "Get Started â€” Niche Factory" };

export const dynamic = "force-dynamic";

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_BLUE = "rgb(35,131,226)";
const N_BLUE_BG = "rgba(35,131,226,0.08)";
const N_GREEN = "rgb(15,123,108)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

// â”€â”€â”€ Shared top bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function TopBar({ showMembersLink }: { showMembersLink: boolean }) {
  return (
    <div style={{ borderBottom: `1px solid ${N_BORDER}`, padding: "12px 24px", display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ width: "22px", height: "22px", borderRadius: "3px", background: "#37352F", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ color: "white", fontSize: "11px", fontWeight: 700 }}>N</span>
      </div>
      <span style={{ fontSize: "14px", fontWeight: 600, color: N_FG }}>Niche Factory</span>
      {showMembersLink && (
        <Link href="/members/chat" style={{ marginLeft: "auto", fontSize: "13px", color: N_BLUE, textDecoration: "none" }}>
          Go to members area â†’
        </Link>
      )}
    </div>
  );
}

// â”€â”€â”€ In-App flow (no Notion required) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function InAppGetStarted({
  userName,
  nextUrl,
  nicheName,
  nicheId,
  isAuthenticated,
}: {
  userName: string;
  nextUrl: string | null;
  nicheName: string | null;
  nicheId: string | null;
  isAuthenticated: boolean;
}) {
  const setupHref = nicheId
    ? `/members/setup/${nicheId}`
    : nextUrl ?? "/members/chat";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "white", fontFamily: N_FONT, color: N_FG }}>
      <aside
        style={{
          width: "240px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "#F7F6F3",
          borderRight: "1px solid rgba(55,53,47,0.09)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 14px 8px",
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
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#37352F",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Niche Factory
          </span>
        </div>

        <div style={{ padding: "0 8px 8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 8px",
              borderRadius: "3px",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: "#37352F",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span style={{ color: "white", fontSize: "10px", fontWeight: 600 }}>
                {(userName[0] ?? "?").toUpperCase()}
              </span>
            </div>
            <span
              style={{
                fontSize: "14px",
                color: "#37352F",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {userName}
            </span>
          </div>
        </div>

        <div style={{ height: "1px", background: "rgba(55,53,47,0.09)" }} />

        <MembersNav />

        <div style={{ flex: 1 }} />

        {isAuthenticated && (
          <div style={{ padding: "0 8px 8px" }}>
            <div style={{ fontSize: "11px", color: N_SUBTLE, padding: "6px 8px" }}>
              Keep using the sidebar to jump between setup, chat, workspace, and profile.
            </div>
          </div>
        )}
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", background: "#FFF8EE" }}>
        <TopBar showMembersLink={isAuthenticated} />

        <div
          style={{
            maxWidth: "760px",
            margin: "0 auto",
            padding: "40px 24px 56px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
        <div
          style={{
            background: "white",
            border: "1px solid rgba(55,53,47,0.08)",
            borderRadius: "18px",
            boxShadow: "0 18px 40px rgba(55,53,47,0.08)",
            padding: "32px 36px",
          }}
        >
        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: N_SUBTLE }}>
            Welcome
          </p>
          <h1 style={{ margin: "0 0 10px", fontSize: "28px", fontWeight: 700, color: N_FG, lineHeight: 1.2 }}>
            {isAuthenticated ? `Let's get started, ${userName} ðŸ‘‹` : "You're almost ready ðŸ‘‹"}
          </h1>
          <p style={{ margin: 0, fontSize: "15px", color: N_MUTED, lineHeight: 1.6 }}>
            Your research workspace lives right here in the app â€” no Notion account needed.
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

          {/* Step 1 â€” done */}
          <div style={{ display: "flex", gap: "0" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "40px", flexShrink: 0 }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: N_GREEN, border: `2px solid ${N_GREEN}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckCircle2 size={16} color="white" />
              </div>
              <div style={{ flex: 1, width: "2px", background: N_BORDER, minHeight: "24px" }} />
            </div>
            <div style={{ flex: 1, paddingBottom: "28px", paddingLeft: "16px", paddingTop: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: N_FG }}>Account created</h2>
                <span style={{ fontSize: "11px", fontWeight: 500, padding: "2px 7px", borderRadius: "12px", background: "rgba(15,123,108,0.1)", color: N_GREEN }}>Done</span>
              </div>
              <p style={{ margin: 0, fontSize: "14px", color: N_MUTED, lineHeight: 1.6 }}>
                You&apos;re signed in. Your research data is saved securely in your account.
              </p>
            </div>
          </div>

          {/* Step 2 â€” set up workspace */}
          <div style={{ display: "flex", gap: "0" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "40px", flexShrink: 0 }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: N_BLUE_BG, border: `2px solid ${N_BLUE}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "15px" }}>
                <span>ðŸš€</span>
              </div>
            </div>
            <div style={{ flex: 1, paddingLeft: "16px", paddingTop: "4px" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 600, color: N_FG }}>
                {nicheName ? `Set up your ${nicheName} workspace` : "Set up your workspace"}
              </h2>
              <p style={{ margin: "0 0 14px", fontSize: "14px", color: N_MUTED, lineHeight: 1.6 }}>
                {nicheName
                  ? <>Answer a few quick questions about your <strong style={{ color: N_FG }}>{nicheName}</strong> setup â€” things like your target location or budget. Your workspace will be created instantly and you can start researching right away.</>
                  : <>Pick a niche, answer a few quick questions about your setup, and your workspace will be created instantly. Results from the research assistant can be saved directly to your workspace.</>
                }
              </p>
              <Link
                href={setupHref as never}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 20px",
                  borderRadius: "5px",
                  fontSize: "14px",
                  fontWeight: 600,
                  background: N_FG,
                  color: "white",
                  textDecoration: "none",
                  fontFamily: N_FONT,
                }}
              >
                {nicheName ? `Set up ${nicheName}` : "Browse workspaces"}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Notion upsell â€” subtle callout */}
        <div style={{ marginTop: "48px", padding: "16px 18px", borderRadius: "6px", background: "#F7F6F3", border: `1px solid ${N_BORDER}` }}>
          <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 600, color: N_FG }}>
            Want to sync with Notion?
          </p>
          <p style={{ margin: "0 0 10px", fontSize: "13px", color: N_MUTED, lineHeight: 1.5 }}>
            You can connect a Notion account at any time to push your workspace databases directly into Notion.
          </p>
          <Link
            href={`/login?callbackUrl=${encodeURIComponent("/members/get-started")}`}
            style={{ fontSize: "13px", color: N_BLUE, textDecoration: "none", fontWeight: 500 }}
          >
            Connect Notion â†’
          </Link>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Notion flow (existing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  const notionToken = (session as unknown as Record<string, unknown>)?.[
    "notionToken"
  ] as string | undefined;
  const isInApp = isLoggedIn && !notionToken;

  const deploys = notionUserId
    ? await listDeploysByUser(notionUserId).catch(() => [])
    : [];

  // Only allow same-origin relative paths to prevent open-redirect
  const rawNext = searchParams.next ?? "";
  const nextUrl =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;

  // If next points to a setup page, extract the nicheId and load the niche name
  const setupMatch = /^\/members\/setup\/([a-z0-9-]+)$/.exec(nextUrl ?? "");
  const nicheIdFromNext = setupMatch?.[1] ?? null;
  const nichePackRow = nicheIdFromNext
    ? await getNichePack(nicheIdFromNext).catch(() => undefined)
    : undefined;
  const nicheName = nichePackRow?.name ?? null;
  const defaultInAppNicheId = "wedding-planner";
  const autoNicheId = nicheIdFromNext ?? defaultInAppNicheId;
  const autoNichePackRow =
    nicheIdFromNext !== null
      ? nichePackRow
      : await getNichePack(autoNicheId).catch(() => undefined);

  // â”€â”€ In-App path: much simpler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isInApp) {
    if (autoNicheId && autoNichePackRow && session?.user?.email) {
      try {
        const existing = await getLatestAppWorkspaceByNiche(
          session.user.email,
          autoNicheId,
        );

        const schema = autoNichePackRow.schemaSnapshot as {
          onboardingQuestions?: unknown[];
          databases: Array<{ id: string; name: string; properties: unknown[] }>;
        };
        const hasOnboardingQuestions =
          Array.isArray(schema.onboardingQuestions) &&
          schema.onboardingQuestions.length > 0;

        // First-time in-app users should fill setup details (date, budget, etc.)
        // before provisioning so the hosted workspace can use this context.
        if (!existing && hasOnboardingQuestions) {
          const savedCriteria = await getUserCriteria(
            session.user.email,
            autoNicheId,
          ).catch(() => undefined);

          if (!savedCriteria) {
            redirect(`/members/setup/${encodeURIComponent(autoNicheId)}`);
          }
        }

        if (!existing) {
          const workspaceId = randomUUID();
          await createAppWorkspace({
            id: workspaceId,
            userId: session.user.email,
            nichePackId: autoNicheId,
            name: autoNichePackRow.name,
            databaseIdMap: {},
            status: "in_progress",
            createdAt: new Date(),
          });

          const databaseIdMap: Record<string, string> = {};
          const start = Date.now();

          try {
            for (const db of schema.databases) {
              const dbId = randomUUID();
              await createAppDatabase({
                id: dbId,
                workspaceId,
                packDbId: db.id,
                name: db.name,
                propertiesSchema: db.properties as Record<string, unknown>[],
                createdAt: new Date(),
              });
              databaseIdMap[db.id] = dbId;
            }

            await updateAppWorkspaceStatus(workspaceId, {
              status: "success",
              durationMs: Date.now() - start,
              databaseIdMap,
            });
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message
                : "Failed to create in-app databases";
            await updateAppWorkspaceStatus(workspaceId, {
              status: "failed",
              errorMessage: message,
            }).catch(() => null);
          }
        }

        redirect(`/members/chat?nicheId=${encodeURIComponent(autoNicheId)}`);
      } catch (err) {
        if (isRedirectError(err)) {
          throw err;
        }
        // Fall back to manual setup card if auto-provisioning fails.
      }
    }

    return (
      <InAppGetStarted
        userName={userName}
        nextUrl={nextUrl}
        nicheName={nicheName}
        nicheId={nicheIdFromNext}
        isAuthenticated={isLoggedIn}
      />
    );
  }

  // â”€â”€ Notion path: original 3-step flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Step 3 "Connect" link â€” preserve next param through OAuth
  const connectCallbackUrl = nextUrl
    ? `/members/get-started?next=${encodeURIComponent(nextUrl)}`
    : "/members/get-started";
  const connectHref = `/login?callbackUrl=${encodeURIComponent(connectCallbackUrl)}`;

  const STEPS = [
    {
      number: 1,
      emoji: "ðŸ“„",
      title: "Create a new page in Notion",
      done: false,
      body: (
        <>
          <p style={{ margin: "0 0 10px", fontSize: "14px", color: N_MUTED, lineHeight: 1.6 }}>
            First, create a blank page in Notion â€” this will become your niche
            research workspace. If you don&apos;t have a Notion account yet,{" "}
            <a href="https://www.notion.so/signup" target="_blank" rel="noopener noreferrer" style={{ color: N_BLUE, textDecoration: "underline" }}>
              sign up for free
            </a>{" "}
            first.
          </p>
          <ol style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: N_MUTED, lineHeight: 1.8 }}>
            <li>Click <strong style={{ color: N_FG }}>+ New page</strong> in your Notion sidebar</li>
            <li>Choose <strong style={{ color: N_FG }}>Blank page</strong></li>
            <li>Give it a title, e.g. <em>&quot;Niche Factory Workspace&quot;</em></li>
          </ol>
          <a
            href="https://www.notion.so/new"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "12px", padding: "5px 12px", borderRadius: "4px", fontSize: "13px", fontWeight: 500, background: N_BLUE_BG, color: N_BLUE, textDecoration: "none", border: `1px solid rgba(35,131,226,0.25)` }}
          >
            Open Notion â†’
          </a>
        </>
      ),
    },
    {
      number: 2,
      emoji: "ðŸ”—",
      title: isLoggedIn ? "You're connected with Notion" : "Connect with Notion",
      done: isLoggedIn,
      body: isLoggedIn ? (
        <>
          <p style={{ margin: "0 0 10px", fontSize: "14px", color: N_MUTED, lineHeight: 1.6 }}>
            Your Notion account is connected. If you need to share an additional
            page with Niche Factory, click below to open the Notion access settings.
          </p>
          <a
            href={connectHref}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "7px 16px", borderRadius: "4px", fontSize: "14px", fontWeight: 500, background: N_BLUE_BG, color: N_BLUE, textDecoration: "none", border: `1px solid rgba(35,131,226,0.25)` }}
          >
            Add a Notion page â†’
          </a>
        </>
      ) : (
        <>
          <p style={{ margin: "0 0 12px", fontSize: "14px", color: N_MUTED, lineHeight: 1.6 }}>
            Once your Notion page is ready, click below to connect your account.
            Notion will ask which pages to share â€” select the page you just created.
          </p>
          <a
            href={connectHref}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "4px", fontSize: "14px", fontWeight: 600, background: N_FG, color: "white", textDecoration: "none" }}
          >
            Continue with Notion â†’
          </a>
        </>
      ),
    },
    {
      number: 3,
      emoji: nicheName ? "ðŸš€" : "ðŸ”",
      title: nicheName ? `Set up your ${nicheName} workspace` : "Run your first niche research",
      done: false,
      body: (
        <>
          <p style={{ margin: "0 0 10px", fontSize: "14px", color: N_MUTED, lineHeight: 1.6 }}>
            {nicheName ? (
              <>
                Click below to enter your details and publish your{" "}
                <strong style={{ color: N_FG }}>{nicheName}</strong> workspace into Notion.
                Your Notion databases are created automatically in the page you connected above.
              </>
            ) : (
              <>
                Open the Research Assistant and select your niche. The{" "}
                <strong style={{ color: N_FG }}>first time</strong> you use a niche, a short setup form
                will ask a few questions â€” then your Notion databases are created automatically.
              </>
            )}
          </p>
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
    <div style={{ minHeight: "100vh", background: "white", fontFamily: N_FONT, color: N_FG }}>
      <TopBar showMembersLink={isLoggedIn} />

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: "36px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: N_SUBTLE }}>
            Welcome
          </p>
          <h1 style={{ margin: "0 0 10px", fontSize: "28px", fontWeight: 700, color: N_FG, lineHeight: 1.2 }}>
            {isLoggedIn ? `Let's get you set up, ${userName} ðŸ‘‹` : "You're almost ready ðŸ‘‹"}
          </h1>
          <p style={{ margin: 0, fontSize: "15px", color: N_MUTED, lineHeight: 1.6 }}>
            Niche Factory connects to your Notion workspace to deliver research results straight to your pages.
            Follow these steps to get everything connected.
          </p>
        </div>

        {/* "You're almost there" banner */}
        {nextUrl && (
          <div style={{ marginBottom: "28px", padding: "14px 18px", borderRadius: "6px", background: "rgba(35,131,226,0.06)", border: "1px solid rgba(35,131,226,0.2)", display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <span style={{ fontSize: "20px", lineHeight: 1 }}>ðŸŽ‰</span>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600, color: N_FG }}>
                {nicheName ? `You're getting: ${nicheName}` : "Account created â€” you're almost there!"}
              </p>
              <p style={{ margin: "0 0 10px", fontSize: "13px", color: N_MUTED, lineHeight: 1.5 }}>
                {isLoggedIn
                  ? nicheName
                    ? `Connect a Notion page (step 2) if you haven't already, then click "Set up ${nicheName}" to publish your workspace.`
                    : "Connect your Notion workspace (step 2) and you'll be ready to go."
                  : nicheName
                  ? `Connect with Notion (step 2) and we'll walk you through publishing your ${nicheName} workspace.`
                  : "Connect with Notion (step 2) and you'll be good to go."}
              </p>
              {isLoggedIn && (
                <a
                  href={nextUrl}
                  style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "4px", fontSize: "13px", fontWeight: 500, background: N_BLUE_BG, color: N_BLUE, textDecoration: "none", border: "1px solid rgba(35,131,226,0.25)" }}
                >
                  Skip to Research Assistant â†’
                </a>
              )}
            </div>
          </div>
        )}

        {/* Connected Workspaces */}
        {deploys.length > 0 && (
          <div style={{ marginBottom: "36px", padding: "16px 18px", borderRadius: "6px", background: "rgba(15,123,108,0.06)", border: "1px solid rgba(15,123,108,0.2)" }}>
            <p style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: N_GREEN }}>
              âœ“ Connected Workspaces
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {deploys.map((d) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                  <span style={{ fontSize: "14px", color: N_FG, fontWeight: 500 }}>{d.nicheName}</span>
                  <a
                    href={`https://notion.so/${d.notionParentPageId.replace(/-/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "4px", fontSize: "13px", fontWeight: 500, background: "white", color: N_GREEN, textDecoration: "none", border: "1px solid rgba(15,123,108,0.3)", flexShrink: 0 }}
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
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "40px", flexShrink: 0 }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: step.done ? N_GREEN : N_BLUE_BG, border: `2px solid ${step.done ? N_GREEN : N_BLUE}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "15px" }}>
                  {step.done ? <CheckCircle2 size={16} color="white" /> : <span>{step.emoji}</span>}
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, width: "2px", background: N_BORDER, minHeight: "24px" }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: i < STEPS.length - 1 ? "28px" : "0", paddingLeft: "16px", paddingTop: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: N_FG }}>{step.title}</h2>
                  {step.done && (
                    <span style={{ fontSize: "11px", fontWeight: 500, padding: "2px 7px", borderRadius: "12px", background: "rgba(15,123,108,0.1)", color: N_GREEN }}>
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
        <div style={{ marginTop: "40px", padding: "14px 16px", borderRadius: "6px", background: "#F7F6F3", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_MUTED, lineHeight: 1.5 }}>
          <strong style={{ color: N_FG }}>Need help?</strong> If you run into trouble connecting Notion,
          click the &quot;Continue with Notion&quot; button in step 2 again â€” Notion will let you add more pages.
        </div>
      </div>
    </div>
  );
}
