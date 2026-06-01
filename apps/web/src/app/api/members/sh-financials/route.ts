import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deductCredits, findOrCreateCustomer, getCustomerCredits } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  pricePerSale:       z.number().positive(),
  costPerSale:        z.number().min(0),
  fixedMonthlyCosts:  z.number().min(0),
  startingCustomers:  z.number().min(0),
  monthlyGrowthRate:  z.number().min(0).max(200),
});

const CREDITS_PER_CALL = 1;

interface MonthRow {
  month:           string;
  customers:       number;
  revenue:         number;
  variableCosts:   number;
  fixedCosts:      number;
  profit:          number;
  cumulativeProfit: number;
}

interface FinancialResult {
  months:         MonthRow[];
  breakEvenMonth: string | null;
  summary:        string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const userEmail = session.user.email;
  await findOrCreateCustomer(userEmail).catch(() => null);
  const credits = await getCustomerCredits(userEmail).catch(() => 0);
  if (credits < CREDITS_PER_CALL) {
    return NextResponse.json({ error: `You need ${CREDITS_PER_CALL} credit to generate financial projections.` }, { status: 402 });
  }

  const { pricePerSale, costPerSale, fixedMonthlyCosts, startingCustomers, monthlyGrowthRate } = parsed.data;

  const MONTH_NAMES = ["Month 1","Month 2","Month 3","Month 4","Month 5","Month 6","Month 7","Month 8","Month 9","Month 10","Month 11","Month 12"];
  const months: MonthRow[] = [];
  let cumulative = 0;
  let breakEvenMonth: string | null = null;

  for (let i = 0; i < 12; i++) {
    const customers      = Math.round(startingCustomers * Math.pow(1 + monthlyGrowthRate / 100, i));
    const revenue        = Math.round(customers * pricePerSale);
    const variableCosts  = Math.round(customers * costPerSale);
    const profit         = revenue - variableCosts - fixedMonthlyCosts;
    cumulative          += profit;

    const row: MonthRow = {
      month:            MONTH_NAMES[i]!,
      customers,
      revenue,
      variableCosts,
      fixedCosts:       fixedMonthlyCosts,
      profit:           Math.round(profit),
      cumulativeProfit: Math.round(cumulative),
    };

    if (!breakEvenMonth && cumulative >= 0) {
      breakEvenMonth = row.month;
    }

    months.push(row);
  }

  const lastRow    = months[11]!;
  const totalProfit = months.reduce((s, m) => s + m.profit, 0);
  const grossMargin = lastRow.revenue > 0
    ? Math.round(((lastRow.revenue - lastRow.variableCosts) / lastRow.revenue) * 100)
    : 0;

  const summary = [
    `Based on ${startingCustomers} starting customers growing at ${monthlyGrowthRate}% per month,`,
    `you reach ${lastRow.customers} customers by month 12 with £${lastRow.revenue.toLocaleString()} monthly revenue.`,
    breakEvenMonth
      ? `Cumulative break-even is reached in ${breakEvenMonth}.`
      : "The business does not reach cumulative break-even within 12 months at these numbers.",
    `Total year-1 profit: £${totalProfit.toLocaleString()}. Gross margin: ${grossMargin}%.`,
  ].join(" ");

  await deductCredits(userEmail, CREDITS_PER_CALL);

  const result: FinancialResult = { months, breakEvenMonth, summary };
  return NextResponse.json(result);
}
