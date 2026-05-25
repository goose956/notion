"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CREDIT_PACKAGES,
  centsToUsd,
  getCostPerCredit,
  type CreditPackage,
} from "@/lib/credit-packages";

const FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function getDiscountVsStarter(pkg: CreditPackage, starter: CreditPackage): number {
  const starterCost = getCostPerCredit(starter);
  const pkgCost = getCostPerCredit(pkg);
  if (starterCost <= 0) return 0;
  return Math.max(0, (1 - pkgCost / starterCost) * 100);
}

function TierPill({
  pkg,
  selected,
  onSelect,
  starter,
}: {
  pkg: CreditPackage;
  selected: boolean;
  onSelect: () => void;
  starter: CreditPackage;
}) {
  const costPerCredit = getCostPerCredit(pkg);
  const savings = getDiscountVsStarter(pkg, starter);

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: "100%",
        borderRadius: "14px",
        border: selected ? "2px solid rgba(37,99,235,0.4)" : "1px solid rgba(55,53,47,0.12)",
        background: selected
          ? "linear-gradient(160deg, rgba(239,246,255,0.98) 0%, rgba(255,255,255,1) 70%)"
          : "rgba(255,255,255,0.92)",
        boxShadow: selected ? "0 18px 42px rgba(37,99,235,0.12)" : "0 10px 24px rgba(0,0,0,0.05)",
        padding: "14px",
        textAlign: "left",
        cursor: "pointer",
        color: "#111827",
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
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.05em",
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

      <div style={{ paddingRight: pkg.highlight ? "72px" : 0 }}>
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "rgba(55,53,47,0.7)" }}>{pkg.name}</p>
        <p style={{ margin: "6px 0 2px", fontSize: "28px", lineHeight: 1, fontWeight: 800 }}>{centsToUsd(pkg.priceCents)}</p>
        <p style={{ margin: 0, fontSize: "13px", color: "rgba(55,53,47,0.72)" }}>{pkg.credits} credits</p>
      </div>

      <div
        style={{
          marginTop: "12px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: "11px", color: "rgba(55,53,47,0.56)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Cost per credit
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 800, color: selected ? "#1d4ed8" : "#111827" }}>
            ${costPerCredit.toFixed(3)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "11px", color: "rgba(55,53,47,0.56)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            vs starter
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 800, color: savings >= 50 ? "#166534" : "#92400e" }}>
            {formatPercent(savings)} cheaper
          </p>
        </div>
      </div>
    </button>
  );
}

