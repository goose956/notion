"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense } from "react";

interface OnboardingQuestion {
  id: string;
  question: string;
  type: "text" | "number" | "select" | "multi_select";
  required: boolean;
  hint?: string;
  options?: string[];
}

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

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl = searchParams.get("callbackUrl") ?? "/members/get-started";
  const templateTitle = searchParams.get("title");
  const isActivationSignup = callbackUrl.startsWith("/activate/");
  const nicheId = /\/members\/setup\/([a-z0-9-]+)$/.exec(callbackUrl)?.[1] ?? undefined;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboardingPopup, setShowOnboardingPopup] = useState(false);

  // Onboarding questions loaded from the niche pack
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([]);
  const [nicheName, setNicheName] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Load niche onboarding questions if a nicheId is in the URL
  useEffect(() => {
    if (!nicheId || isActivationSignup) return;
    setQuestionsLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/niche/${nicheId}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          nichePack?: { schemaSnapshot?: { name?: string; onboardingQuestions?: OnboardingQuestion[] } };
        };
        const snap = data.nichePack?.schemaSnapshot;
        const qs = snap?.onboardingQuestions ?? [];
        setNicheName(snap?.name ?? nicheId);
        setQuestions(qs);
        const init: Record<string, string | string[]> = {};
        for (const q of qs) init[q.id] = q.type === "multi_select" ? [] : "";
        setAnswers(init);
      } finally {
        setQuestionsLoading(false);
      }
    })();
  }, [nicheId, isActivationSignup]);

  const hasOnboardingQuestions = questions.length > 0;

  function getMissingRequired() {
    return questions.filter((q) => {
      if (!q.required) return false;
      const val = answers[q.id];
      if (Array.isArray(val)) return val.length === 0;
      return !String(val ?? "").trim();
    });
  }

  async function submitSignup() {
    setLoading(true);
    try {
      const onboardingAnswers: Record<string, unknown> = {};
      for (const q of questions) {
        const val = answers[q.id];
        if (Array.isArray(val)) {
          if (val.length > 0) onboardingAnswers[q.id] = val;
        } else {
          const s = String(val ?? "").trim();
          if (s) onboardingAnswers[q.id] = q.type === "number" ? (Number(s) || s) : s;
        }
      }

      // Auto-derive currency-code from any country-type answer
      const countryEntry = Object.entries(onboardingAnswers).find(
        ([k]) => k === "country" || k.endsWith("-country"),
      );
      if (countryEntry && typeof countryEntry[1] === "string") {
        onboardingAnswers["currency-code"] = currencyFromCountry(countryEntry[1]);
      }

      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          nicheId: nicheId ?? undefined,
          onboardingAnswers: hasOnboardingQuestions ? onboardingAnswers : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // After signup, go directly to the setup page for the niche (which will
      // auto-deploy since criteria was just saved), or fall back to get-started.
      const postSignupUrl = nicheId
        ? `/members/setup/${nicheId}`
        : callbackUrl && callbackUrl !== "/members/get-started"
          ? callbackUrl
          : "/members/get-started";

      const result = await signIn("email", { email: email.trim(), redirect: false });
      if (result?.error) {
        router.push(postSignupUrl as never);
        return;
      }
      router.push(postSignupUrl as never);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError("Please enter your email address."); return; }

    if (!isActivationSignup && hasOnboardingQuestions && !showOnboardingPopup) {
      setShowOnboardingPopup(true);
      return;
    }

    await submitSignup();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#FAFAF9",
        padding: "24px",
        fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "white",
          borderRadius: "8px",
          border: "1px solid rgba(55,53,47,0.09)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          padding: "clamp(22px, 4vw, 40px) clamp(16px, 4vw, 36px) clamp(20px, 4vw, 36px)",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/s-logo.png" alt="Stridivo" style={{ height: "28px", width: "auto" }} />
          <span style={{ fontWeight: 700, fontSize: "15px", color: "#37352F" }}>Stridivo.com</span>
        </div>

        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#37352F", margin: "0 0 6px", lineHeight: 1.25 }}>
          Create your {isActivationSignup ? "account" : "free account"}
        </h1>

        {isActivationSignup ? (
          <p style={{ fontSize: "14px", color: "rgba(55,53,47,0.65)", margin: "0 0 24px", lineHeight: 1.5 }}>
            Create an account to access your{templateTitle ? <> <strong style={{ color: "#37352F" }}>{templateTitle}</strong></> : ""} workspace.
          </p>
        ) : templateTitle ? (
          <p style={{ fontSize: "14px", color: "rgba(55,53,47,0.65)", margin: "0 0 24px", lineHeight: 1.5 }}>
            Get instant access to <strong style={{ color: "#37352F" }}>{templateTitle}</strong> plus 25 free research credits.
          </p>
        ) : (
          <p style={{ fontSize: "14px", color: "rgba(55,53,47,0.65)", margin: "0 0 24px", lineHeight: 1.5 }}>
            Get started with 25 free research credits — no payment required.
          </p>
        )}

        <form onSubmit={(e) => { void handleSubmit(e); }} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label htmlFor="name" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#37352F", marginBottom: "5px" }}>
              Your name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "4px", border: "1px solid rgba(55,53,47,0.2)", fontSize: "14px", color: "#37352F", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </div>

          <div>
            <label htmlFor="email" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#37352F", marginBottom: "5px" }}>
              Email address <span style={{ color: "rgb(235,87,87)" }}>*</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "4px", border: `1px solid ${error ? "rgb(235,87,87)" : "rgba(55,53,47,0.2)"}`, fontSize: "14px", color: "#37352F", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
            />
          </div>

          {error && <p style={{ margin: 0, fontSize: "13px", color: "rgb(235,87,87)" }}>{error}</p>}

          <button
            type="submit"
            disabled={loading || questionsLoading}
            style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "none", background: loading ? "rgba(245,82,0,0.4)" : "#F55200", color: "white", fontSize: "15px", fontWeight: 600, cursor: loading ? "default" : "pointer", fontFamily: "inherit", marginTop: "4px" }}
          >
            {loading ? "Setting up your account…" : questionsLoading ? "Loading…" : "Continue →"}
          </button>
        </form>

        {/* Onboarding popup — shown for any niche that has questions */}
        {showOnboardingPopup && hasOnboardingQuestions && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(55,53,47,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 50 }}>
            <div style={{ width: "100%", maxWidth: "720px", background: "white", borderRadius: "12px", boxShadow: "0 24px 80px rgba(0,0,0,0.24)", border: "1px solid rgba(55,53,47,0.08)", overflow: "hidden" }}>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid rgba(55,53,47,0.09)" }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(55,53,47,0.45)" }}>
                  {nicheName} setup
                </p>
                <h2 style={{ margin: "6px 0 0", fontSize: "22px", fontWeight: 800, color: "#37352F" }}>
                  Tell us about your {nicheName}
                </h2>
                <p style={{ margin: "8px 0 0", fontSize: "14px", color: "rgba(55,53,47,0.65)", lineHeight: 1.5 }}>
                  These details help personalise your workspace so the AI gives better, more relevant results.
                </p>
              </div>

              <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", maxHeight: "65vh", overflowY: "auto" }}>
                {questions.map((q) => (
                  <div key={q.id} style={{ gridColumn: q.type === "multi_select" ? "1 / -1" : undefined }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#37352F", marginBottom: "6px" }}>
                      {q.question}{q.required ? <span style={{ color: "rgb(235,87,87)" }}> *</span> : null}
                    </label>

                    {q.type === "select" ? (
                      <select
                        value={(answers[q.id] as string) ?? ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid rgba(55,53,47,0.2)", fontFamily: "inherit", fontSize: "14px", boxSizing: "border-box" }}
                      >
                        <option value="">Select one…</option>
                        {(q.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : q.type === "multi_select" ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {(q.options ?? []).map((opt) => {
                          const selected = (answers[q.id] as string[]).includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setAnswers((prev) => {
                                const cur = prev[q.id] as string[];
                                return { ...prev, [q.id]: cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt] };
                              })}
                              style={{ padding: "8px 10px", borderRadius: "999px", border: `1px solid ${selected ? "#F55200" : "rgba(55,53,47,0.15)"}`, background: selected ? "#F55200" : "white", color: selected ? "white" : "#37352F", fontSize: "13px", cursor: "pointer", fontFamily: "inherit" }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        type={q.type === "number" ? "number" : "text"}
                        value={(answers[q.id] as string) ?? ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder={q.hint}
                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid rgba(55,53,47,0.2)", fontFamily: "inherit", fontSize: "14px", boxSizing: "border-box" }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ padding: "0 20px 20px", display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowOnboardingPopup(false)}
                  style={{ padding: "10px 14px", borderRadius: "6px", border: "1px solid rgba(55,53,47,0.15)", background: "white", color: "#37352F", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    const missing = getMissingRequired();
                    if (missing.length > 0) {
                      setError(`Please complete: ${missing.map((q) => q.question).join(", ")}.`);
                      return;
                    }
                    void submitSignup();
                  }}
                  disabled={loading}
                  style={{ padding: "10px 14px", borderRadius: "6px", border: "none", background: loading ? "rgba(245,82,0,0.4)" : "#F55200", color: "white", fontWeight: 700, cursor: loading ? "default" : "pointer", fontFamily: "inherit" }}
                >
                  {loading ? "Setting up your account…" : "Continue"}
                </button>
              </div>
              {error && (
                <p style={{ margin: "0 20px 20px", fontSize: "13px", color: "rgb(235,87,87)" }}>{error}</p>
              )}
            </div>
          </div>
        )}

        <p style={{ margin: "20px 0 0", fontSize: "12px", color: "rgba(55,53,47,0.45)", textAlign: "center", lineHeight: 1.5 }}>
          Next step: create a Notion page for your workspace, then connect your account.
          <br />No credit card needed.
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
