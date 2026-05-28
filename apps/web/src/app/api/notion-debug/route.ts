import { NextRequest, NextResponse } from "next/server";
import { resolvePublicAppUrl, resolveNotionRedirectUri } from "@/lib/notion-oauth-url";

/**
 * GET /api/notion-debug
 *
 * Safe diagnostics endpoint for Notion OAuth redirect URI issues.
 * This endpoint never redirects to Notion.
 */
export async function GET(req: NextRequest) {
  const baseUrl = resolvePublicAppUrl(req.url);
  const redirectUri = resolveNotionRedirectUri(req.url);
  const clientId = process.env["NOTION_CLIENT_ID"] ?? "";

  return NextResponse.json({
    ok: true,
    requestUrl: req.url,
    baseUrl,
    redirectUri,
    env: {
      AUTH_URL: process.env["AUTH_URL"] ?? null,
      NEXTAUTH_URL: process.env["NEXTAUTH_URL"] ?? null,
      RAILWAY_PUBLIC_DOMAIN: process.env["RAILWAY_PUBLIC_DOMAIN"] ?? null,
      NOTION_OAUTH_REDIRECT_URI: process.env["NOTION_OAUTH_REDIRECT_URI"] ?? null,
      NOTION_CLIENT_ID: process.env["NOTION_CLIENT_ID"] ?? null,
      hasNotionClientId: clientId.length > 0,
    },
    expectedNotionRedirectUris: [
      `${baseUrl}/api/connect/notion/callback`,
      `${baseUrl}/api/auth/callback/notion`,
    ],
  });
}
