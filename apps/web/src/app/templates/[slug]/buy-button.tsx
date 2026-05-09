"use client";

import { useState } from "react";

type BuyButtonProps = {
  href: string;
  slug: string;
  templateId: string;
  stripePriceId: string;
  /** True when the signed-in user already owns this template */
  owned?: boolean;
};

export function BuyButton({ href, slug, templateId, stripePriceId, owned }: BuyButtonProps) {
  const [loading, setLoading] = useState(false);

  if (owned) {
    return (
      <div className="inline-flex items-center justify-center rounded-md bg-green-600 text-white px-8 py-3 text-base font-semibold shadow-sm">
        ✓ You own this template
      </div>
    );
  }

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Track the click regardless
    fetch("/api/templates/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, event: "click" }),
    }).catch(() => undefined);

    // If a Stripe Price ID is configured, use dynamic checkout
    if (stripePriceId) {
      e.preventDefault();
      setLoading(true);
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } catch {
        setLoading(false);
      }
    }
  }

  return (
    <a
      href={href || "#"}
      target={stripePriceId ? "_self" : "_blank"}
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-disabled={loading}
      className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-8 py-3 text-base font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
    >
      {loading ? "Redirecting…" : "Get This Template →"}
    </a>
  );
}

