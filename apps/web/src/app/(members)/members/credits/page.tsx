"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CREDIT_PACKAGES,
  centsToUsd,
  getCostPerCredit,
  getRelativeMarkupPercent,
  type CreditPackage,
} from "@/lib/credit-packages";

const FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

function TierCard({
  pkg,
  baseline,
  disabled,
  loading,
  onBuy,
}: {
  pkg: CreditPackage;
  baseline: CreditPackage;
  disabled: boolean;
  loading: boolean;
  onBuy: (packageId: string) => Promise<void>;
}) {
  const costPerCredit = getCostPerCredit(pkg);
  const markup = getRelativeMarkupPercent(pkg, baseline);

  return (
    <article
      style={{
        borderRadius: "14px",
        border:
          pkg.highlight === "best"
            ? "2px solid rgba(22,163,74,0.45)"
            : pkg.highlight === "popular"
              ? "2px solid rgba(59,130,246,0.35)"
              : "1px solid rgba(55,53,47,0.14)",
        background:
          pkg.highlight === "best"
            ? "linear-gradient(160deg, rgba(240,253,244,0.95) 0%, rgba(255,255,255,1) 65%)"
            : pkg.highlight === "popular"
              ? "linear-gradient(160deg, rgba(239,246,255,0.95) 0%, rgba(255,255,255,1) 65%)"
              : "linear-gradient(160deg, rgba(250,250,249,1) 0%, rgba(255,255,255,1) 65%)",
        boxShadow: pkg.highlight ? "0 14px 40px rgba(0,0,0,0.08)" : "0 8px 22px rgba(0,0,0,0.05)",
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {pkg.highlight && (
        <span
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: pkg.highlight === "best" ? "#166534" : "#1d4ed8",
            background: pkg.highlight === "best" ? "rgba(22,163,74,0.12)" : "rgba(59,130,246,0.12)",
            borderRadius: "999px",
            padding: "4px 8px",
          }}
        >
          {pkg.highlight === "best" ? "Best Value" : "Popular"}
        </span>
      )}

      <div style={{ paddingTop: pkg.highlight ? "22px" : 0 }}>
        <p style={{ margin: 0, fontSize: "13px", color: "rgba(55,53,47,0.65)", fontWeight: 600 }}>{pkg.name}</p>
        <p style={{ margin: "6px 0 2px", fontSize: "34px", fontWeight: 800, color: "#111827", lineHeight: 1.05 }}>{centsToUsd(pkg.priceCents)}</p>
        <p style={{ margin: 0, fontSize: "13px", color: "rgba(55,53,47,0.72)" }}>{pkg.credits} credits included</p>
      </div>

      <div
        style={{
          borderRadius: "10px",
          border: "1px solid rgba(55,53,47,0.12)",
          background: "rgba(255,255,255,0.9)",
          padding: "10px",
        }}
      >
        <p style={{ margin: 0, fontSize: "12px", color: "rgba(55,53,47,0.6)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
          Cost per credit
        </p>
        <p style={{ margin: "4px 0 0", fontSize: "24px", fontWeight: 700, color: "#111827" }}>
          ${costPerCredit.toFixed(3)}
        </p>
        {markup > 0 ? (
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#b45309", fontWeight: 600 }}>
            {markup}% more expensive per credit than {baseline.name}
          </p>
        ) : (
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#166534", fontWeight: 700 }}>
            Lowest cost per credit
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => void onBuy(pkg.id)}
        disabled={disabled}
        style={{
          marginTop: "auto",
          width: "100%",
          border: "none",
          borderRadius: "10px",
          padding: "11px 12px",
          fontSize: "14px",
          fontWeight: 700,
          cursor: disabled ? "not-allowed" : "pointer",
          color: "white",
          background:
            pkg.highlight === "best"
              ? "linear-gradient(92deg, #15803d 0%, #22c55e 100%)"
              : pkg.highlight === "popular"
                ? "linear-gradient(92deg, #1d4ed8 0%, #3b82f6 100%)"
                : "linear-gradient(92deg, #374151 0%, #4b5563 100%)",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        {loading ? "Redirecting to Stripe..." : `Buy ${pkg.credits} credits`}
      </button>
    </article>
  );
}

export default function CreditsPage() {
  const params = useSearchParams();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bestValuePackage = useMemo(() => {
    return CREDIT_PACKAGES.reduce((best, current) =>
      getCostPerCredit(current) < getCostPerCredit(best) ? current : best,
    CREDIT_PACKAGES[0]!);
  }, []);

  const status = params.get("status");

  async function handleBuy(packageId: string) {
    setLoadingId(packageId);
    setError(null);
    try {
      const res = await fetch("/api/members/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!res.ok || !body.url) {
        throw new Error(body.error ?? "Could not start checkout");
      }
      window.location.href = body.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setLoadingId(null);
    }
  }

  return (
    <div
      style={{
        minHeight: "100%",
        padding: "34px 26px 50px",
        fontFamily: FONT,
        background:
          "radial-gradient(circle at top left, rgba(16,185,129,0.12), transparent 36%), radial-gradient(circle at 85% 20%, rgba(59,130,246,0.1), transparent 30%), #ffffff",
      }}
    >
      <div style={{ maxWidth: "1060px", margin: "0 auto" }}>
        <header style={{ marginBottom: "22px" }}>
          <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: "rgba(55,53,47,0.52)" }}>
            Credit Top-up
          </p>
          <h1 style={{ margin: "6px 0 8px", fontSize: "38px", lineHeight: 1.1, color: "#111827" }}>
            Pick your credit pack
          </h1>
          <p style={{ margin: 0, fontSize: "15px", color: "rgba(55,53,47,0.75)", maxWidth: "760px", lineHeight: 1.6 }}>
            The bigger packs are intentionally better value. Small top-ups keep you moving, but if you use AI daily,
            larger packs will save you money fast.
          </p>
        </header>

        {status === "success" && (
          <div
            style={{
              marginBottom: "16px",
              borderRadius: "10px",
              border: "1px solid rgba(22,163,74,0.3)",
              background: "rgba(22,163,74,0.08)",
              padding: "12px 14px",
              fontSize: "14px",
              color: "#166534",
              fontWeight: 600,
            }}
          >
            Payment complete. Credits are being applied to your account now.
          </div>
        )}

        {status === "cancelled" && (
          <div
            style={{
              marginBottom: "16px",
              borderRadius: "10px",
              border: "1px solid rgba(245,158,11,0.35)",
              background: "rgba(245,158,11,0.1)",
              padding: "12px 14px",
              fontSize: "14px",
              color: "#92400e",
              fontWeight: 600,
            }}
          >
            Checkout was cancelled. Your credits have not changed.
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: "16px",
              borderRadius: "10px",
              border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.08)",
              padding: "12px 14px",
              fontSize: "14px",
              color: "#b91c1c",
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "14px" }}>
          {CREDIT_PACKAGES.map((pkg) => (
            <TierCard
              key={pkg.id}
              pkg={pkg}
              baseline={bestValuePackage}
              disabled={loadingId !== null}
              loading={loadingId === pkg.id}
              onBuy={handleBuy}
            />
          ))}
        </div>

        <section
          style={{
            marginTop: "20px",
            borderRadius: "12px",
            border: "1px solid rgba(55,53,47,0.12)",
            background: "white",
            padding: "14px 16px",
          }}
        >
          <p style={{ margin: 0, fontSize: "14px", color: "#111827", fontWeight: 700 }}>Why the small package costs more per credit</p>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "rgba(55,53,47,0.72)", lineHeight: 1.55 }}>
            Smaller top-ups are for occasional usage and urgent tasks. Larger packs are discounted for committed users,
            so your effective cost per credit keeps dropping as your package size grows.
          </p>
        </section>
      </div>
    </div>
  );
}
