import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolvePublicAppUrl, resolveNotionRedirectUri } from "@/lib/notion-oauth-url";

/**
 * GET /api/connect/notion/debug
 *
 * Temporary diagnostics endpoint to verify exact redirect_uri value
 * produced by the server in production.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = resolvePublicAppUrl(req.url);
  const redirectUri = resolveNotionRedirectUri(req.url);
  const clientId = process.env["NOTION_CLIENT_ID"] ?? "";

  const authUrl = new URL("https://api.notion.com/v1/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("owner", "user");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", "debug-state");

  return NextResponse.json({
    requestUrl: req.url,
    baseUrl,
    redirectUri,
    env: {
      AUTH_URL: process.env["AUTH_URL"] ?? null,
      NEXTAUTH_URL: process.env["NEXTAUTH_URL"] ?? null,
      RAILWAY_PUBLIC_DOMAIN: process.env["RAILWAY_PUBLIC_DOMAIN"] ?? null,
      NOTION_OAUTH_REDIRECT_URI: process.env["NOTION_OAUTH_REDIRECT_URI"] ?? null,
      hasNotionClientId: clientId.length > 0,
    },
    authUrl: authUrl.toString(),
  });
}
