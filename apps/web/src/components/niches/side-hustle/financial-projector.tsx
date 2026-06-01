"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { asNumber, ACCENT, ACCENT_LIGHT, ACCENT_BORDER, getCurrencyCode, formatCurrency } from "./utils";

interface MonthRow {
  month:            string;
  customers:        number;
  revenue:          number;
  variableCosts:    number;
  fixedCosts:       number;
  profit:           number;
  cumulativeProfit: number;
}

interface FinancialResult {
  months:         MonthRow[];
  breakEvenMonth: string | null;
  summary:        string;
}

function NumInput({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px" }}>{label}</label>
      {hint && <p style={{ margin: "0 0 4px", fontSize: "11px", color: N_MUTED }}>{hint}</p>}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, outline: "none" }}
      />
    </div>
  );
}

export function SHFinancialProjector({
  criteria,
  financialsDb,
  onRowAdded,
}: {
  criteria:     Record<string, unknown> | null;
  financialsDb: WorkspaceDatabase | null;
  onRowAdded:   (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const currency = getCurrencyCode(criteria);
  const [price,       setPrice]      = useState(String(asNumber(criteria?.["price-per-sale"])        ?? ""));
  const [varCost,     setVarCost]    = useState(String(asNumber(criteria?.["cost-per-sale"])          ?? ""));
  const [fixedCosts,  setFixed]      = useState(String(asNumber(criteria?.["fixed-monthly-costs"])    ?? ""));
  const [startCust,   setStartCust]  = useState(String(asNumber(criteria?.["target-customers"]) ? Math.round(Number(criteria?.["target-customers"]) / 12) : ""));
  const [growthRate,  setGrowthRate] = useState("10");
  const [loading,     setLoading]    = useState(false);
  const [error,       setError]      = useState<string | null>(null);
  const [result,      setResult]     = useState<FinancialResult | null>(null);
  const [saving,      setSaving]     = useState(false);
  const [saveResult,  setSaveResult] = useState<string | null>(null);

  async function project() {
    const p  = Number(price);
    const vc = Number(varCost);
    const fc = Number(fixedCosts);
    const sc = Number(startCust);
    const gr = Number(growthRate);
    if (!p || p <= 0 || sc < 0 || gr < 0) {
      setError("Price must be > 0 and all values must be valid numbers.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setSaveResult(null);
    try {
      const res = await fetch("/api/members/sh-financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricePerSale: p, costPerSale: vc, fixedMonthlyCosts: fc, startingCustomers: sc, monthlyGrowthRate: gr }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as FinancialResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveToNotion() {
    if (!result || !financialsDb) return;
    setSaving(true);
    setSaveResult(null);
    let added = 0;
    try {
      for (const row of result.months) {
        const properties: Record<string, string | number | boolean | null> = {
          "Month":             row.month,
          "Customers":         row.customers,
          "Revenue":           row.revenue,
          "Variable Costs":    row.variableCosts,
          "Fixed Costs":       row.fixedCosts,
          "Profit":            row.profit,
          "Cumulative Profit": row.cumulativeProfit,
        };
        const propertyTypes = {
          "Month": "title", "Customers": "number", "Revenue": "number",
          "Variable Costs": "number", "Fixed Costs": "number",
          "Profit": "number", "Cumulative Profit": "number",
        };
        const res = await fetch("/api/members/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseId: financialsDb.notionId, properties, propertyTypes }),
        });
        if (res.ok) {
          const data = await res.json() as { pageId?: string };
          if (data.pageId) { onRowAdded(financialsDb.notionId, { pageId: data.pageId, properties }); added++; }
        }
      }
      setSaveResult(`✓ Saved ${added} months to Financial Projections`);
    } catch {
      setSaveResult("Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: "720px", fontFamily: N_FONT }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800, color: N_FG }}>Financial Projector</h1>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          Enter your numbers and get a 12-month P&L forecast — customers, revenue, costs, profit and break-even — ready to save into your plan.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <NumInput label={`Price per sale (${currency})`}          hint="Your average revenue per customer"       value={price}      onChange={setPrice} />
        <NumInput label={`Variable cost per sale (${currency})`}  hint="Materials, fees, delivery per unit"      value={varCost}    onChange={setVarCost} />
        <NumInput label={`Fixed monthly costs (${currency})`}     hint="Rent, subscriptions, tools — always on"  value={fixedCosts} onChange={setFixed} />
        <NumInput label="Starting customers (month 1)" hint="How many customers do you have now?"    value={startCust}  onChange={setStartCust} />
        <NumInput label="Monthly growth rate (%)"     hint="Realistic: 5–15% for early stage"        value={growthRate} onChange={setGrowthRate} />
      </div>

      <button
        onClick={() => void project()}
        disabled={loading}
        style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "11px 26px", borderRadius: "6px", border: "none",
          background: loading ? "rgba(55,53,47,0.12)" : ACCENT,
          color: loading ? N_MUTED : "white",
          fontSize: "14px", fontWeight: 600, cursor: loading ? "default" : "pointer", fontFamily: N_FONT,
          marginBottom: "28px",
        }}
      >
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Projecting…</> : "📊 Build projections"}
      </button>

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: "6px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", fontSize: "13px", color: "#b91c1c", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {result && (
        <div>
          {/* Summary */}
          <div style={{ padding: "12px 16px", borderRadius: "10px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, marginBottom: "20px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: N_FG, lineHeight: 1.7 }}>{result.summary}</p>
            {result.breakEvenMonth && (
              <p style={{ margin: "6px 0 0", fontSize: "12px", fontWeight: 700, color: "#c2410c" }}>
                📈 Cumulative break-even: {result.breakEvenMonth}
              </p>
            )}
          </div>

          {/* Table */}
          <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "auto", marginBottom: "20px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: N_FONT }}>
              <thead>
                <tr style={{ background: "rgba(55,53,47,0.04)" }}>
                  {["Month","Customers","Revenue","Variable","Fixed","Profit","Cumulative"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: h === "Month" ? "left" : "right", fontWeight: 700, color: N_MUTED, borderBottom: `1px solid ${N_BORDER}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.months.map((row, i) => {
                  const isBreakEven  = row.month === result.breakEvenMonth;
                  const isProfitable = row.profit >= 0;
                  return (
                    <tr key={row.month} style={{ background: isBreakEven ? ACCENT_LIGHT : "white", borderBottom: i < result.months.length - 1 ? `1px solid ${N_BORDER}` : "none" }}>
                      <td style={{ padding: "9px 12px", fontWeight: isBreakEven ? 700 : 400, color: N_FG, whiteSpace: "nowrap" }}>
                        {row.month}{isBreakEven ? " ⭐" : ""}
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: N_SUBTLE }}>{row.customers}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: N_FG }}>{formatCurrency(row.revenue, currency)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: N_SUBTLE }}>{formatCurrency(row.variableCosts, currency)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: N_SUBTLE }}>{formatCurrency(row.fixedCosts, currency)}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: isProfitable ? "#065f46" : "#b91c1c" }}>
                        {isProfitable ? "+" : ""}{formatCurrency(row.profit, currency)}
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: row.cumulativeProfit >= 0 ? "#065f46" : N_SUBTLE }}>
                        {formatCurrency(row.cumulativeProfit, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {saveResult && (
            <div style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "6px", background: saveResult.startsWith("✓") ? "rgba(5,150,105,0.07)" : "rgba(220,38,38,0.07)", border: `1px solid ${saveResult.startsWith("✓") ? "rgba(5,150,105,0.2)" : "rgba(220,38,38,0.2)"}`, fontSize: "13px", color: saveResult.startsWith("✓") ? "#065f46" : "#b91c1c" }}>
              {saveResult}
            </div>
          )}

          {financialsDb ? (
            <button
              onClick={() => void saveToNotion()}
              disabled={saving}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "10px 22px", borderRadius: "6px", border: "none",
                background: saving ? "rgba(55,53,47,0.12)" : ACCENT,
                color: saving ? N_MUTED : "white",
                fontSize: "14px", fontWeight: 600, cursor: saving ? "default" : "pointer", fontFamily: N_FONT,
              }}
            >
              {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : "Save 12 months to Notion"}
            </button>
          ) : (
            <p style={{ fontSize: "12px", color: N_MUTED }}>Deploy Financial Projections database to save.</p>
          )}
        </div>
      )}
    </div>
  );
}
