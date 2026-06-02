import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findOrCreateCustomer, getSettingValue } from "@niche-factory/db";
import { auth } from "@/auth";

const BodySchema = z.object({
  avgPrice:        z.number().positive(),
  avgCogs:         z.number().min(0),
  monthlyListings: z.number().min(0).default(0),
  adSpend:         z.number().min(0).default(0),
  fixedCosts:      z.number().min(0).default(0),
  startSales:      z.number().positive(),
  growthRate:      z.number().min(0).default(5),
});

// Intentionally no credits deducted — pure maths, no AI
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  await findOrCreateCustomer(session.user.email).catch(() => null);
  await getSettingValue("anthropic.model"); // warm up — no-op here

  const d = parsed.data;
  // Etsy fee rates
  const TRANSACTION_RATE  = 0.065;  // 6.5%
  const PAYMENT_RATE      = 0.03;   // ~3%
  const PAYMENT_FIXED     = 0.25;   // $0.25 per transaction
  const LISTING_FEE       = 0.20;   // $0.20 per listing renewal

  const months: Array<{
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
  }> = [];

  let cumulative = 0;
  let breakEvenMonth: number | null = null;
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  for (let i = 0; i < 12; i++) {
    const sales = Math.round(d.startSales * Math.pow(1 + d.growthRate / 100, i));
    const revenue         = sales * d.avgPrice;
    const transactionFees = revenue * TRANSACTION_RATE;
    const paymentFees     = sales * (d.avgPrice * PAYMENT_RATE + PAYMENT_FIXED);
    const listingFees     = d.monthlyListings * LISTING_FEE;
    const cogs            = sales * d.avgCogs;
    const adSpend         = d.adSpend;
    const fixedCosts      = d.fixedCosts;
    const netProfit       = revenue - transactionFees - paymentFees - listingFees - cogs - adSpend - fixedCosts;
    cumulative += netProfit;
    if (breakEvenMonth === null && cumulative >= 0) breakEvenMonth = i + 1;

    months.push({
      month: MONTH_NAMES[i % 12] ?? String(i + 1),
      sales,
      revenue,
      transactionFees,
      paymentFees,
      listingFees,
      cogs,
      adSpend,
      fixedCosts,
      netProfit,
      cumulativeProfit: cumulative,
    });
  }

  const peakMonth      = months.reduce((best, m) => (m.netProfit > best.netProfit ? m : best), months[0]!);
  const totalRevenue   = months.reduce((s, m) => s + m.revenue, 0);
  const totalNet       = months.reduce((s, m) => s + m.netProfit, 0);
  const totalFees      = months.reduce((s, m) => s + m.transactionFees + m.paymentFees + m.listingFees, 0);
  const avgMarginPct   = totalRevenue > 0 ? (totalNet / totalRevenue) * 100 : 0;

  return NextResponse.json({
    months,
    breakEvenMonth,
    summary: {
      totalRevenue,
      totalNet,
      totalFees,
      avgMarginPct,
      peakMonthName:   peakMonth.month,
      peakNetProfit:   peakMonth.netProfit,
    },
  });
}
