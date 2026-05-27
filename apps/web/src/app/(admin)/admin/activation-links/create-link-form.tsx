"use client";

import { useState } from "react";
import { Link2, Copy, Check } from "lucide-react";

interface NicheOption {
  id: string;
  name: string;
}

interface Props {
  niches: NicheOption[];
}

interface CreatedLink {
  token: string;
  url: string;
  nichePackId: string;
  credits: number;
  label: string;
  maxUses?: number;
}

export function CreateLinkForm({ niches }: Props) {
  const [nichePackId, setNichePackId] = useState(niches[0]?.id ?? "");
  const [credits, setCredits] = useState(500);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = { nichePackId, credits, label };
      if (maxUses.trim() !== "") body["maxUses"] = parseInt(maxUses, 10);
      if (expiresAt.trim() !== "") body["expiresAt"] = new Date(expiresAt).toISOString();
      if (source.trim() !== "") body["source"] = source.trim();
      if (medium.trim() !== "") body["medium"] = medium.trim();
      if (campaign.trim() !== "") body["campaign"] = campaign.trim();

      const res = await fetch("/api/admin/activation-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let data: { link?: { token: string; nichePackId: string; credits: number; label: string; maxUses?: number }; url?: string; error?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setError("Server returned an unexpected response. Check the deploy logs.");
        return;
      }
      if (!res.ok || !data.link) {
        setError(data.error ?? "Failed to create link");
        return;
      }
      setCreated({
        token: data.link.token,
        url: (() => {
          const raw = data.url ?? "";
          if (raw.startsWith("/")) return window.location.origin + raw;
          return raw;
        })(),
        nichePackId: data.link.nichePackId,
        credits: data.link.credits,
        label: data.link.label,
        ...(data.link.maxUses != null ? { maxUses: data.link.maxUses } : {}),
      });
      setLabel("");
      setMaxUses("");
      setExpiresAt("");
      setSource("");
      setMedium("");
      setCampaign("");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm">Create activation link</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Share the generated URL with a buyer. Optionally limit uses or set an expiry date.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="niche">Niche pack</label>
            <select
              id="niche"
              value={nichePackId}
              onChange={(e) => setNichePackId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {niches.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="credits">Credits</label>
            <input
              id="credits"
              type="number"
              min={1}
              max={100000}
              value={credits}
              onChange={(e) => setCredits(Number(e.target.value))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="label">Label (optional)</label>
            <input
              id="label"
              type="text"
              placeholder="e.g. Etsy – May 2025"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={200}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="maxUses">Max uses (leave empty for unlimited)</label>
            <input
              id="maxUses"
              type="number"
              min={1}
              placeholder="e.g. 100"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="expiresAt">Expiry date (leave empty for no expiry)</label>
            <input
              id="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="source">Source (optional)</label>
            <input
              id="source"
              type="text"
              placeholder="e.g. etsy, notion, pinterest"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              maxLength={100}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="medium">Medium (optional)</label>
            <input
              id="medium"
              type="text"
              placeholder="e.g. pdf_guide, free_template"
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              maxLength={100}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="campaign">Campaign (optional)</label>
            <input
              id="campaign"
              type="text"
              placeholder="e.g. wedding-planner-may"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              maxLength={100}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2 border border-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !nichePackId}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Link2 className="h-3.5 w-3.5" />
          {loading ? "Creating…" : "Create link"}
        </button>
      </form>

      {created && (
        <div className="px-4 pb-4">
          <div className="rounded-md border border-green-200 bg-green-50 p-3 space-y-2">
            <p className="text-xs font-medium text-green-800">
              Link created{created.maxUses != null ? ` (max ${created.maxUses} uses)` : " (unlimited uses)"} — share this URL:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white rounded border px-2 py-1.5 font-mono truncate">
                {created.url}
              </code>
              <button
                type="button"
                onClick={() => copyUrl(created.url)}
                className="shrink-0 p-1.5 rounded border hover:bg-green-100 transition-colors"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-green-700" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
