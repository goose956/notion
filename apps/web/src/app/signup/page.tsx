"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl = searchParams.get("callbackUrl") ?? "/members/get-started";
  const templateTitle = searchParams.get("title");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError("Please enter your email address."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      // Pre-registration done — send to Notion OAuth
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
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
          padding: "40px 36px 36px",
        }}
      >
        {/* Logo mark */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "5px",
              background: "#37352F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "white", fontSize: "13px", fontWeight: 700 }}>N</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: "15px", color: "#37352F" }}>
            Niche Factory
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
          Create your free account
        </h1>

        {templateTitle ? (
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
              background: loading ? "rgba(55,53,47,0.3)" : "#37352F",
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

        <p
          style={{
            margin: "20px 0 0",
            fontSize: "12px",
            color: "rgba(55,53,47,0.45)",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Next step: connect your Notion account to create your workspace.
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