export default function CreditsPage() {
  const params = useSearchParams();
  const [selectedIndex, setSelectedIndex] = useState(2);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = params.get("status");

  const starterPackage = CREDIT_PACKAGES[0]!;
  const selectedPackage = CREDIT_PACKAGES[selectedIndex] ?? starterPackage;
  const selectedCostPerCredit = getCostPerCredit(selectedPackage);
  const starterCostPerCredit = getCostPerCredit(starterPackage);
  const selectedSavingsVsStarter = getDiscountVsStarter(selectedPackage, starterPackage);

  const tiers = useMemo(() => CREDIT_PACKAGES, []);

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
      <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
        <header style={{ marginBottom: "22px" }}>
          <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: "rgba(55,53,47,0.52)" }}>
            Credit Top-up
          </p>
          <h1 style={{ margin: "6px 0 8px", fontSize: "38px", lineHeight: 1.1, color: "#111827" }}>
            Slide up for better value
          </h1>
          <p style={{ margin: 0, fontSize: "15px", color: "rgba(55,53,47,0.75)", maxWidth: "820px", lineHeight: 1.6 }}>
            Move the slider to change the package size. The packs step up through six prices, and the largest pack is
            50% cheaper per credit than the smallest one.
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

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 0.95fr) minmax(0, 1.05fr)",
            gap: "18px",
            alignItems: "start",
          }}
        >
          <section
            style={{
              borderRadius: "22px",
              border: "1px solid rgba(55,53,47,0.1)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,250,249,0.95) 100%)",
              boxShadow: "0 20px 50px rgba(15,23,42,0.08)",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(55,53,47,0.55)", fontWeight: 700 }}>
                  Selected pack
                </p>
                <h2 style={{ margin: "8px 0 6px", fontSize: "30px", lineHeight: 1.05, color: "#111827" }}>
                  {selectedPackage.name}
                </h2>
                <p style={{ margin: 0, fontSize: "15px", color: "rgba(55,53,47,0.72)", lineHeight: 1.6 }}>
                  {selectedPackage.credits} credits for {centsToUsd(selectedPackage.priceCents)}.
                </p>
              </div>
              {selectedPackage.highlight && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: selectedPackage.highlight === "best" ? "#166534" : "#1d4ed8",
                    background: selectedPackage.highlight === "best" ? "rgba(22,163,74,0.12)" : "rgba(59,130,246,0.12)",
                    borderRadius: "999px",
                    padding: "5px 9px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedPackage.highlight === "best" ? "Best Value" : "Popular"}
                </span>
              )}
            </div>

            <div
              style={{
                marginTop: "18px",
                borderRadius: "18px",
                border: "1px solid rgba(55,53,47,0.11)",
                background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(16,185,129,0.08))",
                padding: "18px",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "11px", color: "rgba(55,53,47,0.58)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Price
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "42px", fontWeight: 900, color: "#111827", lineHeight: 1 }}>
                    {centsToUsd(selectedPackage.priceCents)}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "11px", color: "rgba(55,53,47,0.58)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Credits
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "42px", fontWeight: 900, color: "#111827", lineHeight: 1 }}>
                    {selectedPackage.credits}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "8px", fontSize: "12px", color: "rgba(55,53,47,0.6)", fontWeight: 700 }}>
                  <span>Cheapest entry tier</span>
                  <span>Best-value tier</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={tiers.length - 1}
                  step={1}
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(Number.parseInt(e.target.value, 10))}
                  style={{ width: "100%", accentColor: "rgb(37,99,235)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", gap: "6px" }}>
                  {tiers.map((pkg, index) => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedIndex(index)}
                      style={{
                        border: "none",
                        background: index === selectedIndex ? "rgba(37,99,235,0.12)" : "transparent",
                        color: index === selectedIndex ? "#1d4ed8" : "rgba(55,53,47,0.6)",
                        borderRadius: "999px",
                        padding: "5px 8px",
                        fontSize: "11px",
                        fontWeight: 800,
                        cursor: "pointer",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {pkg.credits}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  marginTop: "16px",
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "12px",
                }}
              >
                <div style={{ borderRadius: "14px", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(55,53,47,0.1)", padding: "12px" }}>
                  <p style={{ margin: 0, fontSize: "11px", color: "rgba(55,53,47,0.58)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Cost / credit
                  </p>
                  <p style={{ margin: "5px 0 0", fontSize: "24px", fontWeight: 900, color: "#111827" }}>
                    ${selectedCostPerCredit.toFixed(3)}
                  </p>
                </div>
                <div style={{ borderRadius: "14px", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(55,53,47,0.1)", padding: "12px" }}>
                  <p style={{ margin: 0, fontSize: "11px", color: "rgba(55,53,47,0.58)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Savings vs starter
                  </p>
                  <p style={{ margin: "5px 0 0", fontSize: "24px", fontWeight: 900, color: selectedSavingsVsStarter >= 50 ? "#166534" : "#92400e" }}>
                    {formatPercent(selectedSavingsVsStarter)}
                  </p>
                </div>
              </div>

              <p style={{ margin: "14px 0 0", fontSize: "13px", color: "rgba(55,53,47,0.7)", lineHeight: 1.55 }}>
                The entry pack is the most expensive per credit. As you slide up, the pack gets larger and the per-credit
                price drops until the largest tier is half the entry price per credit.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleBuy(selectedPackage.id)}
              disabled={loadingId !== null}
              style={{
                marginTop: "16px",
                width: "100%",
                border: "none",
                borderRadius: "16px",
                padding: "14px 16px",
                fontSize: "15px",
                fontWeight: 800,
                cursor: loadingId !== null ? "not-allowed" : "pointer",
                color: "white",
                background:
                  selectedPackage.highlight === "best"
                    ? "linear-gradient(92deg, #15803d 0%, #22c55e 100%)"
                    : selectedPackage.highlight === "popular"
                      ? "linear-gradient(92deg, #1d4ed8 0%, #3b82f6 100%)"
                      : "linear-gradient(92deg, #374151 0%, #4b5563 100%)",
                boxShadow: "0 14px 30px rgba(0,0,0,0.12)",
                opacity: loadingId !== null ? 0.78 : 1,
              }}
            >
              {loadingId === selectedPackage.id ? "Redirecting to Stripe..." : `Buy ${selectedPackage.credits} credits for ${centsToUsd(selectedPackage.priceCents)}`}
            </button>
          </section>

          <section>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
              {tiers.map((pkg, index) => (
                <TierPill
                  key={pkg.id}
                  pkg={pkg}
                  selected={index === selectedIndex}
                  onSelect={() => setSelectedIndex(index)}
                  starter={starterPackage}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
