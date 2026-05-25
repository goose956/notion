export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  highlight?: "best" | "popular";
};

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 60,
    priceCents: 1200,
  },
  {
    id: "boost",
    name: "Boost",
    credits: 110,
    priceCents: 1980,
  },
  {
    id: "growth",
    name: "Growth",
    credits: 170,
    priceCents: 2720,
    highlight: "popular",
  },
  {
    id: "pro",
    name: "Pro",
    credits: 260,
    priceCents: 3640,
  },
  {
    id: "studio",
    name: "Studio",
    credits: 380,
    priceCents: 4560,
  },
  {
    id: "scale",
    name: "Scale",
    credits: 600,
    priceCents: 6000,
    highlight: "best",
  },
];

export function getCreditPackage(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((pkg) => pkg.id === packageId);
}

export function centsToUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function getCostPerCredit(pkg: CreditPackage): number {
  return pkg.priceCents / pkg.credits;
}

export function getRelativeMarkupPercent(pkg: CreditPackage, baseline: CreditPackage): number {
  const pkgCost = getCostPerCredit(pkg);
  const baselineCost = getCostPerCredit(baseline);
  if (baselineCost <= 0) return 0;
  return Math.max(0, Math.round(((pkgCost - baselineCost) / baselineCost) * 100));
}
