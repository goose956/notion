"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, getCurrencyCode, formatCurrency } from "./utils";

interface MonthRow {
  month:            string;
  orders:           number;
  revenue:          number;
  ingredientsCost:  number;
  labourCost:       number;
  fixedCosts:       number;
  grossProfit:      number;
  netProfit:        number;
  cumulativeProfit: number;
}

interface FinancialResult {
  months:         MonthRow[];
  breakEvenMonth: string | null;
  summary:        string;
}

// ─── Cake Pricing Calculator (pure math, no credits) ──────────────────────────
function calcCakePrice(
  ingredientsCost: number,
  timeHrs: number,
  hourlyRate: number,
  overheadPerCake: number,
  packagingCost: number,
  marginPct: number,
): { minPrice: number; recommendedPrice: number; breakdown: { label: string; value: number }[] } {
  const labourCost    = timeHrs * hourlyRate;
  const subtotal      = ingredientsCost + labourCost + overheadPerCake + packagingCost;
  const profit        = subtotal * (marginPct / 100);
  const minPrice      = subtotal;
  const recommendedPrice = subtotal + profit;
  return {
    minPrice:         Math.ceil(minPrice),
    recommendedPrice: Math.ceil(recommendedPrice),
    breakdown: [
      { label: "Ingredients",     value: ingredientsCost },
      { label: `Labour (${timeHrs}h × £${hourlyRate}/h)`, value: Math.round(labourCost * 100) / 100 },
      { label: "Overhead per cake", value: overheadPerCake },
      { label: "Packaging",       value: packagingCost },
      { label: `Profit (${marginPct}%)`, value: Math.round(profit * 100) / 100 },
    ],
  };
}

