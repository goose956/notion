import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { resolvePublicAppUrl, resolveNotionRedirectUri } from "@/lib/notion-oauth-url";

/**
 * GET /api/connect/notion
 *
 * Initiates the Notion OAuth flow. Redirects the user to Notion's
 * authorization page with a CSRF state cookie.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", "/members/connections");
    return NextResponse.redirect(loginUrl);
  }

  // CSRF protection
  const state = randomBytes(16).toString("hex");
  const cookieStore = cookies();
  cookieStore.set("notion_oauth_state", state, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  // Persist where to send the user after a successful connection
  const returnTo = req.nextUrl.searchParams.get("return_to") ?? "/members/workspace";
  cookieStore.set("notion_oauth_return_to", returnTo, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const clientId = process.env["NOTION_CLIENT_ID"] ?? "";
  if (!clientId) {
    const baseUrl = resolvePublicAppUrl(req.url);
    return NextResponse.redirect(`${baseUrl}/members/connections?error=notion_config`);
  }

  const redirectUri = resolveNotionRedirectUri(req.url);

  const url = new URL("https://api.notion.com/v1/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url);
}
