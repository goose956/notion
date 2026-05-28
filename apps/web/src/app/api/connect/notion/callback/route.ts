import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { upsertUserConnection } from "@niche-factory/db";
import { resolvePublicAppUrl, resolveNotionRedirectUri } from "@/lib/notion-oauth-url";

/**
 * GET /api/connect/notion/callback
 *
 * Receives the Notion OAuth redirect, exchanges the code for an access token,
 * and persists it to the user_connections table.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const baseUrl = resolvePublicAppUrl(req.url);
  const connectionsUrl = `${baseUrl}/members/connections`;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${connectionsUrl}?error=notion_denied`);
  }

  // CSRF check
  const cookieStore = cookies();
  const savedState = cookieStore.get("notion_oauth_state")?.value;
  cookieStore.delete("notion_oauth_state");

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${connectionsUrl}?error=invalid_state`);
  }

  // Exchange authorisation code for access token
  const clientId = process.env["NOTION_CLIENT_ID"] ?? "";
  const clientSecret = process.env["NOTION_CLIENT_SECRET"] ?? "";
  const redirectUri = resolveNotionRedirectUri(req.url);
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  let tokenData: Record<string, unknown>;
  try {
    const res = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) {
      console.error("[notion callback] token exchange failed:", res.status, await res.text());
      return NextResponse.redirect(`${connectionsUrl}?error=token_exchange`);
    }

    tokenData = (await res.json()) as Record<string, unknown>;
  } catch (err) {
    console.error("[notion callback] fetch error:", err);
    return NextResponse.redirect(`${connectionsUrl}?error=token_exchange`);
  }

  const accessToken = tokenData["access_token"] as string;
  const ownerUser = (tokenData["owner"] as Record<string, unknown> | undefined)?.["user"] as
    | Record<string, unknown>
    | undefined;

  const providerUserId =
    (ownerUser?.["id"] as string | undefined) ?? (tokenData["bot_id"] as string | undefined);

  const upsertArgs: Parameters<typeof upsertUserConnection>[0] = {
    userId: session.user.email,
    provider: "notion",
    accessToken,
    metadata: {
      workspaceName: tokenData["workspace_name"],
      workspaceId: tokenData["workspace_id"],
      workspaceIcon: tokenData["workspace_icon"],
      botId: tokenData["bot_id"],
      ownerName: ownerUser?.["name"],
    },
    ...(providerUserId !== undefined ? { providerUserId } : {}),
  };

  await upsertUserConnection(upsertArgs);

  return NextResponse.redirect(`${connectionsUrl}?connected=notion`);
}
