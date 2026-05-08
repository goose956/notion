"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";

export default function AdminNewNichePage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const draftRes = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      if (!draftRes.ok) {
        const body = await draftRes.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Draft failed");
      }

      const { pack } = await draftRes.json() as { pack: { id: string } };

      const saveRes = await fetch("/api/niche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pack),
      });

      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Save failed");
      }

      router.push(`/admin/niches/${pack.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">New Niche Pack</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Describe your target audience and use case. AI will generate a full
          Notion workspace schema.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">Niche description</Label>
          <Textarea
            id="description"
            placeholder={
              "e.g. Real estate investors tracking BRRRR deals — they need a pipeline of properties, comp analysis, and task management for renovations."
            }
            className="min-h-[140px] resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Be specific about what your users track, calculate, and decide.
          </p>
        </div>

        {error !== null && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleGenerate}
            disabled={loading || !description.trim()}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "Generating…" : "Generate with AI"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/admin/niches")}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </div>

      {loading && (
        <div className="mt-8 rounded-lg border bg-muted/30 p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">Generating your niche pack…</p>
          <p className="text-xs text-muted-foreground mt-1">
            Claude is designing databases, properties, and adapters. This takes
            ~15 seconds.
          </p>
        </div>
      )}
    </div>
  );
}
