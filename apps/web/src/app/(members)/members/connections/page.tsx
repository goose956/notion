import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteUserConnection, listUserConnections } from "@niche-factory/db";
import type { UserConnectionRow } from "@niche-factory/db";
import { revalidatePath } from "next/cache";
import { ExternalLink, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Connections — Stridivo" };

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_BORDER_MED = "rgba(55,53,47,0.16)";
const N_GREEN = "rgb(15,123,108)";
const N_GREEN_BG = "rgba(15,123,108,0.08)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

// ─── Provider definitions — add new integrations here ───────────────────────

interface ProviderDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  docsUrl?: string;
  available: boolean;
}

const PROVIDERS: ProviderDef[] = [
  {
    id: "notion",
    name: "Notion",
    description: "Sync your workspace databases directly into your Notion pages. Required for the Notion backend.",
    icon: "N",
    docsUrl: "https://notion.so",
    available: true,
  },
  {
    id: "airtable",
    name: "Airtable",
    description: "Push rows into Airtable bases from your workspace.",
    icon: "A",
    available: false,
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    description: "Export workspace data to Google Sheets automatically.",
    icon: "G",
    available: false,
  },
];

// ─── Disconnect form action ───────────────────────────────────────────────────

function DisconnectButton({ provider, userEmail }: { provider: string; userEmail: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await deleteUserConnection(userEmail, provider).catch((err) => {
          console.error("Disconnect failed", err);
        });
        revalidatePath("/members/connections");
      }}
    >
      <button
        type="submit"
        style={{
          padding: "5px 12px",
          borderRadius: "4px",
          fontSize: "13px",
          border: `1px solid ${N_BORDER_MED}`,
          background: "white",
          color: N_MUTED,
          cursor: "pointer",
          fontFamily: N_FONT,
        }}
      >
        Disconnect
      </button>
    </form>
  );
}

// ─── Provider card ────────────────────────────────────────────────────────────

function ProviderCard({
  def,
  connection,
  flash,
  userEmail,
}: {
  def: ProviderDef;
  connection: UserConnectionRow | undefined;
  flash: string | null;
  userEmail: string;
}) {
  const connected = !!connection;
  const meta = (connection?.metadata ?? {}) as Record<string, unknown>;

  return (
    <div
      style={{
        border: `1px solid ${connected ? "rgba(15,123,108,0.25)" : N_BORDER}`,
        borderRadius: "8px",
        padding: "20px",
        background: connected ? N_GREEN_BG : "white",
        display: "flex",
        alignItems: "flex-start",
        gap: "16px",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "8px",
          background: connected ? N_GREEN : "#37352F",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "white",
          fontSize: "18px",
          fontWeight: 700,
          fontFamily: N_FONT,
          opacity: def.available ? 1 : 0.4,
        }}
      >
        {def.icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "15px", fontWeight: 600, color: N_FG, fontFamily: N_FONT }}>
            {def.name}
          </span>
          {connected ? (
            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: N_GREEN, fontWeight: 500 }}>
              <CheckCircle2 size={12} />
              Connected
            </span>
          ) : !def.available ? (
            <span style={{ fontSize: "12px", color: N_SUBTLE, fontFamily: N_FONT }}>Coming soon</span>
          ) : null}
        </div>

        <p style={{ fontSize: "13px", color: N_MUTED, margin: "0 0 10px", lineHeight: 1.5, fontFamily: N_FONT }}>
          {def.description}
        </p>

        {/* Connected workspace details */}
        {connected && typeof meta["workspaceName"] === "string" && (
          <p style={{ fontSize: "12px", color: N_MUTED, margin: "0 0 10px", fontFamily: N_FONT }}>
            Workspace: <strong style={{ color: N_FG }}>{meta["workspaceName"]}</strong>
          </p>
        )}

        {/* Flash message */}
        {flash === def.id && (
          <p style={{ fontSize: "12px", color: N_GREEN, margin: "0 0 10px", fontFamily: N_FONT }}>
            ✓ Successfully connected!
          </p>
        )}

        {/* Actions */}
        {def.available && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {connected ? (
              <DisconnectButton provider={def.id} userEmail={userEmail} />
            ) : (
              <a
                href={`/api/connect/${def.id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "white",
                  background: N_FG,
                  textDecoration: "none",
                  fontFamily: N_FONT,
                }}
              >
                Connect {def.name}
              </a>
            )}
            {def.docsUrl && (
              <a
                href={def.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: N_SUBTLE, textDecoration: "none" }}
              >
                <ExternalLink size={11} />
                Learn more
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string };
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const userEmail = session.user.email;

  const connections = await listUserConnections(userEmail).catch(() => [] as UserConnectionRow[]);
  const connectionsByProvider = Object.fromEntries(connections.map((c) => [c.provider, c]));
  const notionConnected = connections.some((c) => c.provider === "notion");

  // Determine flash state from query params
  const connectedFlash = searchParams.connected ?? null;
  const errorMsg = searchParams.error
    ? ({
        notion_denied: "Notion connection was cancelled.",
        invalid_state: "Security check failed — please try again.",
        notion_config: "Notion integration is not configured correctly (missing client ID or redirect URI).",
        token_exchange: "Could not exchange the authorisation code. Check your Notion integration settings.",
        connection_save: "Connected to Notion, but failed to save the connection in our database.",
        notion_callback: "Unexpected error while processing the Notion callback.",
      }[searchParams.error] ?? "An unexpected error occurred.")
    : null;

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "32px 24px", fontFamily: N_FONT }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, color: N_FG, margin: "0 0 6px" }}>
        Connections
      </h1>
      <p style={{ fontSize: "14px", color: N_MUTED, margin: "0 0 28px", lineHeight: 1.6 }}>
        Connect third-party services to sync your workspace data. More integrations coming soon.
      </p>

      {errorMsg && (
        <div style={{ border: "1px solid rgba(220,38,38,0.3)", borderRadius: "6px", background: "rgba(220,38,38,0.05)", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: "rgb(185,28,28)" }}>
          {errorMsg}
        </div>
      )}

      {notionConnected && (
        <div style={{ border: "1px solid rgba(35,131,226,0.25)", borderRadius: "6px", background: "rgba(35,131,226,0.06)", padding: "12px 16px", marginBottom: "20px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "13px", color: N_FG, lineHeight: 1.5 }}>
            Notion is connected. This only authorises access.
            You choose the exact Notion page during workflow setup when deploying databases.
          </p>
          <Link href="/members/get-started?view=1" style={{ fontSize: "13px", color: "rgb(35,131,226)", textDecoration: "none", fontWeight: 500 }}>
            Go to setup and deploy to a page
          </Link>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {PROVIDERS.map((def) => (
          <ProviderCard
            key={def.id}
            def={def}
            connection={connectionsByProvider[def.id]}
            flash={connectedFlash}
            userEmail={userEmail}
          />
        ))}
      </div>
    </div>
  );
}
