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
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist Notion access token into the JWT on first sign-in
      if (account?.access_token !== undefined) {
        token["notionToken"] = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose the Notion token to server components via session
      (session as typeof session & { notionToken?: string }).notionToken =
        token["notionToken"] as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
