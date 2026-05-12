"use client";

import { useEffect, useState } from "react";

type SettingsResponse = {
  stripeSecretKeyConfigured: boolean;
  stripeWebhookSecretConfigured: boolean;
  anthropicApiKeyConfigured: boolean;
  anthropicModel: string;
};

export function SettingsForm() {
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [anthropicModel, setAnthropicModel] = useState("claude-3-5-sonnet-20241022");

  const [stripeSecretConfigured, setStripeSecretConfigured] = useState(false);
  const [stripeWebhookConfigured, setStripeWebhookConfigured] = useState(false);
  const [anthropicConfigured, setAnthropicConfigured] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const data = (await res.json()) as SettingsResponse;
        if (!res.ok) {
          throw new Error("Failed to load settings");
        }
        setStripeSecretConfigured(data.stripeSecretKeyConfigured);
        setStripeWebhookConfigured(data.stripeWebhookSecretConfigured);
        setAnthropicConfigured(data.anthropicApiKeyConfigured);
        setAnthropicModel(data.anthropicModel || "claude-3-5-sonnet-20241022");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    load().catch(() => undefined);
  }, []);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripeSecretKey,
          stripeWebhookSecret,
          anthropicApiKey,
          anthropicModel,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save settings");
      }

      setStripeSecretConfigured((prev) => prev || stripeSecretKey.trim().length > 0);
      setStripeWebhookConfigured((prev) => prev || stripeWebhookSecret.trim().length > 0);
      setAnthropicConfigured((prev) => prev || anthropicApiKey.trim().length > 0);

      setStripeSecretKey("");
      setStripeWebhookSecret("");
      setAnthropicApiKey("");

      setMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border bg-background/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading settings...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <section className="surface-card p-5 space-y-3">
        <h2 className="font-semibold">Stripe</h2>
        <p className="text-xs text-muted-foreground">
          Leave a field blank to keep the existing stored value.
        </p>

        <label className="block text-sm space-y-1">
          <span className="font-medium">Secret Key</span>
          <input
            type="password"
            value={stripeSecretKey}
            onChange={(e) => setStripeSecretKey(e.target.value)}
            className={inputCls}
            placeholder={stripeSecretConfigured ? "Configured (enter new value to replace)" : "sk_live_..."}
            autoComplete="off"
          />
        </label>

        <label className="block text-sm space-y-1">
          <span className="font-medium">Webhook Secret</span>
          <input
            type="password"
            value={stripeWebhookSecret}
            onChange={(e) => setStripeWebhookSecret(e.target.value)}
            className={inputCls}
            placeholder={stripeWebhookConfigured ? "Configured (enter new value to replace)" : "whsec_..."}
            autoComplete="off"
          />
        </label>
      </section>

      <section className="surface-card p-5 space-y-3">
        <h2 className="font-semibold">Anthropic</h2>

        <label className="block text-sm space-y-1">
          <span className="font-medium">API Key</span>
          <input
            type="password"
            value={anthropicApiKey}
            onChange={(e) => setAnthropicApiKey(e.target.value)}
            className={inputCls}
            placeholder={anthropicConfigured ? "Configured (enter new value to replace)" : "sk-ant-..."}
            autoComplete="off"
          />
        </label>

        <label className="block text-sm space-y-1">
          <span className="font-medium">Model</span>
          <input
            value={anthropicModel}
            onChange={(e) => setAnthropicModel(e.target.value)}
            className={inputCls}
            placeholder="claude-3-5-sonnet-20241022"
          />
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {message && <p className="text-sm text-green-700">{message}</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </form>
  );
}
