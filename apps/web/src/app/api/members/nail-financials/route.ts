import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deductCredits, findOrCreateCustomer, getCustomerCredits } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  startingAppointments: z.number().min(0),
  avgAppointmentValue:  z.number().positive(),
  materialsCostPct:     z.number().min(0).max(100),
  hourlyRate:           z.number().min(0),
  avgAppointmentHours:  z.number().min(0),
  fixedMonthlyCosts:    z.number().min(0),
  monthlyGrowthRate:    z.number().min(0).max(200),
});

const CREDITS_PER_CALL = 1;

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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const userEmail = session.user.email;
  await findOrCreateCustomer(userEmail).catch(() => null);
  const credits = await getCustomerCredits(userEmail).catch(() => 0);
  if (credits < CREDITS_PER_CALL) {
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to generate financial projections.` }, { status: 402 });
  }

  const { startingAppointments, avgAppointmentValue, materialsCostPct, hourlyRate, avgAppointmentHours, fixedMonthlyCosts, monthlyGrowthRate } = parsed.data;

  const MONTH_NAMES: string[] = ["Month 1","Month 2","Month 3","Month 4","Month 5","Month 6","Month 7","Month 8","Month 9","Month 10","Month 11","Month 12"];
  const months: MonthRow[] = [];
  let cumulative = 0;
  let breakEvenMonth: string | null = null;

  const labourCostPerAppt = hourlyRate * avgAppointmentHours;

  for (let i = 0; i < 12; i++) {
    const appointments = Math.round(startingAppointments * Math.pow(1 + monthlyGrowthRate / 100, i));
    const revenue      = Math.round(appointments * avgAppointmentValue);
    const materialsCost = Math.round(revenue * materialsCostPct / 100);
    const labourCost   = Math.round(appointments * labourCostPerAppt);
    const grossProfit  = revenue - materialsCost - labourCost;
    const netProfit    = grossProfit - fixedMonthlyCosts;
    cumulative        += netProfit;

    const row: MonthRow = {
      month:            MONTH_NAMES[i] ?? `Month ${i + 1}`,
      appointments,
      revenue,
      materialsCost,
      labourCost,
      fixedCosts:       fixedMonthlyCosts,
      grossProfit:      Math.round(grossProfit),
      netProfit:        Math.round(netProfit),
      cumulativeProfit: Math.round(cumulative),
    };

    if (!breakEvenMonth && cumulative >= 0) breakEvenMonth = row.month;
    months.push(row);
  }

  const last        = months[11]!;
  const totalProfit = months.reduce((s, m) => s + m.netProfit, 0);
  const grossMargin = last.revenue > 0 ? Math.round((last.grossProfit / last.revenue) * 100) : 0;
  const labourPct   = last.revenue > 0 ? Math.round((last.labourCost  / last.revenue) * 100) : 0;

  const summary = [
    `Based on ${startingAppointments} appointments/month at £${avgAppointmentValue} average, growing ${monthlyGrowthRate}% per month,`,
    `you reach ${last.appointments} appointments by month 12 with £${last.revenue.toLocaleString()} monthly revenue.`,
    `Materials: ${materialsCostPct}% · Labour (${avgAppointmentHours}hrs × £${hourlyRate}/hr): ${labourPct}% · Gross margin: ${grossMargin}%.`,
    breakEvenMonth
      ? `Cumulative break-even reached in ${breakEvenMonth}.`
      : "Cumulative break-even not reached within 12 months — review your pricing or fixed cost structure.",
    `Total year-1 net profit: £${totalProfit.toLocaleString()}.`,
  ].join(" ");

  await deductCredits(userEmail, CREDITS_PER_CALL);
  return NextResponse.json({ months, breakEvenMonth, summary });
}
