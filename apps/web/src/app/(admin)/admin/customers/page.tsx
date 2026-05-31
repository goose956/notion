import Link from "next/link";
import { listCustomers, listPurchasesWithDetails } from "@niche-factory/db";
import { Coins, ShoppingBag, Sparkles, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { CreditsEditor } from "./credits-editor";
import { DeleteCustomerButton } from "./delete-customer-button";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [customers, purchases] = await Promise.all([
    listCustomers().catch(() => []),
    listPurchasesWithDetails().catch(() => []),
  ]);

  const totalRevenueCents = purchases.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalRevenue = (totalRevenueCents / 100).toFixed(2);

  // ── Customers pagination ──────────────────────────────────────────────────
  const cPage = Math.max(1, parseInt(String(searchParams["cPage"] ?? "1"), 10) || 1);
  const cTotalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));
  const cSafePage = Math.min(cPage, cTotalPages);
  const pagedCustomers = customers.slice((cSafePage - 1) * PAGE_SIZE, cSafePage * PAGE_SIZE);

  // ── Purchases pagination ──────────────────────────────────────────────────
  const pPage = Math.max(1, parseInt(String(searchParams["pPage"] ?? "1"), 10) || 1);
  const pTotalPages = Math.max(1, Math.ceil(purchases.length / PAGE_SIZE));
  const pSafePage = Math.min(pPage, pTotalPages);
  const pagedPurchases = purchases.slice((pSafePage - 1) * PAGE_SIZE, pSafePage * PAGE_SIZE);

  function pageUrl(params: { cPage?: number; pPage?: number }) {
    const p = new URLSearchParams();
    if ((params.cPage ?? cSafePage) !== 1) p.set("cPage", String(params.cPage ?? cSafePage));
    if ((params.pPage ?? pSafePage) !== 1) p.set("pPage", String(params.pPage ?? pSafePage));
    const qs = p.toString();
    return `/admin/customers${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground bg-background/80 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Customer Management
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Everyone who has purchased a template, and what they own.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface-card p-4 space-y-1">
          <div className="icon-badge"><Users className="h-4 w-4" /></div>
          <p className="text-2xl font-bold mt-2">{customers.length}</p>
          <p className="text-xs text-muted-foreground">Total customers</p>
        </div>
        <div className="surface-card p-4 space-y-1">
          <div className="icon-badge"><ShoppingBag className="h-4 w-4" /></div>
          <p className="text-2xl font-bold mt-2">{purchases.length}</p>
          <p className="text-xs text-muted-foreground">Total purchases</p>
        </div>
        <div className="surface-card p-4 space-y-1">
          <div className="icon-badge"><Sparkles className="h-4 w-4" /></div>
          <p className="text-2xl font-bold mt-2">${totalRevenue}</p>
          <p className="text-xs text-muted-foreground">Total revenue</p>
        </div>
        <div className="surface-card p-4 space-y-1">
          <div className="icon-badge"><Coins className="h-4 w-4" /></div>
          <p className="text-2xl font-bold mt-2">
            {customers.reduce((s, c) => s + (c.credits ?? 0), 0)}
          </p>
          <p className="text-xs text-muted-foreground">Total credits outstanding</p>
        </div>
      </div>

      {/* Recent purchases */}
      <div className="surface-card overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm">
            Recent Purchases
            {pTotalPages > 1 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                page {pSafePage} of {pTotalPages}
              </span>
            )}
          </h2>
          {pTotalPages > 1 && (
            <div className="flex items-center gap-1">
              <Link
                href={pageUrl({ pPage: pSafePage - 1 })}
                className={`p-1 rounded hover:bg-muted transition-colors ${pSafePage <= 1 ? "pointer-events-none opacity-30" : ""}`}
                aria-disabled={pSafePage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <Link
                href={pageUrl({ pPage: pSafePage + 1 })}
                className={`p-1 rounded hover:bg-muted transition-colors ${pSafePage >= pTotalPages ? "pointer-events-none opacity-30" : ""}`}
                aria-disabled={pSafePage >= pTotalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
        {purchases.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No purchases yet.</p>
        ) : (
          <div className="divide-y">
            {pagedPurchases.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.customerEmail}</p>
                  <Link
                    href={`/templates/${p.templateSlug}`}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    {p.templateTitle}
                  </Link>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-medium">${(p.amountPaid / 100).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.purchasedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customers list */}
      <div className="surface-card overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm">
            All Customers
            {cTotalPages > 1 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {(cSafePage - 1) * PAGE_SIZE + 1}–{Math.min(cSafePage * PAGE_SIZE, customers.length)} of {customers.length}
              </span>
            )}
          </h2>
          {cTotalPages > 1 && (
            <div className="flex items-center gap-1">
              <Link
                href={pageUrl({ cPage: cSafePage - 1 })}
                className={`p-1 rounded hover:bg-muted transition-colors ${cSafePage <= 1 ? "pointer-events-none opacity-30" : ""}`}
                aria-disabled={cSafePage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <Link
                href={pageUrl({ cPage: cSafePage + 1 })}
                className={`p-1 rounded hover:bg-muted transition-colors ${cSafePage >= cTotalPages ? "pointer-events-none opacity-30" : ""}`}
                aria-disabled={cSafePage >= cTotalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
        {customers.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No customers yet.</p>
        ) : (
          <div className="divide-y">
            {pagedCustomers.map((c) => {
              const customerPurchases = purchases.filter((p) => p.customerEmail === c.email);
              return (
                <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {customerPurchases.length} purchase{customerPurchases.length !== 1 ? "s" : ""}
                      {c.notionUserId ? " · Notion linked" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <CreditsEditor email={c.email} initialCredits={c.credits ?? 25} />
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </p>
                    <DeleteCustomerButton email={c.email} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
