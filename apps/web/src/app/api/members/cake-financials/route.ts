import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deductCredits, findOrCreateCustomer, getCustomerCredits } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  startingOrders:     z.number().min(0),
  avgOrderValue:      z.number().positive(),
  ingredientsCostPct: z.number().min(0).max(100),
  hourlyRate:         z.number().min(0),
  hoursPerOrder:      z.number().min(0),
  fixedMonthlyCosts:  z.number().min(0),
  monthlyGrowthRate:  z.number().min(0).max(200),
});

const CREDITS_PER_CALL = 1;

interface MonthRow {
  month:             string;
  orders:            number;
  revenue:           number;
  ingredientsCost:   number;
  labourCost:        number;
  fixedCosts:        number;
  grossProfit:       number;
  netProfit:         number;
  cumulativeProfit:  number;
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

  const { startingOrders, avgOrderValue, ingredientsCostPct, hourlyRate, hoursPerOrder, fixedMonthlyCosts, monthlyGrowthRate } = parsed.data;

  const MONTH_NAMES: string[] = ["Month 1","Month 2","Month 3","Month 4","Month 5","Month 6","Month 7","Month 8","Month 9","Month 10","Month 11","Month 12"];
  const months: MonthRow[] = [];
  let cumulative = 0;
  let breakEvenMonth: string | null = null;

  // Labour cost per order = hourly rate × hours per order
  const labourCostPerOrder = hourlyRate * hoursPerOrder;

  for (let i = 0; i < 12; i++) {
    const orders          = Math.round(startingOrders * Math.pow(1 + monthlyGrowthRate / 100, i));
    const revenue         = Math.round(orders * avgOrderValue);
    const ingredientsCost = Math.round(revenue * ingredientsCostPct / 100);
    const labourCost      = Math.round(orders * labourCostPerOrder);
    const grossProfit     = revenue - ingredientsCost - labourCost;
    const netProfit       = grossProfit - fixedMonthlyCosts;
    cumulative           += netProfit;

    const row: MonthRow = {
      month:            MONTH_NAMES[i] ?? `Month ${i + 1}`,
      orders,
      revenue,
      ingredientsCost,
      labourCost,
      fixedCosts:       fixedMonthlyCosts,
      grossProfit:      Math.round(grossProfit),
      netProfit:        Math.round(netProfit),
      cumulativeProfit: Math.round(cumulative),
    };

    if (!breakEvenMonth && cumulative >= 0) breakEvenMonth = row.month;
    months.push(row);
  }

  const last         = months[11]!;
  const totalProfit  = months.reduce((s, m) => s + m.netProfit, 0);
  const grossMargin  = last.revenue > 0 ? Math.round((last.grossProfit / last.revenue) * 100) : 0;
  const labourPct    = last.revenue > 0 ? Math.round((last.labourCost / last.revenue) * 100)  : 0;

  const summary = [
    `Based on ${startingOrders} orders/month at an average of £${avgOrderValue} per order, growing ${monthlyGrowthRate}% per month,`,
    `you reach ${last.orders} orders by month 12 with £${last.revenue.toLocaleString()} monthly revenue.`,
    `Ingredients: ${ingredientsCostPct}% · Labour (${hoursPerOrder}hrs × £${hourlyRate}/hr): ${labourPct}% · Gross margin: ${grossMargin}%.`,
    breakEvenMonth
      ? `Cumulative break-even reached in ${breakEvenMonth}.`
      : "Cumulative break-even is not reached within 12 months — review your pricing or cost structure.",
    `Total year-1 net profit: £${totalProfit.toLocaleString()}.`,
  ].join(" ");

  await deductCredits(userEmail, CREDITS_PER_CALL);
  return NextResponse.json({ months, breakEvenMonth, summary });
}
