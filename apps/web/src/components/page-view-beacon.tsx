"use client";
import { useEffect } from "react";

/**
 * Fires a single POST /api/track beacon when the component mounts.
 * Drop into any page (including RSC pages via a tiny client island).
 */
export function PageViewBeacon({ path }: { path: string }) {
  useEffect(() => {
    const referrer = typeof document !== "undefined" ? document.referrer || undefined : undefined;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, referrer }),
      keepalive: true,
    }).catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
