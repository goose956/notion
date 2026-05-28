import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/**
 * GET /api/connect/notion
 *
 * Initiates the Notion OAuth flow. Redirects the user to Notion's
 * authorization page with a CSRF state cookie.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", req.url));
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

  const baseUrl = process.env["AUTH_URL"] ?? process.env["NEXTAUTH_URL"] ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/connect/notion/callback`;

  const url = new URL("https://api.notion.com/v1/oauth/authorize");
  url.searchParams.set("client_id", process.env["NOTION_CLIENT_ID"] ?? "");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url);
}
