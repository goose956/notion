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
  const baseUrl = resolvePublicAppUrl(req.url);
  const connectionsUrl = `${baseUrl}/members/connections`;

  try {
    const session = await auth();
    if (!session?.user?.email) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", "/members/connections");
      return NextResponse.redirect(loginUrl);
    }

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
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${connectionsUrl}?error=notion_config`);
    }

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

      const raw = await res.text();
      if (!res.ok) {
        console.error("[notion callback] token exchange failed:", res.status, raw);
        return NextResponse.redirect(`${connectionsUrl}?error=token_exchange`);
      }

      try {
        tokenData = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        console.error("[notion callback] token response was not JSON:", raw);
        return NextResponse.redirect(`${connectionsUrl}?error=token_exchange`);
      }
    } catch (err) {
      console.error("[notion callback] fetch error:", err);
      return NextResponse.redirect(`${connectionsUrl}?error=token_exchange`);
    }

    const accessToken = tokenData["access_token"];
    if (typeof accessToken !== "string" || !accessToken) {
      console.error("[notion callback] missing access_token:", tokenData);
      return NextResponse.redirect(`${connectionsUrl}?error=token_exchange`);
    }

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

    try {
      await upsertUserConnection(upsertArgs);
    } catch (err) {
      console.error("[notion callback] failed to save connection:", err);
      return NextResponse.redirect(`${connectionsUrl}?error=connection_save`);
    }

    const returnTo = cookieStore.get("notion_oauth_return_to")?.value ?? "/members/workspace";
    cookieStore.delete("notion_oauth_return_to");
    // Only allow relative paths — strip anything that isn't a leading slash
    const safePath = returnTo.startsWith("/") ? returnTo : "/members/workspace";
    const origin = new URL(baseUrl).origin;
    const separator = safePath.includes("?") ? "&" : "?";
    return NextResponse.redirect(`${origin}${safePath}${separator}connected=notion`);
  } catch (err) {
    console.error("[notion callback] unexpected error:", err);
    return NextResponse.redirect(`${connectionsUrl}?error=notion_callback`);
  }
}
