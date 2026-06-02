"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, getCurrencyCode, formatCurrency } from "./utils";

interface MonthRow {
  month:            string;
  appointments:     number;
  revenue:          number;
  materialsCost:    number;
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

function calcServicePrice(
  materialsCost: number,
  timeHrs: number,
  hourlyRate: number,
  overheadPerAppt: number,
  marginPct: number,
): { minPrice: number; recommendedPrice: number; breakdown: { label: string; value: number }[] } {
  const labourCost   = timeHrs * hourlyRate;
  const subtotal     = materialsCost + labourCost + overheadPerAppt;
  const profit       = subtotal * (marginPct / 100);
  return {
    minPrice:         Math.ceil(subtotal),
    recommendedPrice: Math.ceil(subtotal + profit),
    breakdown: [
      { label: "Materials / products",                              value: materialsCost },
      { label: `Labour (${timeHrs}h × £${hourlyRate}/h)`,          value: Math.round(labourCost * 100) / 100 },
      { label: "Overhead per appointment",                          value: Math.round(overheadPerAppt * 100) / 100 },
      { label: `Profit margin (${marginPct}%)`,                     value: Math.round(profit * 100) / 100 },
    ],
  };
}

export function NailPricingCalculator({
  criteria,
  financialsDb,
  onRowAdded,
}: {
  criteria:     Record<string, unknown> | null;
  financialsDb: WorkspaceDatabase | null;
  onRowAdded:   (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const currency = getCurrencyCode(criteria);

  // ── Service pricing state ──
  const [materialsCost,     setMaterialsCost]     = useState("5");
  const [timeHrs,           setTimeHrs]           = useState("1.5");
  const [hourlyRate,        setHourlyRate]         = useState("15");
  const [monthlyOverhead,   setMonthlyOverhead]    = useState("150");
  const [apptsPerMonth,     setApptsPerMonth]      = useState("20");
  const [marginPct,         setMarginPct]          = useState("30");

  // ── Projector state ──
  const [startingAppts,     setStartingAppts]      = useState("10");
  const [avgApptValue,      setAvgApptValue]       = useState("45");
  const [materialsPct,      setMaterialsPct]       = useState("15");
  const [projHourlyRate,    setProjHourlyRate]     = useState("15");
  const [projApptHours,     setProjApptHours]      = useState("1.5");
  const [fixedMonthlyCosts, setFixedMonthlyCosts]  = useState("150");
  const [monthlyGrowth,     setMonthlyGrowth]      = useState("8");

  const [financialResult, setFinancialResult] = useState<FinancialResult | null>(null);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [saving,          setSaving]          = useState(false);
  const [saveResult,      setSaveResult]      = useState<string | null>(null);

  const overheadPerAppt = (parseFloat(monthlyOverhead) || 0) / Math.max(parseFloat(apptsPerMonth) || 1, 1);
  const pricing = calcServicePrice(
    parseFloat(materialsCost) || 0,
    parseFloat(timeHrs)       || 0,
    parseFloat(hourlyRate)    || 0,
    overheadPerAppt,
    parseFloat(marginPct)     || 0,
  );

  async function runProjection() {
    const sAppts = parseFloat(startingAppts);
    const aov    = parseFloat(avgApptValue);
    if (isNaN(sAppts) || isNaN(aov) || aov <= 0) { setError("Enter starting appointments and average appointment value."); return; }
    setLoading(true); setError(null); setFinancialResult(null); setSaveResult(null);
    try {
      const res = await fetch("/api/members/nail-financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startingAppointments: sAppts,
          avgAppointmentValue:  aov,
          materialsCostPct:     parseFloat(materialsPct)     || 15,
          hourlyRate:           parseFloat(projHourlyRate)   || 0,
          avgAppointmentHours:  parseFloat(projApptHours)    || 0,
          fixedMonthlyCosts:    parseFloat(fixedMonthlyCosts)|| 0,
          monthlyGrowthRate:    parseFloat(monthlyGrowth)    || 0,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      setFinancialResult(await res.json() as FinancialResult);
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
          "Month":          row.month,
          "Appointments":   row.appointments,
          "Revenue":        row.revenue,
          "Materials Cost": row.materialsCost,
          "Labour Cost":    row.labourCost,
          "Fixed Costs":    row.fixedCosts,
          "Gross Profit":   row.grossProfit,
          "Net Profit":     row.netProfit,
          "Cumulative Profit": row.cumulativeProfit,
        };
        const propertyTypes: Record<string, string> = {
          "Month": "title", "Appointments": "number", "Revenue": "number",
          "Materials Cost": "number", "Labour Cost": "number", "Fixed Costs": "number",
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

      {/* ── SERVICE PRICING CALCULATOR ─────────────────────────────────────────── */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 800, color: N_FG }}>💅 Service Pricing Calculator</h1>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          Most nail techs and beauty therapists underprice by forgetting their overhead and real labour cost. Enter your costs — get your true minimum price and a healthy recommended price.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
          {input("Materials / products per service", materialsCost, setMaterialsCost, "£", "Gel, tips, lash adhesive, tint, etc. for this specific treatment")}
          {input("Service duration (hours)", timeHrs, setTimeHrs, undefined, "Full time including setup, treatment and clean-down")}
          {input("Your hourly rate", hourlyRate, setHourlyRate, "£", "What your time is worth — include training, expertise")}
          {input("Monthly overhead", monthlyOverhead, setMonthlyOverhead, "£", "Chair rental, insurance, products, tools, subscriptions")}
          {input("Appointments per month", apptsPerMonth, setApptsPerMonth, undefined, "Used to split overhead across bookings")}
          {input("Target profit margin", marginPct, setMarginPct, undefined, "% on top of all costs — 25–40% recommended")}
        </div>

        {/* Result card */}
        <div style={{ borderRadius: "14px", border: `2px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${ACCENT_BORDER}` }}>
            <p style={{ margin: "0 0 2px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#86198f" }}>Your service pricing</p>
            <div style={{ display: "flex", gap: "24px", alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: "11px", color: N_MUTED }}>Minimum (break-even)</p>
                <p style={{ margin: 0, fontSize: "32px", fontWeight: 800, color: N_FG }}>{formatCurrency(pricing.minPrice, currency)}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: "11px", color: N_MUTED }}>Recommended (with {marginPct}% margin)</p>
                <p style={{ margin: 0, fontSize: "32px", fontWeight: 800, color: "#86198f" }}>{formatCurrency(pricing.recommendedPrice, currency)}</p>
              </div>
            </div>
          </div>
          <div style={{ padding: "14px 20px" }}>
            <p style={{ margin: "0 0 10px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: N_MUTED }}>Cost breakdown</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {pricing.breakdown.map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: N_FG }}>{item.label}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: item.label.startsWith("Profit") ? "#86198f" : N_FG }}>
                    {formatCurrency(item.value, currency)}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "10px", padding: "10px 12px", borderRadius: "8px", background: "rgba(192,38,211,0.06)", border: "1px solid rgba(192,38,211,0.15)" }}>
              <p style={{ margin: 0, fontSize: "12px", color: "#86198f", lineHeight: 1.6 }}>
                <strong>Overhead per appointment:</strong> {formatCurrency(overheadPerAppt, currency)} (£{monthlyOverhead}/month ÷ {apptsPerMonth} appointments).
                If you&apos;re charging less than <strong>{formatCurrency(pricing.minPrice, currency)}</strong>, you are working at a loss after costs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── FINANCIAL PROJECTOR ────────────────────────────────────────────────── */}
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 800, color: N_FG }}>📊 12-Month Financial Projector</h2>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          Project your monthly revenue, materials, labour and profit over 12 months. Labour is costed per appointment — not a blanket percentage.
          <span style={{ color: "#86198f", fontWeight: 600 }}> 1 credit.</span>
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
          {input("Starting appointments/month", startingAppts, setStartingAppts, undefined, "How many appointments you take right now")}
          {input("Average appointment value", avgApptValue, setAvgApptValue, "£", "Average revenue per booking across all services")}
          {input("Materials cost %", materialsPct, setMaterialsPct, undefined, "As % of revenue — typically 10–20% for beauty")}
          {input("Your hourly rate", projHourlyRate, setProjHourlyRate, "£", "Your time cost — include expertise and training")}
          {input("Avg appointment length (hours)", projApptHours, setProjApptHours, undefined, "Average across all service types")}
          {input("Fixed monthly costs", fixedMonthlyCosts, setFixedMonthlyCosts, "£", "Chair rent, insurance, tools — doesn't change with bookings")}
          {input("Monthly booking growth %", monthlyGrowth, setMonthlyGrowth, undefined, "Expected % more bookings each month (0 = flat)")}
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
            <div style={{ padding: "12px 16px", borderRadius: "10px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, marginBottom: "20px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: N_FG, lineHeight: 1.7 }}>{financialResult.summary}</p>
            </div>

