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
    NotionProvider({
      clientId: process.env["NOTION_CLIENT_ID"] ?? "",
      clientSecret: process.env["NOTION_CLIENT_SECRET"] ?? "",
      redirectUri: process.env["NEXTAUTH_URL"]
        ? `${process.env["NEXTAUTH_URL"]}/api/auth/callback/notion`
        : "http://localhost:3000/api/auth/callback/notion",
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist Notion access token and user ID into the JWT on first sign-in
      if (account?.access_token !== undefined) {
        (token as Record<string, unknown>)["notionToken"] = account.access_token;
        (token as Record<string, unknown>)["notionUserId"] = account.providerAccountId;
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
