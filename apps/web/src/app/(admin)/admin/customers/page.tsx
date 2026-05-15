import Link from "next/link";
import { listCustomers, listPurchasesWithDetails } from "@niche-factory/db";
import { Coins, ShoppingBag, Sparkles, Users } from "lucide-react";
import { CreditsEditor } from "./credits-editor";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const [customers, purchases] = await Promise.all([
    listCustomers().catch(() => []),
    listPurchasesWithDetails().catch(() => []),
  ]);

  const totalRevenueCents = purchases.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalRevenue = (totalRevenueCents / 100).toFixed(2);

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
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">Recent Purchases</h2>
        </div>
        {purchases.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No purchases yet.</p>
        ) : (
          <div className="divide-y">
            {purchases.map((p) => (
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
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">All Customers</h2>
        </div>
        {customers.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No customers yet.</p>
        ) : (
          <div className="divide-y">
            {customers.map((c) => {
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
