"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense } from "react";

const WEDDING_QUESTIONS = [
  { id: "wedding-country", label: "Country", type: "select", required: true, options: ["United Kingdom", "United States", "Canada", "Australia", "New Zealand", "Europe (EUR)"] },
  { id: "couple-names", label: "Couple's names", type: "text", required: true, placeholder: "e.g. Sarah & James" },
  { id: "wedding-date", label: "Wedding date or timeframe", type: "text", required: true, placeholder: "e.g. 14 June 2026 or Summer 2026" },
  { id: "wedding-location", label: "Wedding location", type: "text", required: true, placeholder: "e.g. Cotswolds, Edinburgh, Bristol" },
  { id: "guest-count", label: "Guest count", type: "number", required: true, placeholder: "e.g. 80" },
  { id: "total-budget", label: "Total budget", type: "number", required: true, placeholder: "e.g. 15000" },
  { id: "wedding-style", label: "Wedding style", type: "select", required: false, options: ["Rustic / Barn", "Classic / Traditional", "Modern / Minimalist", "Boho / Wildflower", "Black Tie / Formal", "Outdoor / Festival", "Intimate / Micro-wedding", "Not sure yet"] },
  { id: "priority-vendors", label: "Priority vendors", type: "multi_select", required: false, options: ["Venue", "Florist", "Photographer", "Caterer", "Music / DJ", "Cake", "Hair & Makeup", "Videographer", "Transport"] },
] as const;

type WeddingQuestionId = typeof WEDDING_QUESTIONS[number]["id"];

