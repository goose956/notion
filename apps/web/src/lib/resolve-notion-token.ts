import { getUserConnection } from "@niche-factory/db";

/**
 * Resolves a user's Notion access token with a priority chain:
 *  1. DB — user_connections table (preferred, from the Connections page)
 *  2. JWT session — for users who signed in with Notion OAuth before the
 *     connections flow was introduced (backwards compatibility)
 *  3. Environment variable — admin / server-side fallback
 */
export async function resolveNotionToken(
  userEmail: string | null | undefined,
  sessionNotionToken: string | undefined,
): Promise<string | undefined> {
  if (userEmail) {
    const conn = await getUserConnection(userEmail, "notion").catch(() => undefined);
    if (conn?.accessToken) return conn.accessToken;
  }
  if (sessionNotionToken) return sessionNotionToken;
  return process.env["NOTION_TOKEN"] ?? undefined;
}
