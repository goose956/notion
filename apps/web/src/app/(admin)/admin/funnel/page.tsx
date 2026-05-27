import { getFunnelStats, getFunnelTotals } from "@niche-factory/db";
import { MousePointerClick, Users, Zap, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

// ─── Summary card ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`icon-badge ${accent ?? ""}`}>{icon}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FunnelPage() {
  const [totals, stats] = await Promise.all([
    getFunnelTotals(30),
    getFunnelStats(30),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Acquisition Funnel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Last 30 days · activation link clicks through workspace creation
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Link clicks"
          value={totals.totalClicks.toLocaleString()}
          sub="unique link visits"
          icon={<MousePointerClick className="h-4 w-4" />}
          accent="icon-badge-blue"
        />
        <StatCard
          label="Activations"
          value={totals.totalActivations.toLocaleString()}
          sub="links redeemed"
          icon={<Zap className="h-4 w-4" />}
          accent="icon-badge-green"
        />
        <StatCard
          label="Signups"
          value={totals.totalSignups.toLocaleString()}
          sub="email signups"
          icon={<Users className="h-4 w-4" />}
          accent="icon-badge-purple"
        />
        <StatCard
          label="Conversion rate"
          value={`${totals.overallConversion}%`}
          sub="clicks → activations"
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Channel breakdown table */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">By channel</h2>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-muted-foreground text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Channel</th>
                <th className="text-right px-4 py-3 font-medium">Clicks</th>
                <th className="text-right px-4 py-3 font-medium">Activations</th>
                <th className="text-right px-4 py-3 font-medium">Workspaces</th>
                <th className="text-right px-4 py-3 font-medium">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-12 text-muted-foreground"
                  >
                    No data yet. Share an activation link to start tracking.
                  </td>
                </tr>
              ) : (
                stats.map((row, i) => (
                  <tr
                    key={row.channel ?? "direct"}
                    className={i % 2 === 0 ? "bg-card" : "bg-muted/10"}
                  >
                    <td className="px-4 py-3 font-medium">
                      {row.channel ?? (
                        <span className="text-muted-foreground">direct / unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.clicks.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.activations.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.workspacesCreated.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={
                          Number(row.conversionRate) >= 10
                            ? "text-green-600 dark:text-green-400 font-medium"
                            : Number(row.conversionRate) >= 5
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                        }
                      >
                        {row.conversionRate}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
