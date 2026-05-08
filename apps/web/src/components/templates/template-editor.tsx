"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TemplateRow } from "@niche-factory/db";

type FaqItem = { question: string; answer: string };

interface FormState {
  id?: string;
  slug: string;
  title: string;
  tagline: string;
  problemStatement: string;
  body: string;
  faq: FaqItem[];
  category: string;
  tags: string;
  stripePaymentLink: string;
  published: boolean;
}

function toFormState(row?: TemplateRow): FormState {
  if (!row) {
    return {
      slug: "",
      title: "",
      tagline: "",
      problemStatement: "",
      body: "",
      faq: [{ question: "", answer: "" }],
      category: "",
      tags: "",
      stripePaymentLink: "",
      published: false,
    };
  }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: row.tagline,
    problemStatement: row.problemStatement,
    body: row.body,
    faq: (row.faq as FaqItem[]).length > 0 ? (row.faq as FaqItem[]) : [{ question: "", answer: "" }],
    category: row.category,
    tags: ((row.tags as string[]) ?? []).join(", "),
    stripePaymentLink: row.stripePaymentLink,
    published: row.published,
  };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function TemplateEditor({ initialRow }: { initialRow?: TemplateRow }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(toFormState(initialRow));
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setFaq(index: number, field: keyof FaqItem, value: string) {
    setForm((prev) => {
      const faq = prev.faq.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      );
      return { ...prev, faq };
    });
  }

  function addFaqRow() {
    setForm((prev) => ({ ...prev, faq: [...prev.faq, { question: "", answer: "" }] }));
  }

  function removeFaqRow(index: number) {
    setForm((prev) => ({ ...prev, faq: prev.faq.filter((_, i) => i !== index) }));
  }

  async function handleAiDraft() {
    if (!form.title.trim()) {
      setError("Enter a title first before generating a draft");
      return;
    }
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/draft-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title }),
      });
      const body = await res.json().catch(() => ({})) as {
        draft?: {
          tagline?: string;
          problemStatement?: string;
          body?: string;
          faq?: FaqItem[];
          category?: string;
          tags?: string[];
        };
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "AI draft failed");
        return;
      }
      const d = body.draft ?? {};
      setForm((prev) => ({
        ...prev,
        tagline: d.tagline ?? prev.tagline,
        problemStatement: d.problemStatement ?? prev.problemStatement,
        body: d.body ?? prev.body,
        faq: (d.faq && d.faq.length > 0) ? d.faq : prev.faq,
        category: d.category ?? prev.category,
        tags: d.tags ? d.tags.join(", ") : prev.tags,
      }));
      setSuccess("AI draft applied — review and edit before saving");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI draft failed");
    } finally {
      setDrafting(false);
    }
  }

  async function handleSave(publish?: boolean) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      id: form.id,
      slug: form.slug || slugify(form.title),
      title: form.title,
      tagline: form.tagline,
      problemStatement: form.problemStatement,
      body: form.body,
      faq: form.faq.filter((f) => f.question.trim()),
      category: form.category,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      stripePaymentLink: form.stripePaymentLink,
      published: publish !== undefined ? publish : form.published,
    };

    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({})) as { template?: TemplateRow; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Save failed");
        return;
      }
      setSuccess(publish !== undefined ? (publish ? "Published!" : "Unpublished") : "Saved");
      if (!form.id && body.template?.id) {
        router.replace(`/admin/templates/${body.template.id}/edit`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const autoSlug = form.slug || slugify(form.title);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => router.push("/admin/templates")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold flex-1">
          {form.id ? "Edit Template" : "New Template"}
        </h1>
        <button
          type="button"
          onClick={handleAiDraft}
          disabled={drafting}
          className="inline-flex items-center gap-1.5 rounded-md border text-sm font-medium h-9 px-4 hover:bg-muted transition-colors disabled:opacity-60"
        >
          {drafting ? "Drafting…" : "✦ AI Draft"}
        </button>
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving}
          className="inline-flex items-center rounded-md border text-sm font-medium h-9 px-4 hover:bg-muted transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Draft"}
        </button>
        <button
          type="button"
          onClick={() => handleSave(!form.published)}
          disabled={saving}
          className="inline-flex items-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {form.published ? "Unpublish" : "Publish"}
        </button>
      </div>

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

      {/* Core fields */}
      <section className="space-y-4">
        <Field label="Title">
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Track YouTube videos for forex niche"
            className={inputCls}
          />
        </Field>

        <Field label={`Slug — /templates/${autoSlug || "…"}`}>
          <input
            value={form.slug}
            onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="auto-generated from title"
            className={inputCls}
          />
        </Field>

        <Field label="Tagline (one-liner shown in cards)">
          <input
            value={form.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder="Stop manually tracking forex YouTube channels in spreadsheets"
            className={inputCls}
          />
        </Field>

        <Field label="Problem Statement">
          <textarea
            value={form.problemStatement}
            onChange={(e) => set("problemStatement", e.target.value)}
            rows={4}
            placeholder="Describe the exact workflow problem this template solves…"
            className={inputCls}
          />
        </Field>

        <Field label="Category">
          <input
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="Finance, Marketing, Productivity…"
            className={inputCls}
          />
        </Field>

        <Field label="Tags (comma-separated)">
          <input
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="forex, youtube, content tracker"
            className={inputCls}
          />
        </Field>

        <Field label="Stripe Payment Link">
          <input
            value={form.stripePaymentLink}
            onChange={(e) => set("stripePaymentLink", e.target.value)}
            placeholder="https://buy.stripe.com/…"
            className={inputCls}
          />
        </Field>
      </section>

      {/* Body */}
      <section className="space-y-2">
        <label className="block text-sm font-medium">
          Page Body{" "}
          <span className="text-muted-foreground font-normal">(Markdown — use ## for headings)</span>
        </label>
        <textarea
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
          rows={14}
          placeholder={"## Who This Is For\n\n## What's Inside\n\n## How It Works"}
          className={`${inputCls} font-mono text-sm`}
        />
      </section>

      {/* FAQ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">FAQ</label>
          <button
            type="button"
            onClick={addFaqRow}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            + Add question
          </button>
        </div>
        {form.faq.map((item, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3 relative">
            <button
              type="button"
              onClick={() => removeFaqRow(i)}
              className="absolute top-3 right-3 text-xs text-muted-foreground hover:text-destructive"
              aria-label="Remove"
            >
              ✕
            </button>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Question</label>
              <input
                value={item.question}
                onChange={(e) => setFaq(i, "question", e.target.value)}
                placeholder="Does this work with any Notion account?"
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Answer</label>
              <textarea
                value={item.answer}
                onChange={(e) => setFaq(i, "answer", e.target.value)}
                rows={3}
                placeholder="Yes, it works with any free or paid Notion plan."
                className={inputCls}
              />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground";
