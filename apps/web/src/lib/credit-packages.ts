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
    id: "growth",
    name: "Growth",
    credits: 180,
    priceCents: 2900,
    highlight: "popular",
  },
  {
    id: "scale",
    name: "Scale",
    credits: 450,
    priceCents: 5900,
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
