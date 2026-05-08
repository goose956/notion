"use client";

export function BuyButton({ href, slug }: { href: string; slug: string }) {
  function handleClick() {
    fetch("/api/templates/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, event: "click" }),
    }).catch(() => undefined);
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-8 py-3 text-base font-semibold hover:bg-primary/90 transition-colors shadow-sm"
    >
      Get This Template →
    </a>
  );
}