            <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, overflow: "hidden", marginBottom: "20px" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: N_FONT }}>
                  <thead>
                    <tr style={{ background: "rgba(55,53,47,0.04)" }}>
                      {["Month","Appts","Revenue","Materials","Labour","Fixed","Gross Profit","Net Profit","Cumulative"].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: N_MUTED, whiteSpace: "nowrap", borderBottom: `1px solid ${N_BORDER}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {financialResult.months.map((row, i) => {
                      const isBreakEven = row.month === financialResult.breakEvenMonth;
                      return (
                        <tr key={row.month} style={{ background: isBreakEven ? "rgba(5,150,105,0.05)" : i % 2 === 0 ? "white" : "rgba(55,53,47,0.015)" }}>
                          <td style={{ padding: "9px 12px", fontWeight: isBreakEven ? 700 : 400, color: N_FG, borderBottom: `1px solid ${N_BORDER}`, whiteSpace: "nowrap" }}>{row.month}{isBreakEven ? " ✓" : ""}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: N_FG, borderBottom: `1px solid ${N_BORDER}` }}>{row.appointments}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: N_FG, borderBottom: `1px solid ${N_BORDER}` }}>{formatCurrency(row.revenue, currency)}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: N_SUBTLE, borderBottom: `1px solid ${N_BORDER}` }}>{formatCurrency(row.materialsCost, currency)}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: N_SUBTLE, borderBottom: `1px solid ${N_BORDER}` }}>{formatCurrency(row.labourCost, currency)}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", color: N_SUBTLE, borderBottom: `1px solid ${N_BORDER}` }}>{formatCurrency(row.fixedCosts, currency)}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: row.grossProfit >= 0 ? "#065f46" : "#b91c1c", borderBottom: `1px solid ${N_BORDER}` }}>{formatCurrency(row.grossProfit, currency)}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: row.netProfit < 0 ? "#b91c1c" : "#065f46", borderBottom: `1px solid ${N_BORDER}` }}>{formatCurrency(row.netProfit, currency)}</td>
                          <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: row.cumulativeProfit < 0 ? "#b91c1c" : "#065f46", borderBottom: `1px solid ${N_BORDER}` }}>{formatCurrency(row.cumulativeProfit, currency)}</td>
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
