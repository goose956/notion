"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ChevronDown } from "lucide-react";

type NicheOption = { id: string; name: string };

interface LandingPageDraft {
  headline: string;
  subheadline: string;
  hook: string;
  bullets: string[];
  result: string;
  cta: string;
  suggestedTitle: string;
  suggestedSlug: string;
}

function draftToBody(d: LandingPageDraft): string {
  const bullets = d.bullets.map((b) => `- ${b}`).join("\n");
  return `## ${d.headline}

${d.subheadline}

${d.hook}

## What the AI Does

${bullets}

## The Result

${d.result}

## ${d.cta}`;
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground";

export function LandingPageCreator() {
  const router = useRouter();
  const [niches, setNiches] = useState<NicheOption[]>([]);
  const [nichePackId, setNichePackId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<LandingPageDraft | null>(null);
  const [body, setBody] = useState("");
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
    if (!nichePackId) {
      setError("Select a niche pack first");
      return;
    }
    setGenerating(true);
    setError(null);
    setDraft(null);
    try {
      const res = await fetch("/api/ai/draft-landing-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nichePackId }),
      });
      const data = await res.json() as { draft?: LandingPageDraft; nicheName?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }
      const d = data.draft!;
      setDraft(d);
      setBody(draftToBody(d));
      setTitle(d.suggestedTitle);
      setSlug(d.suggestedSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(publish = false) {
    if (!body.trim() || !title.trim()) {
      setError("Title and body are required");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          title,
          tagline: draft?.subheadline ?? "",
          problemStatement: draft?.hook ?? "",
          body,
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
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setSuccess(publish ? "Published!" : "Saved as draft");
      if (data.template?.id) {
        router.push(`/admin/templates/${data.template.id}/edit`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="surface-card overflow-hidden">
      {/* Header — click to toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="icon-badge h-6 w-6">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
          </span>
          <span className="text-sm font-medium">Niche Landing Page Generator</span>
          <span className="text-xs text-muted-foreground">— condensed Facebook / paid-ad copy</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
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

          {/* Generated copy — editable */}
          {draft && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Page title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Slug</label>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">
                  Copy{" "}
                  <span className="text-muted-foreground font-normal">(Markdown — edit freely)</span>
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={18}
                  className={`${inputCls} font-mono text-sm`}
                />
              </div>

              <div className="flex items-center gap-2 justify-end pt-1">
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
