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
  resendFromAddress: string;
  apifyTokenConfigured: boolean;
  freeSignupCredits: number;
};

type PricingCurrency = "USD" | "GBP" | "EUR";

type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  highlight?: "best" | "popular";
};

type PricingResponse = {
  currencies: PricingCurrency[];
  packages: CreditPackage[];
  table: Record<string, Record<PricingCurrency, number>>;
};

export function SettingsForm() {
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const [anthropicModel, setAnthropicModel] = useState("claude-sonnet-4-5");
  const [serperApiKey, setSerperApiKey] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFromAddress, setResendFromAddress] = useState("");
  const [apifyToken, setApifyToken] = useState("");
  const [freeSignupCredits, setFreeSignupCredits] = useState<number>(25);

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
  const [savingPricing, setSavingPricing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customerMessage, setCustomerMessage] = useState<string | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [pricingMessage, setPricingMessage] = useState<string | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingCurrencies, setPricingCurrencies] = useState<PricingCurrency[]>(["USD", "GBP", "EUR"]);
  const [pricingPackages, setPricingPackages] = useState<CreditPackage[]>([]);
  const [pricingValues, setPricingValues] = useState<Record<string, Record<PricingCurrency, string>>>({});
  const [creditAmounts, setCreditAmounts] = useState<Record<string, string>>({});

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
        setResendFromAddress(data.resendFromAddress || "");
        setApifyConfigured(data.apifyTokenConfigured);
        setFreeSignupCredits(data.freeSignupCredits ?? 25);

        const pricingRes = await fetch("/api/admin/credit-pricing", { cache: "no-store" });
        if (pricingRes.ok) {
          const pricingData = (await pricingRes.json()) as PricingResponse;
          setPricingCurrencies(pricingData.currencies);
          setPricingPackages(pricingData.packages);
          const nextValues: Record<string, Record<PricingCurrency, string>> = {};
          const nextAmounts: Record<string, string> = {};
          for (const pkg of pricingData.packages) {
            const row = pricingData.table[pkg.id] ?? { USD: pkg.priceCents, GBP: pkg.priceCents, EUR: pkg.priceCents };
            nextValues[pkg.id] = {
              USD: ((row.USD ?? pkg.priceCents) / 100).toFixed(2),
              GBP: ((row.GBP ?? pkg.priceCents) / 100).toFixed(2),
              EUR: ((row.EUR ?? pkg.priceCents) / 100).toFixed(2),
            };
            nextAmounts[pkg.id] = String(pkg.credits);
          }
          setPricingValues(nextValues);
          setCreditAmounts(nextAmounts);
        }
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
          resendFromAddress,
          apifyToken,
          freeSignupCredits,
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

  async function handleSavePricing() {
    setSavingPricing(true);
    setPricingMessage(null);
    setPricingError(null);

    try {
      const payload: Record<string, Record<PricingCurrency, number>> = {};
      const creditsPayload: Record<string, number> = {};
      for (const pkg of pricingPackages) {
        const row = pricingValues[pkg.id];
        if (!row) continue;
        const usd = Number.parseFloat(row.USD);
        const gbp = Number.parseFloat(row.GBP);
        const eur = Number.parseFloat(row.EUR);
        if (![usd, gbp, eur].every((n) => Number.isFinite(n) && n > 0)) {
          throw new Error(`Invalid pricing for ${pkg.name}. Use positive amounts.`);
        }
        payload[pkg.id] = {
          USD: Math.round(usd * 100),
          GBP: Math.round(gbp * 100),
          EUR: Math.round(eur * 100),
        };
        const credits = parseInt(creditAmounts[pkg.id] ?? String(pkg.credits), 10);
        if (credits > 0) creditsPayload[pkg.id] = credits;
      }

      const res = await fetch("/api/admin/credit-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: payload, credits: creditsPayload }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save credit pricing");
      }

      setPricingMessage("Credit pricing saved.");
    } catch (err) {
      setPricingError(err instanceof Error ? err.message : "Failed to save credit pricing");
    } finally {
      setSavingPricing(false);
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
          <h2 className="font-semibold">Free Signup Credits</h2>
          <p className="text-xs text-muted-foreground">
            Number of credits new users receive on signup. Displayed across the signup page, templates, and marketing copy.
          </p>
          <label className="block text-sm space-y-1">
            <span className="font-medium">Credits on signup</span>
            <input
              type="number"
              min={0}
              max={10000}
              step={1}
              value={freeSignupCredits}
              onChange={(e) => setFreeSignupCredits(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-32 rounded-lg border bg-background/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
        </section>

        <section className="surface-card p-5 space-y-3">
          <h2 className="font-semibold">Credits Pricing Table</h2>
          <p className="text-xs text-muted-foreground">
            Set friendly local prices for each slider tier. These values drive Stripe checkout amounts.
          </p>

          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3 font-medium">Package</th>
                    <th className="py-2 pr-3 font-medium">Credits</th>
                    {pricingCurrencies.map((currency) => (
                      <th key={currency} className="py-2 pr-3 font-medium">{currency}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pricingPackages.map((pkg) => (
                    <tr key={pkg.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3">{pkg.name}</td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={creditAmounts[pkg.id] ?? pkg.credits}
                          onChange={(e) =>
                            setCreditAmounts((prev) => ({ ...prev, [pkg.id]: e.target.value }))
                          }
                          className="w-20 rounded-lg border bg-background/80 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </td>
                      {pricingCurrencies.map((currency) => (
                        <td key={`${pkg.id}:${currency}`} className="py-2 pr-3">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={pricingValues[pkg.id]?.[currency] ?? ""}
                            onChange={(e) =>
                              setPricingValues((prev) => ({
                                ...prev,
                                [pkg.id]: {
                                  USD: prev[pkg.id]?.USD ?? "",
                                  GBP: prev[pkg.id]?.GBP ?? "",
                                  EUR: prev[pkg.id]?.EUR ?? "",
                                  [currency]: e.target.value,
                                },
                              }))
                            }
                            className="w-28 rounded-lg border bg-background/80 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="0.00"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void handleSavePricing();
                }}
                disabled={savingPricing || pricingPackages.length === 0}
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 hover:bg-primary/90 disabled:opacity-60"
              >
                {savingPricing ? "Saving..." : "Save Credit Pricing"}
              </button>
              {pricingMessage && <p className="text-sm text-green-700">{pricingMessage}</p>}
              {pricingError && <p className="text-sm text-red-700">{pricingError}</p>}
            </div>
          </div>
        </section>

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
            Sends magic-link sign-in emails and powers the <code>send_email</code> agent skill. Get a free API key at{" "}
            <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">
              resend.com
            </a>. Your domain must be verified in Resend before emails will send.
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
          <label className="block text-sm space-y-1">
            <span className="font-medium">From Address</span>
            <input
              type="email"
              value={resendFromAddress}
              onChange={(e) => setResendFromAddress(e.target.value)}
              className={inputCls}
              placeholder="hello@stridivo.com"
              autoComplete="off"
            />
            <span className="text-xs text-muted-foreground">
              The address sign-in emails are sent from. Must match your verified domain in Resend.
            </span>
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

