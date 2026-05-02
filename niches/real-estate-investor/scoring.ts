/**
 * scoring.ts — Pure domain math for the Real Estate Investor niche.
 *
 * These functions have zero external dependencies and are 100% testable.
 * The sync engine calls these before writing enrichment results to Notion.
 */

export interface DealInputs {
  askingPrice: number;
  arv: number;
  rehabCost: number;
}

export interface DealScoreResult {
  maxOffer: number;
  margin: number;
  meetsSeventyPercentRule: boolean;
  /** 0–100 — higher is better */
  dealScore: number;
}

/**
 * Apply the 70% rule to score a deal.
 *
 * The 70% rule: an investor should pay no more than 70% of the ARV
 * minus the cost of repairs.
 *
 * Max Offer = ARV × 0.70 − Rehab Cost
 * Deal Score = clamp((maxOffer − askingPrice) / maxOffer × 100, 0, 100)
 */
export function scoreDeal(inputs: DealInputs): DealScoreResult {
  const { askingPrice, arv, rehabCost } = inputs;

  if (arv <= 0) {
    throw new RangeError("ARV must be greater than zero");
  }

  const maxOffer = arv * 0.7 - rehabCost;
  const margin = maxOffer - askingPrice;
  const meetsSeventyPercentRule = askingPrice <= maxOffer;

  const rawScore = maxOffer > 0 ? (margin / maxOffer) * 100 : 0;
  const dealScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  return { maxOffer, margin, meetsSeventyPercentRule, dealScore };
}

/**
 * Estimate a rough cash-on-cash return for a BRRRR deal.
 * Simplified: (annual net rent - annual debt service) / down payment
 */
export function estimateCashOnCash(params: {
  purchasePrice: number;
  downPaymentPercent: number;
  monthlyRent: number;
  monthlyExpenses: number;
  interestRate: number;
  loanTermYears: number;
}): number {
  const {
    purchasePrice,
    downPaymentPercent,
    monthlyRent,
    monthlyExpenses,
    interestRate,
    loanTermYears,
  } = params;

  const downPayment = purchasePrice * (downPaymentPercent / 100);
  const loanAmount = purchasePrice - downPayment;
  const monthlyRate = interestRate / 100 / 12;
  const payments = loanTermYears * 12;

  const monthlyDebtService =
    monthlyRate > 0
      ? (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, payments))) /
        (Math.pow(1 + monthlyRate, payments) - 1)
      : loanAmount / payments;

  const annualNOI = (monthlyRent - monthlyExpenses) * 12;
  const annualDebtService = monthlyDebtService * 12;
  const annualCashFlow = annualNOI - annualDebtService;

  return downPayment > 0 ? (annualCashFlow / downPayment) * 100 : 0;
}
