"use client";

import { useEffect, useState } from "react";

const CLAUDE_MODELS = [
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5 (recommended)" },
  { value: "claude-opus-4-5", label: "Claude Opus 4.5 (most capable)" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fastest)" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (legacy)" },
] as const;

type SettingsResponse = {
  stripeSecretKeyConfigured: boolean;
  stripeWebhookSecretConfigured: boolean;
  anthropicApiKeyConfigured: boolean;
  anthropicModel: string;
  serperApiKeyConfigured: boolean;
  resendApiKeyConfigured: boolean;
  apifyTokenConfigured: boolean;
};

export function SettingsForm() {
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [anthropicModel, setAnthropicModel] = useState("claude-sonnet-4-5");
  const [serperApiKey, setSerperApiKey] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [apifyToken, setApifyToken] = useState("");

  const [stripeSecretConfigured, setStripeSecretConfigured] = useState(false);
  const [stripeWebhookConfigured, setStripeWebhookConfigured] = useState(false);
  const [anthropicConfigured, setAnthropicConfigured] = useState(false);
  const [serperConfigured, setSerperConfigured] = useState(false);
  const [resendConfigured, setResendConfigured] = useState(false);
  const [apifyConfigured, setApifyConfigured] = useState(false);

  // Per-customer key section
  const [customerKeyId, setCustomerKeyId] = useState("");
  const [customerApiKey, setCustomerApiKey] = useState("");

  const [saving, setSaving] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customerMessage, setCustomerMessage] = useState<string | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);

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
        setAnthropicModel(data.anthropicModel || "claude-sonnet-4-5");
        setSerperConfigured(data.serperApiKeyConfigured);
        setResendConfigured(data.resendApiKeyConfigured);
        setApifyConfigured(data.apifyTokenConfigured);
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
          serperApiKey,
          resendApiKey,
          apifyToken,
          customerApiKeyId: customerKeyId.trim() || undefined,
          customerApiKey: customerApiKey.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save settings");
      }

      setStripeSecretConfigured((prev) => prev || stripeSecretKey.trim().length > 0);
      setStripeWebhookConfigured((prev) => prev || stripeWebhookSecret.trim().length > 0);
      setAnthropicConfigured((prev) => prev || anthropicApiKey.trim().length > 0);
      setSerperConfigured((prev) => prev || serperApiKey.trim().length > 0);
      setResendConfigured((prev) => prev || resendApiKey.trim().length > 0);
      setApifyConfigured((prev) => prev || apifyToken.trim().length > 0);

      setStripeSecretKey("");
      setStripeWebhookSecret("");
      setAnthropicApiKey("");
      setSerperApiKey("");
      setResendApiKey("");
      setApifyToken("");

      setMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCustomerKey(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (customerKeyId.trim() === "" || customerApiKey.trim() === "") return;

    setSavingCustomer(true);
    setCustomerMessage(null);
    setCustomerError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerApiKeyId: customerKeyId.trim(),
          customerApiKey: customerApiKey.trim(),
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save customer key");
      }

      setCustomerKeyId("");
      setCustomerApiKey("");
      setCustomerMessage(`Key saved for customer: ${customerKeyId.trim()}`);
    } catch (err) {
      setCustomerError(err instanceof Error ? err.message : "Failed to save customer key");
    } finally {
      setSavingCustomer(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border bg-background/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
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
          <h2 className="font-semibold">Anthropic (Global)</h2>

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
            <select
              value={anthropicModel}
              onChange={(e) => setAnthropicModel(e.target.value)}
              className={inputCls}
            >
              {CLAUDE_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              Default model for all agent runs. Can be overridden per agent definition.
            </span>
          </label>
        </section>

        <section className="surface-card p-5 space-y-3">
          <h2 className="font-semibold">Web Search (Serper.dev)</h2>
          <p className="text-xs text-muted-foreground">
            Powers the <code>web_search</code> agent skill. Get a free API key at{" "}
            <a href="https://serper.dev" target="_blank" rel="noopener noreferrer" className="underline">
              serper.dev
            </a>.
          </p>
          <label className="block text-sm space-y-1">
            <span className="font-medium">API Key</span>
            <input
              type="password"
              value={serperApiKey}
              onChange={(e) => setSerperApiKey(e.target.value)}
              className={inputCls}
              placeholder={serperConfigured ? "Configured (enter new value to replace)" : "...serper API key"}
              autoComplete="off"
            />
            {serperConfigured && (
              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                <span>✓</span> Configured
              </span>
            )}
          </label>
        </section>

        <section className="surface-card p-5 space-y-3">
          <h2 className="font-semibold">Email (Resend)</h2>
          <p className="text-xs text-muted-foreground">
            Powers the <code>send_email</code> agent skill. Get a free API key at{" "}
            <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">
              resend.com
            </a>.
          </p>
          <label className="block text-sm space-y-1">
            <span className="font-medium">API Key</span>
            <input
              type="password"
              value={resendApiKey}
              onChange={(e) => setResendApiKey(e.target.value)}
              className={inputCls}
              placeholder={resendConfigured ? "Configured (enter new value to replace)" : "re_..."}
              autoComplete="off"
            />
            {resendConfigured && (
              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                <span>✓</span> Configured
              </span>
            )}
          </label>
        </section>

        <section className="surface-card p-5 space-y-3">
          <h2 className="font-semibold">Web Scraping (Apify)</h2>
          <p className="text-xs text-muted-foreground">
            Powers the <code>run_apify</code> agent skill. Get a free token at{" "}
            <a href="https://apify.com" target="_blank" rel="noopener noreferrer" className="underline">
              apify.com
            </a>.
          </p>
          <label className="block text-sm space-y-1">
            <span className="font-medium">API Token</span>
            <input
              type="password"
              value={apifyToken}
              onChange={(e) => setApifyToken(e.target.value)}
              className={inputCls}
              placeholder={apifyConfigured ? "Configured (enter new value to replace)" : "apify_api_..."}
              autoComplete="off"
            />
            {apifyConfigured && (
              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                <span>✓</span> Configured
              </span>
            )}
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

      {/* Per-customer Anthropic key */}
      <form onSubmit={handleSaveCustomerKey} className="space-y-3">
        <section className="surface-card p-5 space-y-3">
          <h2 className="font-semibold">Anthropic (Per-Customer Key)</h2>
          <p className="text-xs text-muted-foreground">
            Assign a customer-specific Anthropic key. When set, it takes priority over the global
            key for that customer&apos;s agent runs.
          </p>

          <label className="block text-sm space-y-1">
            <span className="font-medium">Customer ID</span>
            <input
              type="text"
              value={customerKeyId}
              onChange={(e) => setCustomerKeyId(e.target.value)}
              className={inputCls}
              placeholder="e.g. notion-user-id or email"
              autoComplete="off"
            />
          </label>

          <label className="block text-sm space-y-1">
            <span className="font-medium">API Key</span>
            <input
              type="password"
              value={customerApiKey}
              onChange={(e) => setCustomerApiKey(e.target.value)}
              className={inputCls}
              placeholder="sk-ant-..."
              autoComplete="off"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingCustomer || customerKeyId.trim() === "" || customerApiKey.trim() === ""}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 hover:bg-primary/90 disabled:opacity-60"
            >
              {savingCustomer ? "Saving..." : "Save Customer Key"}
            </button>
            {customerMessage && <p className="text-sm text-green-700">{customerMessage}</p>}
            {customerError && <p className="text-sm text-red-700">{customerError}</p>}
          </div>
        </section>
      </form>
    </div>
  );
}

