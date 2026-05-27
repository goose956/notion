"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ActivateClientProps {
  token: string;
}

// Wedding-specific onboarding questions shown after activation
const WEDDING_QUESTIONS = [
  { id: "wedding-country", label: "Country", type: "select", required: true, options: ["United Kingdom", "United States", "Canada", "Australia", "New Zealand", "Europe (EUR)"] },
  { id: "wedding-date", label: "Wedding date or approximate timeframe", type: "text", required: true, placeholder: "e.g. 14 June 2026 or Summer 2026" },
  { id: "wedding-location", label: "Wedding location", type: "text", required: true, placeholder: "e.g. Cotswolds, Edinburgh, Bristol" },
  { id: "guest-count", label: "Guest count", type: "number", required: true, placeholder: "e.g. 80" },
  { id: "total-budget", label: "Total budget (£)", type: "number", required: true, placeholder: "e.g. 15000" },
  { id: "wedding-style", label: "Wedding style (optional)", type: "select", required: false, options: ["Rustic / Barn", "Classic / Traditional", "Modern / Minimalist", "Boho / Wildflower", "Black Tie / Formal", "Outdoor / Festival", "Intimate / Micro-wedding", "Not sure yet"] },
] as const;

type WeddingQId = typeof WEDDING_QUESTIONS[number]["id"];

function getCurrencyCode(country: string | undefined): string {
  switch (country) {
    case "United States": return "USD";
    case "Canada": return "CAD";
    case "Australia": return "AUD";
    case "New Zealand": return "NZD";
    case "Europe (EUR)": return "EUR";
    default: return "GBP";
  }
}

export default function ActivateClient({ token }: ActivateClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"activating" | "onboarding" | "saving" | "success" | "error">("activating");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [nichePackId, setNichePackId] = useState<string>("");
  const [credits, setCredits] = useState<number>(0);
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<WeddingQId, string>>({
    "wedding-country": "United Kingdom",
    "wedding-date": "",
    "wedding-location": "",
    "guest-count": "",
    "total-budget": "",
    "wedding-style": "",
  });
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

        // If wedding planner and no criteria yet, collect onboarding answers first
        if (niche === "wedding-planner" && !data.hasCriteria) {
          setStatus("onboarding");
        } else {
          setStatus("success");
          setTimeout(() => {
            if (!cancelled) router.push("/members");
          }, 3000);
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Network error. Please check your connection and try again.");
          setStatus("error");
        }
      }
    }

    void activate();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  async function handleOnboardingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOnboardingError(null);

    const missing = WEDDING_QUESTIONS.filter((q) => q.required && !onboardingAnswers[q.id]?.trim());
    if (missing.length > 0) {
      setOnboardingError(`Please fill in: ${missing.map((q) => q.label).join(", ")}`);
      return;
    }

    setStatus("saving");

    const answers: Record<string, unknown> = {};
    for (const q of WEDDING_QUESTIONS) {
      const val = onboardingAnswers[q.id];
      if (!val?.trim()) continue;
      answers[q.id] = (q.id === "guest-count" || q.id === "total-budget") ? (Number(val) || val) : val;
    }
    answers["currency-code"] = getCurrencyCode(onboardingAnswers["wedding-country"]);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicheId: "wedding-planner", answers }),
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
              Tell us about your wedding so we can personalise your dashboard right away.
            </p>
          </div>

          <form onSubmit={(e) => { void handleOnboardingSubmit(e); }} className="space-y-4 surface-card p-5 rounded-lg">
            {WEDDING_QUESTIONS.map((q) => (
              <div key={q.id} className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor={`ob-${q.id}`}>
                  {q.label}
                </label>
                {q.type === "select" ? (
                  <select
                    id={`ob-${q.id}`}
                    value={onboardingAnswers[q.id]}
                    onChange={(e) => setOnboardingAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {q.required && <option value="">Select…</option>}
                    {(q as { options: readonly string[] }).options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`ob-${q.id}`}
                    type={q.type}
                    placeholder={"placeholder" in q ? q.placeholder : undefined}
                    value={onboardingAnswers[q.id]}
                    onChange={(e) => setOnboardingAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
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
            {nichePackId ? ` and your ${formatNicheId(nichePackId)} workspace is ready.` : "."}
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

  // error
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
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function Spinner() {
  return (
    <svg
      className="h-6 w-6 animate-spin text-primary"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
