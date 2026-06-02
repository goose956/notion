"use client";
import { useState } from "react";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { asText, asNumber, getCurrencyCode, formatCurrency, ACCENT, ACCENT_LIGHT, ACCENT_BORDER } from "./utils";

const N_FG     = "#111827";
const N_MUTED  = "#6b7280";
const N_BORDER = "#e5e7eb";
const N_BG     = "#f9fafb";

interface MonthData {
  month: string;
  sales: number;
  revenue: number;
  transactionFees: number;
  paymentFees: number;
  listingFees: number;
  cogs: number;
  adSpend: number;
  fixedCosts: number;
  netProfit: number;
  cumulativeProfit: number;
}

interface FinancialResult {
  months: MonthData[];
  breakEvenMonth: number | null;
  summary: {
    totalRevenue: number;
    totalNet: number;
    totalFees: number;
    avgMarginPct: number;
    peakMonthName: string;
    peakNetProfit: number;
  };
}

function NumInput({ label, hint, value, onChange, step = "0.01" }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void; step?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "4px" }}>{label}</label>
      {hint && <p style={{ fontSize: "11px", color: N_MUTED, margin: "0 0 4px 0" }}>{hint}</p>}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={step}
        min="0"
        style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "8px 10px", fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}

export function EtsyFinanceTracker({
  criteria,
  financeDb,
  onRowAdded,
}: {
  criteria:  Record<string, unknown> | null;
  financeDb: WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const currencyCode = getCurrencyCode(criteria);

  const [avgPrice,        setAvgPrice]        = useState("");
  const [avgCogs,         setAvgCogs]         = useState("");
  const [monthlyListings, setMonthlyListings] = useState("");
  const [adSpend,         setAdSpend]         = useState("");
  const [fixedCosts,      setFixedCosts]      = useState("");
  const [startSales,      setStartSales]      = useState("");
  const [growthRate,      setGrowthRate]      = useState("5");

  const [result,  setResult]  = useState<FinancialResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [saved,   setSaved]   = useState(false);

  async function project() {
    const ap = parseFloat(avgPrice);
    const ss = parseFloat(startSales);
    if (!ap || ap <= 0 || !ss || ss <= 0) { setError("Average price and starting sales are required."); return; }
    setLoading(true); setError(""); setResult(null); setSaved(false);
    try {
      const res = await fetch("/api/members/etsy-financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avgPrice:        ap,
          avgCogs:         parseFloat(avgCogs)         || 0,
          monthlyListings: parseFloat(monthlyListings) || 0,
          adSpend:         parseFloat(adSpend)         || 0,
          fixedCosts:      parseFloat(fixedCosts)      || 0,
          startSales:      ss,
          growthRate:      parseFloat(growthRate)      || 5,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveToNotion() {
    if (!financeDb || !result) return;
    setSaved(false);
    const MONTH_NAMES: string[] = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const propertyTypes: Record<string, string> = {
      "Month": "title", "Revenue": "number", "Etsy Fees": "number", "Payment Fees": "number",
      "Listing Fees": "number", "Ad Spend": "number", "COGS": "number",
      "Fixed Costs": "number", "Net Profit": "number",
    };
    let added = 0;
    try {
      for (let i = 0; i < result.months.length; i++) {
        const m = result.months[i]!;
        const monthName: string = MONTH_NAMES[i] ?? m.month;
        const properties: Record<string, string | number | boolean | null> = {
          "Month":        monthName,
          "Revenue":      m.revenue,
          "Etsy Fees":    m.transactionFees,
          "Payment Fees": m.paymentFees,
          "Listing Fees": m.listingFees,
          "Ad Spend":     m.adSpend,
          "COGS":         m.cogs,
          "Fixed Costs":  m.fixedCosts,
          "Net Profit":   m.netProfit,
        };
        const res = await fetch("/api/members/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseId: financeDb.notionId, properties, propertyTypes }),
        });
        if (res.ok) {
          const data = await res.json() as { pageId?: string };
          if (data.pageId) { onRowAdded(financeDb.notionId, { pageId: data.pageId, properties }); added++; }
        }
      }
      if (added > 0) setSaved(true);
    } catch { /* silently fail */ }
  }

  const fmt = (v: number) => formatCurrency(v, currencyCode);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: N_FG, margin: "0 0 4px 0" }}>📊 Finance Tracker</h2>
        <p style={{ fontSize: "13px", color: N_MUTED, margin: 0 }}>
          Project your Etsy profit with the real fee model: 6.5% transaction + ~3% payment processing + $0.20/listing.
        </p>
      </div>

      {/* Fee model callout */}
      <div style={{ background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", fontSize: "12px", color: N_FG }}>
        <strong>Etsy fee model:</strong> Transaction fee 6.5% · Payment processing ~3% + $0.25 per sale · Listing renewal $0.20 per item
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "16px" }}>
        <NumInput label="Average Listing Price" hint={`In ${currencyCode}`} value={avgPrice} onChange={setAvgPrice} />
        <NumInput label="Avg Cost of Goods (COGS)" hint={`Materials/print cost per sale`} value={avgCogs} onChange={setAvgCogs} />
        <NumInput label="New Listings / Month" hint="$0.20 renewal per listing" value={monthlyListings} onChange={setMonthlyListings} step="1" />
        <NumInput label="Monthly Ad Spend" hint="Etsy Ads budget" value={adSpend} onChange={setAdSpend} />
        <NumInput label="Monthly Fixed Costs" hint="Subscriptions, tools, etc." value={fixedCosts} onChange={setFixedCosts} />
        <NumInput label="Starting Sales / Month" hint="How many sales in month 1" value={startSales} onChange={setStartSales} step="1" />
        <NumInput label="Monthly Growth Rate %" hint="Sales growth per month" value={growthRate} onChange={setGrowthRate} />
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", fontSize: "13px", color: "#dc2626" }}>
          {error}
        </div>
      )}

      <button
        onClick={project}
        disabled={loading}
        style={{
          background: loading ? "#d1d5db" : ACCENT,
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "10px 22px",
          fontSize: "13px",
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: "24px",
        }}
      >
        {loading ? "Projecting…" : "📊 Project 12 Months"}
      </button>

      {result && (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
            {[
              { label: "Total Revenue",    value: fmt(result.summary.totalRevenue)   },
              { label: "Total Net Profit", value: fmt(result.summary.totalNet)       },
              { label: "Total Etsy Fees",  value: fmt(result.summary.totalFees)      },
              { label: "Avg Net Margin",   value: `${result.summary.avgMarginPct.toFixed(1)}%` },
            ].map((c, i) => (
              <div key={i} style={{ background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: "10px", padding: "14px 16px" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>{c.label}</p>
                <p style={{ fontSize: "20px", fontWeight: 800, color: N_FG, margin: 0 }}>{c.value}</p>
              </div>
            ))}
          </div>

          {result.breakEvenMonth && (
            <div style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.20)", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: "#14532d", fontWeight: 600 }}>
              ✅ Cumulative break-even reached in Month {result.breakEvenMonth}
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: "auto", marginBottom: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", whiteSpace: "nowrap" }}>
              <thead>
                <tr style={{ background: N_BG }}>
                  {["Month","Sales","Revenue","Tx Fee","Pay Fee","List Fee","COGS","Ad Spend","Fixed","Net Profit","Cumulative"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, color: N_MUTED, borderBottom: `1px solid ${N_BORDER}`, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.months.map((m, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${N_BORDER}`, background: m.netProfit < 0 ? "rgba(239,68,68,0.04)" : "transparent" }}>
                    <td style={{ padding: "7px 10px", fontWeight: 600, color: N_FG, textAlign: "left" }}>{m.month}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: N_FG }}>{m.sales}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: N_FG }}>{fmt(m.revenue)}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: "#dc2626" }}>{fmt(m.transactionFees)}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: "#dc2626" }}>{fmt(m.paymentFees)}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: "#dc2626" }}>{fmt(m.listingFees)}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: "#9a3412" }}>{fmt(m.cogs)}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: N_MUTED }}>{fmt(m.adSpend)}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", color: N_MUTED }}>{fmt(m.fixedCosts)}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: m.netProfit >= 0 ? "#16a34a" : "#dc2626" }}>{fmt(m.netProfit)}</td>
                    <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 600, color: m.cumulativeProfit >= 0 ? "#16a34a" : "#dc2626" }}>{fmt(m.cumulativeProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={saveToNotion}
              disabled={!financeDb}
              style={{
                background: financeDb ? ACCENT : "#d1d5db",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "9px 18px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: financeDb ? "pointer" : "not-allowed",
              }}
            >
              💾 Save to Notion
            </button>
            {saved && <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>✓ Saved!</span>}
            {!financeDb && <span style={{ fontSize: "11px", color: N_MUTED }}>Monthly Finance database not found</span>}
          </div>
        </>
      )}
    </div>
  );
}
