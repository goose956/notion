"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ChevronDown, Plus, Trash2, ExternalLink } from "lucide-react";

type NicheOption = { id: string; name: string };

interface LandingDraft {
  headline: string;
  subheadline: string;
  hook: string;
  bullets: string[];
  result: string;
  cta: string;
  suggestedTitle: string;
  suggestedSlug: string;
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground";

export function LandingPageCreator() {
  const router = useRouter();
  const [niches, setNiches] = useState<NicheOption[]>([]);
  const [nichePackId, setNichePackId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<LandingDraft | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/niche")
      .then((r) => r.json() as Promise<{ nichePacks?: NicheOption[] }>)
      .then(({ nichePacks }) => setNiches(nichePacks ?? []))
      .catch(() => undefined);
  }, []);

  async function handleGenerate() {
    if (!nichePackId) { setError("Select a niche pack first"); return; }
    setGenerating(true);
    setError(null);
    setDraft(null);
    try {
      const res = await fetch("/api/ai/draft-landing-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nichePackId }),
      });
      const data = await res.json() as { draft?: LandingDraft; error?: string };
      if (!res.ok) { setError(data.error ?? "Generation failed"); return; }
      const d = data.draft!;
      setDraft(d);
      setTitle(d.suggestedTitle);
      setSlug(d.suggestedSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function updateBullet(i: number, val: string) {
    if (!draft) return;
    const bullets = draft.bullets.map((b, idx) => idx === i ? val : b);
    setDraft({ ...draft, bullets });
  }

  function addBullet() {
    if (!draft) return;
    setDraft({ ...draft, bullets: [...draft.bullets, ""] });
  }

  function removeBullet(i: number) {
    if (!draft) return;
    setDraft({ ...draft, bullets: draft.bullets.filter((_, idx) => idx !== i) });
  }

  async function handleSave(publish = false) {
    if (!draft || !title.trim()) { setError("Title required"); return; }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: finalSlug,
          title,
          tagline: draft.subheadline,
          problemStatement: draft.hook,
          body: JSON.stringify(draft),
          faq: [],
          category: "Other",
          tags: ["landing-page"],
          stripePaymentLink: "",
          stripePriceId: "",
          nichePackId: nichePackId || null,
          published: publish,
        }),
      });
      const data = await res.json() as { template?: { id: string }; error?: string };
      if (!res.ok) { setError(data.error ?? "Save failed"); return; }
      setSuccess(publish ? `Published — /landing/${finalSlug}` : "Saved as draft");
      if (data.template?.id) {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="surface-card overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="icon-badge h-6 w-6">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
          </span>
          <span className="text-sm font-medium">Generate Landing Page</span>
          <span className="text-xs text-muted-foreground">— dark hero · gradient · Facebook-ready copy</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-5 pt-1 space-y-5 border-t">

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-4 py-3">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400 text-sm px-4 py-3">
              {success}
            </div>
          )}

          {/* Niche picker + generate */}
          <div className="flex items-end gap-3 flex-wrap pt-2">
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <label className="block text-sm font-medium">Target niche pack</label>
              <select
                value={nichePackId}
                onChange={(e) => setNichePackId(e.target.value)}
                className={inputCls}
              >
                <option value="">— Select a niche pack —</option>
                {niches.map((n) => (
                  <option key={n.id} value={n.id}>{n.name}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !nichePackId}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 hover:bg-primary/90 transition-colors disabled:opacity-60 shrink-0"
            >
              {generating ? "Generating…" : "✦ Generate"}
            </button>
          </div>

          {/* Field editor */}
          {draft && (
            <div className="space-y-4 pt-1">

              {/* Title + slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Page title (internal)</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Slug → /landing/…</label>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Headline */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Headline</label>
                <input
                  value={draft.headline}
                  onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
                  className={`${inputCls} font-semibold`}
                  placeholder="Big bold headline…"
                />
              </div>

              {/* Subheadline */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Subheadline (orange accent)</label>
                <input
                  value={draft.subheadline}
                  onChange={(e) => setDraft({ ...draft, subheadline: e.target.value })}
                  className={inputCls}
                />
              </div>

              {/* Hook */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Hook paragraph</label>
                <textarea
                  value={draft.hook}
                  onChange={(e) => setDraft({ ...draft, hook: e.target.value })}
                  rows={3}
                  className={inputCls}
                />
              </div>

              {/* Bullets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">AI bullets</label>
                  <button
                    type="button"
                    onClick={addBullet}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                {draft.bullets.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={b}
                      onChange={(e) => updateBullet(i, e.target.value)}
                      className={inputCls}
                      placeholder="AI does X — specific action, concrete result"
                    />
                    <button
                      type="button"
                      onClick={() => removeBullet(i)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Result */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Result statement (shown in gradient box)</label>
                <textarea
                  value={draft.result}
                  onChange={(e) => setDraft({ ...draft, result: e.target.value })}
                  rows={2}
                  className={inputCls}
                />
              </div>

              {/* CTA */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">CTA button text</label>
                <input
                  value={draft.cta}
                  onChange={(e) => setDraft({ ...draft, cta: e.target.value })}
                  className={inputCls}
                  placeholder="Get it free"
                />
              </div>

              {/* Save actions */}
              <div className="flex items-center gap-2 justify-end pt-2 border-t">
                {success && slug && (
                  <a
                    href={`/landing/${slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mr-auto"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Preview page
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="inline-flex items-center rounded-md border text-sm font-medium h-9 px-4 hover:bg-muted transition-colors disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Draft"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="inline-flex items-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  Save & Publish
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
