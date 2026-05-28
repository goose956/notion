const DEFAULT_APP_URL = "http://localhost:3000";

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

/**
 * Resolve the canonical public app URL for OAuth redirects.
 */
export function resolvePublicAppUrl(requestUrl?: string): string {
  const reqOrigin = (() => {
    if (!requestUrl) return undefined;
    try {
      return new URL(requestUrl).origin;
    } catch {
      return undefined;
    }
  })();

  const raw =
    process.env["AUTH_URL"] ??
    process.env["NEXTAUTH_URL"] ??
    reqOrigin ??
    process.env["RAILWAY_PUBLIC_DOMAIN"] ??
    DEFAULT_APP_URL;

  // RAILWAY_PUBLIC_DOMAIN may be host-only; add scheme if needed.
  const withScheme = raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : `https://${raw}`;

  return trimTrailingSlash(withScheme);
}

/**
 * Exact redirect URI used for Notion OAuth authorize + token exchange.
 * Can be overridden for strict environments via NOTION_OAUTH_REDIRECT_URI.
 */
export function resolveNotionRedirectUri(requestUrl?: string): string {
  const explicit = process.env["NOTION_OAUTH_REDIRECT_URI"];
  if (explicit && explicit.trim().length > 0) {
    return trimTrailingSlash(explicit.trim());
  }
  return `${resolvePublicAppUrl(requestUrl)}/api/connect/notion/callback`;
}