function getCurrencyCodeForCountry(country: string | undefined): string {
  switch (country) {
    case "United States":
      return "USD";
    case "Canada":
      return "CAD";
    case "Australia":
      return "AUD";
    case "New Zealand":
      return "NZD";
    case "Europe (EUR)":
      return "EUR";
    case "United Kingdom":
    default:
      return "GBP";
  }
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl = searchParams.get("callbackUrl") ?? "/members/get-started";
  const templateTitle = searchParams.get("title");
  const isActivationSignup = callbackUrl.startsWith("/activate/");
  const isWeddingSignup = isActivationSignup ? false : (/wedding/i.test(templateTitle ?? "") || /\/members\/setup\/wedding-planner/.test(callbackUrl));
  const nicheId = /\/members\/setup\/([a-z0-9-]+)$/.exec(callbackUrl)?.[1] ?? undefined;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWeddingPopup, setShowWeddingPopup] = useState(false);
  const [weddingAnswers, setWeddingAnswers] = useState<Record<WeddingQuestionId, string | string[]>>({
    "wedding-country": "United Kingdom",
    "couple-names": "",
    "wedding-date": "",
    "wedding-location": "",
    "guest-count": "",
    "total-budget": "",
    "wedding-style": "",
    "priority-vendors": [],
  });

  function getMissingRequiredWeddingFields() {
    return WEDDING_QUESTIONS.filter((q) => q.required).filter((q) => {
      const value = weddingAnswers[q.id];
      if (Array.isArray(value)) return value.length === 0;
      return !String(value ?? "").trim();
    });
  }

  async function submitSignup() {
    setLoading(true);
    try {
      const onboardingAnswers: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(weddingAnswers)) {
        if (Array.isArray(value)) {
          if (value.length === 0) continue;
          onboardingAnswers[key] = value;
          continue;
        }
        if (typeof value === "string" && value.trim() === "") continue;
        onboardingAnswers[key] = key === "guest-count" || key === "total-budget" ? Number(value) || value : value;
      }

      const selectedCountry = onboardingAnswers["wedding-country"];
      if (typeof selectedCountry === "string" && selectedCountry.trim().length > 0) {
        onboardingAnswers["currency-code"] = getCurrencyCodeForCountry(selectedCountry);
      }

      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          nicheId: isWeddingSignup ? (nicheId ?? "wedding-planner") : undefined,
          onboardingAnswers: isWeddingSignup ? onboardingAnswers : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Create an in-app session immediately so the user is authenticated
      // without needing to connect Notion. They can connect Notion later from
      // get-started if they want the full Notion sync experience.
      const getStartedUrl =
        callbackUrl && callbackUrl !== "/members/get-started"
          ? `/members/get-started?next=${encodeURIComponent(callbackUrl)}`
          : "/members/get-started";

      const result = await signIn("email", { email: email.trim(), redirect: false });
      if (result?.error) {
        // Credentials sign-in failed — fall back to redirecting without a session
        // (they can still connect Notion on the get-started page)
        router.push(getStartedUrl as never);
        return;
      }

      router.push(getStartedUrl as never);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError("Please enter your email address."); return; }

    if (isWeddingSignup && !showWeddingPopup) {
      setShowWeddingPopup(true);
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
        fontFamily:
          'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
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
        {/* Logo mark */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/s-logo.png" alt="Stridivo" style={{ height: "28px", width: "auto" }} />
          <span style={{ fontWeight: 700, fontSize: "15px", color: "#37352F" }}>
            Stridivo.com
          </span>
        </div>

        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#37352F",
            margin: "0 0 6px",
            lineHeight: 1.25,
          }}
        >
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
            <label
              htmlFor="name"
              style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#37352F", marginBottom: "5px" }}
            >
              Your name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "4px",
                border: "1px solid rgba(55,53,47,0.2)",
                fontSize: "14px",
                color: "#37352F",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#37352F", marginBottom: "5px" }}
            >
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
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "4px",
                border: `1px solid ${error ? "rgb(235,87,87)" : "rgba(55,53,47,0.2)"}`,
                fontSize: "14px",
                color: "#37352F",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: "13px", color: "rgb(235,87,87)" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "4px",
              border: "none",
              background: loading ? "rgba(245,82,0,0.4)" : "#F55200",
              color: "white",
              fontSize: "15px",
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
              fontFamily: "inherit",
              marginTop: "4px",
            }}
          >
            {loading ? "Setting up your account…" : "Continue →"}
          </button>
        </form>

        {showWeddingPopup && isWeddingSignup && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(55,53,47,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              zIndex: 50,
            }}
          >
            <div style={{ width: "100%", maxWidth: "720px", background: "white", borderRadius: "12px", boxShadow: "0 24px 80px rgba(0,0,0,0.24)", border: "1px solid rgba(55,53,47,0.08)", overflow: "hidden" }}>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid rgba(55,53,47,0.09)" }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(55,53,47,0.45)" }}>
                  Wedding setup
                </p>
                <h2 style={{ margin: "6px 0 0", fontSize: "22px", fontWeight: 800, color: "#37352F" }}>
                  Tell us about your wedding
                </h2>
                <p style={{ margin: "8px 0 0", fontSize: "14px", color: "rgba(55,53,47,0.65)", lineHeight: 1.5 }}>
                  These details help us pre-fill your workspace so the AI can draft better emails, vendor outreach, and planning suggestions.
                </p>
              </div>

              <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", maxHeight: "65vh", overflowY: "auto" }}>
                {WEDDING_QUESTIONS.map((q) => (
                  <div key={q.id} style={{ gridColumn: q.id === "priority-vendors" ? "1 / -1" : undefined }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#37352F", marginBottom: "6px" }}>
                      {q.label}{q.required ? <span style={{ color: "rgb(235,87,87)" }}> *</span> : null}
                    </label>
                    {q.type === "select" ? (
                      <select
                        value={(weddingAnswers[q.id] as string) ?? ""}
                        onChange={(e) => setWeddingAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid rgba(55,53,47,0.2)", fontFamily: "inherit", fontSize: "14px", boxSizing: "border-box" }}
                      >
                        <option value="">Select one…</option>
                        {q.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : q.type === "multi_select" ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {q.options?.map((option) => {
                          const selected = (weddingAnswers[q.id] as string[]).includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setWeddingAnswers((prev) => {
                                const current = prev[q.id] as string[];
                                return {
                                  ...prev,
                                  [q.id]: current.includes(option)
                                    ? current.filter((item) => item !== option)
                                    : [...current, option],
                                };
                              })}
                              style={{
                                padding: "8px 10px",
                                borderRadius: "999px",
                                border: `1px solid ${selected ? "#F55200" : "rgba(55,53,47,0.15)"}`,
                                background: selected ? "#F55200" : "white",
                                color: selected ? "white" : "#37352F",
                                fontSize: "13px",
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        type={q.type === "number" ? "number" : "text"}
                        value={(weddingAnswers[q.id] as string) ?? ""}
                        onChange={(e) => setWeddingAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder={q.placeholder}
                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid rgba(55,53,47,0.2)", fontFamily: "inherit", fontSize: "14px", boxSizing: "border-box" }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ padding: "0 20px 20px", display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowWeddingPopup(false)}
                  style={{ padding: "10px 14px", borderRadius: "6px", border: "1px solid rgba(55,53,47,0.15)", background: "white", color: "#37352F", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    const missing = getMissingRequiredWeddingFields();
                    if (missing.length > 0) {
                      setError(`Please complete: ${missing.map((q) => q.label).join(", ")}.`);
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
                <p style={{ margin: "0 20px 20px", fontSize: "13px", color: "rgb(235,87,87)" }}>
                  {error}
                </p>
              )}
            </div>
          </div>
        )}

        <p
          style={{
            margin: "20px 0 0",
            fontSize: "12px",
            color: "rgba(55,53,47,0.45)",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
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