export function CakePricingCalculator({
  criteria,
  financialsDb,
  onRowAdded,
}: {
  criteria:     Record<string, unknown> | null;
  financialsDb: WorkspaceDatabase | null;
  onRowAdded:   (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const currency = getCurrencyCode(criteria);

  // ── Cake pricing state ──
  const [ingredientsCost, setIngredientsCost] = useState("15");
  const [timeHrs,         setTimeHrs]         = useState("3");
  const [hourlyRate,      setHourlyRate]       = useState("15");
  const [monthlyOverhead, setMonthlyOverhead]  = useState("100");
  const [cakesPerMonth,   setCakesPerMonth]    = useState("8");
  const [packagingCost,   setPackagingCost]    = useState("3");
  const [marginPct,       setMarginPct]        = useState("30");

  // ── Financial projector state ──
  const [startingOrders,     setStartingOrders]     = useState("4");
  const [avgOrderValue,      setAvgOrderValue]      = useState("75");
  const [ingredientsPct,     setIngredientsPct]     = useState("25");
  const [projHourlyRate,     setProjHourlyRate]     = useState("15");
  const [projHoursPerOrder,  setProjHoursPerOrder]  = useState("4");
  const [fixedMonthlyCosts,  setFixedMonthlyCosts]  = useState("100");
  const [monthlyGrowthRate,  setMonthlyGrowthRate]  = useState("10");

  const [financialResult, setFinancialResult] = useState<FinancialResult | null>(null);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [saving,          setSaving]          = useState(false);
  const [saveResult,      setSaveResult]      = useState<string | null>(null);

  // ── Derived cake price ──
  const overheadPerCake = (parseFloat(monthlyOverhead) || 0) / Math.max(parseFloat(cakesPerMonth) || 1, 1);
  const pricing = calcCakePrice(
    parseFloat(ingredientsCost) || 0,
    parseFloat(timeHrs)         || 0,
    parseFloat(hourlyRate)      || 0,
    overheadPerCake,
    parseFloat(packagingCost)   || 0,
    parseFloat(marginPct)       || 0,
  );

  // ── Underpricing alert ──
  const currentlyCharging = 0; // could add a "what I charge" field later
  const _ = currentlyCharging;

  // ── Financial projector ──
  async function runProjection() {
    const sOrders  = parseFloat(startingOrders);
    const aov      = parseFloat(avgOrderValue);
    const ingPct   = parseFloat(ingredientsPct);
    const hRate    = parseFloat(projHourlyRate);
    const hPerOrd  = parseFloat(projHoursPerOrder);
    const fixed    = parseFloat(fixedMonthlyCosts);
    const growth   = parseFloat(monthlyGrowthRate);

    if (isNaN(sOrders) || isNaN(aov) || aov <= 0) { setError("Enter starting orders and average order value."); return; }
    setLoading(true); setError(null); setFinancialResult(null); setSaveResult(null);
    try {
      const res = await fetch("/api/members/cake-financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startingOrders:     sOrders,
          avgOrderValue:      aov,
          ingredientsCostPct: ingPct || 25,
          hourlyRate:         hRate  || 0,
          hoursPerOrder:      hPerOrd || 0,
          fixedMonthlyCosts:  fixed  || 0,
          monthlyGrowthRate:  growth || 0,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as FinancialResult;
      setFinancialResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveFinancials() {
    if (!financialResult || !financialsDb) return;
    setSaving(true); setSaveResult(null);
    let added = 0;
    try {
      for (const row of financialResult.months) {
        const properties: Record<string, string | number | boolean | null> = {
          "Month":            row.month,
          "Orders":           row.orders,
          "Revenue":          row.revenue,
          "Ingredients Cost": row.ingredientsCost,
          "Labour Cost":      row.labourCost,
          "Fixed Costs":      row.fixedCosts,
          "Gross Profit":     row.grossProfit,
          "Net Profit":       row.netProfit,
          "Cumulative Profit":row.cumulativeProfit,
        };
        const propertyTypes: Record<string, string> = {
          "Month": "title", "Orders": "number", "Revenue": "number",
          "Ingredients Cost": "number", "Labour Cost": "number", "Fixed Costs": "number",
          "Gross Profit": "number", "Net Profit": "number", "Cumulative Profit": "number",
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
        await new Promise((r) => setTimeout(r, 120));
      }
      setSaveResult(`✓ Saved ${added} months to Financial Projections`);
    } catch {
      setSaveResult("Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  const input = (label: string, value: string, setter: (v: string) => void, prefix?: string, hint?: string) => (
    <div>
      <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, display: "block", marginBottom: "5px" }}>{label}</label>
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: N_MUTED, pointerEvents: "none" }}>{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => setter(e.target.value)}
          style={{ width: "100%", border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: `9px 12px 9px ${prefix ? "24px" : "12px"}`, fontSize: "13px", color: N_FG, outline: "none", boxSizing: "border-box", fontFamily: N_FONT }}
        />
      </div>
      {hint && <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>{hint}</p>}
    </div>
  );

  return (
    <div style={{ maxWidth: "760px", fontFamily: N_FONT }}>

      {/* ── CAKE PRICING CALCULATOR ────────────────────────────────────────────── */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 800, color: N_FG }}>🎂 Cake Pricing Calculator</h1>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          Most cake makers underprice by ignoring their labour and overhead. Enter your real costs — see your true minimum price and a healthy recommended price.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
          {input("Ingredients cost per cake", ingredientsCost, setIngredientsCost, "£", "Raw ingredients for this specific cake")}
          {input("Time to make (hours)", timeHrs, setTimeHrs, undefined, "Including prep, baking, decorating, admin")}
          {input("Your hourly rate", hourlyRate, setHourlyRate, "£", "What your time is worth — don't go below minimum wage")}
          {input("Packaging cost", packagingCost, setPackagingCost, "£", "Box, ribbon, board, tissue etc.")}
          {input("Monthly overhead", monthlyOverhead, setMonthlyOverhead, "£", "Insurance, kitchen rental, equipment, utilities")}
          {input("Cakes per month", cakesPerMonth, setCakesPerMonth, undefined, "Used to split overhead across orders")}
          {input("Target profit margin", marginPct, setMarginPct, undefined, "% on top of costs — 25–40% is healthy")}
        </div>

        {/* Result card */}
        <div style={{ borderRadius: "14px", border: `2px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${ACCENT_BORDER}` }}>
            <p style={{ margin: "0 0 2px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#9f1239" }}>Your pricing</p>
            <div style={{ display: "flex", gap: "24px", alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: "11px", color: N_MUTED }}>Minimum (break-even)</p>
                <p style={{ margin: 0, fontSize: "32px", fontWeight: 800, color: N_FG }}>{formatCurrency(pricing.minPrice, currency)}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: "11px", color: N_MUTED }}>Recommended (with {marginPct}% margin)</p>
                <p style={{ margin: 0, fontSize: "32px", fontWeight: 800, color: "#9f1239" }}>{formatCurrency(pricing.recommendedPrice, currency)}</p>
              </div>
            </div>
          </div>
          <div style={{ padding: "14px 20px" }}>
            <p style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: N_MUTED }}>Cost breakdown</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {pricing.breakdown.map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: N_FG }}>{item.label}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: item.label.startsWith("Profit") ? "#9f1239" : N_FG }}>
                    {formatCurrency(item.value, currency)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "10px", padding: "10px 12px", borderRadius: "8px", background: "rgba(219,39,119,0.06)", border: "1px solid rgba(219,39,119,0.15)" }}>
              <p style={{ margin: 0, fontSize: "12px", color: "#9f1239", lineHeight: 1.6 }}>
                <strong>Overhead per cake:</strong> {formatCurrency(overheadPerCake, currency)} (£{monthlyOverhead}/month ÷ {cakesPerMonth} cakes).
                If you&apos;re charging less than <strong>{formatCurrency(pricing.minPrice, currency)}</strong>, you are working at a loss.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── FINANCIAL PROJECTOR ───────────────────────────────────────────────── */}
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 800, color: N_FG }}>📊 12-Month Financial Projector</h2>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          Project your revenue, costs and profit over 12 months. Labour is calculated per order (hours × hourly rate) — not a blanket percentage.
          <span style={{ color: "#9f1239", fontWeight: 600 }}> 1 credit.</span>
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
          {input("Starting orders/month", startingOrders, setStartingOrders, undefined, "How many custom cake orders you take right now")}
          {input("Average order value", avgOrderValue, setAvgOrderValue, "£", "Typical per-order revenue — mix of cake sizes")}
          {input("Ingredients cost %", ingredientsPct, setIngredientsPct, undefined, "As % of revenue — typically 20–30% for cakes")}
          {input("Your hourly rate", projHourlyRate, setProjHourlyRate, "£", "Your time cost per hour")}
          {input("Hours per order (avg)", projHoursPerOrder, setProjHoursPerOrder, undefined, "Average hours across all order types")}
          {input("Fixed monthly costs", fixedMonthlyCosts, setFixedMonthlyCosts, "£", "Insurance, kitchen, subscriptions — doesn't change with orders")}
          {input("Monthly order growth %", monthlyGrowthRate, setMonthlyGrowthRate, undefined, "Expected % more orders each month (0 = flat)")}
        </div>

        {error && (
          <div style={{ padding: "12px 14px", borderRadius: "6px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", fontSize: "13px", color: "#b91c1c", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <button
          onClick={() => void runProjection()}
          disabled={loading}
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "11px 26px", borderRadius: "6px", border: "none",
            background: loading ? "rgba(55,53,47,0.12)" : ACCENT,
            color: loading ? N_MUTED : "white",
            fontSize: "14px", fontWeight: 600, cursor: loading ? "default" : "pointer",
            fontFamily: N_FONT, marginBottom: "24px",
          }}
        >
          {loading
            ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Projecting…</>
            : "📈 Run 12-Month Projection (1 credit)"}
        </button>

        {financialResult && (
          <div>
            {/* Summary */}
            <div style={{ padding: "12px 16px", borderRadius: "10px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, marginBottom: "20px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: N_FG, lineHeight: 1.7 }}>{financialResult.summary}</p>
            </div>

            {/* Table */}
            <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, overflow: "hidden", marginBottom: "20px" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: N_FONT }}>
                  <thead>
                    <tr style={{ background: "rgba(55,53,47,0.04)" }}>
                      {["Month","Orders","Revenue","Ingredients","Labour","Fixed","Gross Profit","Net Profit","Cumulative"].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: N_MUTED, whiteSpace: "nowrap", borderBottom: `1px solid ${N_BORDER}` }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {financialResult.months.map((row, i) => {
                      const isBreakEven  = row.month === financialResult.breakEvenMonth;
                      const isNegProfit  = row.netProfit < 0;
                      const isCumNeg     = row.cumulativeProfit < 0;
                      return (
                        <tr key={row.month} style={{ background: isBreakEven ? "rgba(5,150,105,0.05)" : i % 2 === 0 ? "white" : "rgba(55,53,47,0.015)" }}>
                          <td style={{ padding: "9px 12px", fontWeight: isBreakEven ? 700 : 400, color: N_FG, borderBottom: `1px solid ${N_BORDER}`, whiteSpace: "nowrap" }}>
                            {row.month} {isBreakEven ? "✓" : ""}
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: N_FG, borderBottom: `1px solid ${N_BORDER}` }}>{row.orders}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: N_FG, borderBottom: `1px solid ${N_BORDER}` }}>{formatCurrency(row.revenue, currency)}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: N_SUBTLE, borderBottom: `1px solid ${N_BORDER}` }}>{formatCurrency(row.ingredientsCost, currency)}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: N_SUBTLE, borderBottom: `1px solid ${N_BORDER}` }}>{formatCurrency(row.labourCost, currency)}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: N_SUBTLE, borderBottom: `1px solid ${N_BORDER}` }}>{formatCurrency(row.fixedCosts, currency)}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: row.grossProfit >= 0 ? "#065f46" : "#b91c1c", borderBottom: `1px solid ${N_BORDER}` }}>{formatCurrency(row.grossProfit, currency)}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: isNegProfit ? "#b91c1c" : "#065f46", borderBottom: `1px solid ${N_BORDER}` }}>{formatCurrency(row.netProfit, currency)}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: isCumNeg ? "#b91c1c" : "#065f46", borderBottom: `1px solid ${N_BORDER}` }}>{formatCurrency(row.cumulativeProfit, currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {saveResult && (
              <div style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "6px", background: saveResult.startsWith("✓") ? "rgba(5,150,105,0.07)" : "rgba(220,38,38,0.07)", border: `1px solid ${saveResult.startsWith("✓") ? "rgba(5,150,105,0.2)" : "rgba(220,38,38,0.2)"}`, fontSize: "13px", color: saveResult.startsWith("✓") ? "#065f46" : "#b91c1c" }}>
                {saveResult}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              {financialsDb ? (
                <button
                  onClick={() => void saveFinancials()}
                  disabled={saving}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 22px", borderRadius: "6px", border: "none", background: saving ? "rgba(55,53,47,0.12)" : ACCENT, color: saving ? N_MUTED : "white", fontSize: "14px", fontWeight: 600, cursor: saving ? "default" : "pointer", fontFamily: N_FONT }}
                >
                  {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : "Save to Notion"}
                </button>
              ) : (
                <p style={{ fontSize: "12px", color: N_MUTED }}>Deploy Financial Projections database to save.</p>
              )}
              <button
                onClick={() => void runProjection()}
                disabled={loading}
                style={{ padding: "10px 22px", borderRadius: "6px", border: `1px solid ${N_BORDER}`, background: "white", color: N_FG, fontSize: "14px", fontWeight: 500, cursor: loading ? "default" : "pointer", fontFamily: N_FONT }}
              >
                Recalculate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
