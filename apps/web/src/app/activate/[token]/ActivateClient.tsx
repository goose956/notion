"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ActivateClientProps {
  token: string;
}

interface OnboardingQuestion {
  id: string;
  question: string;
  type: "text" | "number" | "select" | "multi_select";
  required: boolean;
  hint?: string;
  options?: string[];
}

// Maps a country answer to a currency code for checkout pre-fill.
// Works for any niche that has a *-country or country question with standard country names.
function currencyFromCountry(country: string): string {
  const map: Record<string, string> = {
    "united states": "USD",
    "canada": "CAD",
    "australia": "AUD",
    "new zealand": "NZD",
    "europe (eur)": "EUR",
  };
  return map[country.toLowerCase().trim()] ?? "GBP";
}

export default function ActivateClient({ token }: ActivateClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"activating" | "onboarding" | "saving" | "success" | "error">("activating");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [nichePackId, setNichePackId] = useState<string>("");
  const [nicheName, setNicheName] = useState<string>("");
  const [credits, setCredits] = useState<number>(0);
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function activate() {
      try {
        const res = await fetch("/api/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          nichePackId?: string;
          credits?: number;
          hasCriteria?: boolean;
        };

        if (cancelled) return;

        if (!res.ok || !data.ok) {
          setErrorMessage(data.error ?? "Activation failed. Please try again or contact support.");
          setStatus("error");
          return;
        }

        const niche = data.nichePackId ?? "";
        setNichePackId(niche);
        setCredits(data.credits ?? 0);

        // Fetch the niche pack to get onboarding questions
        if (niche && !data.hasCriteria) {
          const packRes = await fetch(`/api/niche/${niche}`);
          if (packRes.ok) {
            const packData = (await packRes.json()) as {
              nichePack?: { schemaSnapshot?: { name?: string; onboardingQuestions?: OnboardingQuestion[] } };
            };
            const snap = packData.nichePack?.schemaSnapshot;
            const qs = snap?.onboardingQuestions ?? [];
            setNicheName(snap?.name ?? formatNicheId(niche));

            if (qs.length > 0) {
              setQuestions(qs);
              // Initialise answers with empty values
              const init: Record<string, string | string[]> = {};
              for (const q of qs) {
                init[q.id] = q.type === "multi_select" ? [] : "";
              }
              setAnswers(init);
              setStatus("onboarding");
              return;
            }
          }
        }

        setStatus("success");
        setTimeout(() => { if (!cancelled) router.push("/members"); }, 3000);
      } catch {
        if (!cancelled) {
          setErrorMessage("Network error. Please check your connection and try again.");
          setStatus("error");
        }
      }
    }

    void activate();
    return () => { cancelled = true; };
  }, [token, router]);

  async function handleOnboardingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOnboardingError(null);

    const missing = questions.filter((q) => {
      if (!q.required) return false;
      const val = answers[q.id];
      if (Array.isArray(val)) return val.length === 0;
      return !String(val ?? "").trim();
    });
    if (missing.length > 0) {
      setOnboardingError(`Please fill in: ${missing.map((q) => q.question).join(", ")}`);
      return;
    }

    setStatus("saving");

    const payload: Record<string, unknown> = {};
    for (const q of questions) {
      const val = answers[q.id];
      if (Array.isArray(val)) {
        if (val.length > 0) payload[q.id] = val;
      } else {
        const s = String(val ?? "").trim();
        if (s) payload[q.id] = q.type === "number" ? (Number(s) || s) : s;
      }
    }

    // Auto-derive currency-code from any country-type answer
    const countryEntry = Object.entries(payload).find(
      ([k]) => k === "country" || k.endsWith("-country"),
    );
    if (countryEntry && typeof countryEntry[1] === "string") {
      payload["currency-code"] = currencyFromCountry(countryEntry[1]);
    }

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicheId: nichePackId, answers: payload }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setOnboardingError(d.error ?? "Failed to save. Please try again.");
        setStatus("onboarding");
        return;
      }
    } catch {
      setOnboardingError("Network error. Please try again.");
      setStatus("onboarding");
      return;
    }

    setStatus("success");
    setTimeout(() => router.push("/members"), 1500);
  }

  // ── Activating ───────────────────────────────────────────────────────────────
  if (status === "activating") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Spinner />
            </div>
          </div>
          <h1 className="text-xl font-semibold">Activating your plan…</h1>
          <p className="text-sm text-muted-foreground">Setting up your workspace, just a moment.</p>
        </div>
      </div>
    );
  }

  // ── Onboarding form ───────────────────────────────────────────────────────────
  if (status === "onboarding" || status === "saving") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-semibold">One last step!</h1>
            <p className="text-sm text-muted-foreground">
              Tell us about your {nicheName} so we can personalise your dashboard right away.
            </p>
          </div>

          <form onSubmit={(e) => { void handleOnboardingSubmit(e); }} className="space-y-4 surface-card p-5 rounded-lg">
            {questions.map((q) => (
              <div key={q.id} className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor={`ob-${q.id}`}>
                  {q.question}{q.required && <span className="text-red-500"> *</span>}
                </label>
                {q.type === "select" ? (
                  <select
                    id={`ob-${q.id}`}
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select…</option>
                    {(q.options ?? []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : q.type === "multi_select" ? (
                  <div className="flex flex-wrap gap-2">
                    {(q.options ?? []).map((opt) => {
                      const selected = (answers[q.id] as string[]).includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers((prev) => {
                            const cur = prev[q.id] as string[];
                            return { ...prev, [q.id]: selected ? cur.filter((o) => o !== opt) : [...cur, opt] };
                          })}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background border-input hover:bg-muted"}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    id={`ob-${q.id}`}
                    type={q.type === "number" ? "number" : "text"}
                    placeholder={q.hint}
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            ))}

            {onboardingError && (
              <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2 border border-red-200">{onboardingError}</p>
            )}

            <button
              type="submit"
              disabled={status === "saving"}
              className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {status === "saving" ? "Saving…" : "Open my dashboard →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-semibold text-green-700">You&apos;re all set!</h1>
          <p className="text-sm text-muted-foreground">
            Your account has been upgraded with <strong>{credits} credits</strong>
            {nichePackId ? ` and your ${nicheName || formatNicheId(nichePackId)} workspace is ready.` : "."}
          </p>
          <p className="text-xs text-muted-foreground">Redirecting you to your dashboard…</p>
          <Link
            href="/members"
            className="inline-block mt-2 px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-sm px-6">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
        <h1 className="text-xl font-semibold text-red-700">Activation failed</h1>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Link
          href="/members"
          className="inline-block mt-2 px-5 py-2 rounded-md border border-input text-sm font-medium hover:bg-muted transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

function formatNicheId(id: string): string {
  return id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function Spinner() {
  return (
    <svg className="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
