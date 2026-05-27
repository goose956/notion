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
}

export function CreateLinkForm({ niches }: Props) {
  const [nichePackId, setNichePackId] = useState(niches[0]?.id ?? "");
  const [credits, setCredits] = useState(500);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/activation-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nichePackId, credits, label }),
      });
      let data: { link?: { token: string; nichePackId: string; credits: number; label: string }; url?: string; error?: string } = {};
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
        url: data.url ?? "",
        nichePackId: data.link.nichePackId,
        credits: data.link.credits,
        label: data.link.label,
      });
      setLabel("");
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
          Each link is single-use. Share the generated URL with a buyer.
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
              Link created — share this URL with your buyer:
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
