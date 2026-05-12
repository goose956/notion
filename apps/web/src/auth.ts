import NextAuth from "next-auth";
import NotionProvider from "next-auth/providers/notion";

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Uses Notion OAuth so users sign in with the same Notion account they'll
 * be deploying packs to. The access_token from Notion OAuth is stored in
 * the session so we can use it for Notion API calls on behalf of the user.
 *
 * Required env vars:
 *   AUTH_SECRET            — random secret (openssl rand -base64 32)
 *   NOTION_CLIENT_ID       — from Notion integration settings
 *   NOTION_CLIENT_SECRET   — from Notion integration settings
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // Keep a stable callback base URL for local/dev/prod auth redirects.
    // NextAuth handles OAuth checks by default; avoid disabling them.
    NotionProvider({
      clientId: process.env["NOTION_CLIENT_ID"] ?? "",
      clientSecret: process.env["NOTION_CLIENT_SECRET"] ?? "",
      redirectUri: `${process.env["AUTH_URL"] ?? process.env["NEXTAUTH_URL"] ?? "http://localhost:3000"}/api/auth/callback/notion`,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist Notion access token and user ID into the JWT on first sign-in
      const accountRecord = account as Record<string, unknown> | null;
      const profileRecord = profile as Record<string, unknown> | null;

      const accessToken =
        (typeof account?.access_token === "string" ? account.access_token : undefined) ??
        (typeof accountRecord?.["accessToken"] === "string" ? accountRecord["accessToken"] : undefined);

      if (accessToken !== undefined) {
        (token as Record<string, unknown>)["notionToken"] = accessToken;
      }

      const notionUserId =
        (typeof account?.providerAccountId === "string" ? account.providerAccountId : undefined) ??
        (typeof profileRecord?.["id"] === "string" ? profileRecord["id"] : undefined);

      if (notionUserId !== undefined) {
        (token as Record<string, unknown>)["notionUserId"] = notionUserId;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose the Notion token and user ID to server components via session
      const notionToken = (token as Record<string, unknown>)["notionToken"];
      if (typeof notionToken === "string") {
        (session as typeof session & { notionToken: string }).notionToken = notionToken;
      }
      const notionUserId = (token as Record<string, unknown>)["notionUserId"];
      if (typeof notionUserId === "string") {
        (session as typeof session & { notionUserId: string }).notionUserId = notionUserId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
