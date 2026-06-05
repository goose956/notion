import { getAnalyticsSummary, getDailyViews, getTopPages } from "@niche-factory/db";
import { Activity, Bot, Eye, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

// ─── Inline SVG Line Chart ────────────────────────────────────────────────────

function LineChart({
  data,
}: {
  data: { date: string; human: number; llm: number; bot: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No data yet
      </div>
    );
  }

  const W = 780;
  const H = 200;
  const PAD = { top: 16, right: 20, bottom: 40, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => d.human + d.llm + d.bot), 1);

  const xScale = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * innerW;
  const yScale = (v: number) => PAD.top + innerH - (v / maxVal) * innerH;

  function polyline(values: number[], color: string) {
    const pts = values.map((v, i) => `${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(" ");
    return <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />;
  }

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * maxVal));
  // X-axis: show every ~7th label
  const step = Math.max(1, Math.floor(data.length / 8));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-label="Daily views chart">
      {/* Grid lines */}
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left}
            y1={yScale(tick).toFixed(1)}
            x2={W - PAD.right}
            y2={yScale(tick).toFixed(1)}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
          <text
            x={PAD.left - 6}
            y={yScale(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="10"
            fill="currentColor"
            opacity="0.45"
          >
            {tick}
          </text>
        </g>
      ))}

      {/* Lines */}
      {polyline(data.map((d) => d.human), "hsl(var(--primary))")}
      {polyline(data.map((d) => d.llm), "#f59e0b")}
      {polyline(data.map((d) => d.bot), "hsl(var(--muted-foreground))")}

      {/* X labels */}
      {data.map((d, i) =>
        i % step === 0 ? (
          <text
            key={d.date}
            x={xScale(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize="9"
            fill="currentColor"
            opacity="0.45"
          >
            {d.date.slice(5)}
          </text>
        ) : null,
      )}

      {/* Legend */}
      <g transform={`translate(${PAD.left}, ${H - 6})`}>
        <rect x={0} y={-4} width={10} height={4} fill="hsl(var(--primary))" rx="1" />
        <text x={14} y={0} fontSize="9" fill="currentColor" opacity="0.6">Human</text>
        <rect x={60} y={-4} width={10} height={4} fill="#f59e0b" rx="1" />
        <text x={74} y={0} fontSize="9" fill="currentColor" opacity="0.6">LLM</text>
        <rect x={106} y={-4} width={10} height={4} fill="hsl(var(--muted-foreground))" rx="1" />
        <text x={120} y={0} fontSize="9" fill="currentColor" opacity="0.6">Bot</text>
      </g>
    </svg>
  );
}

// ─── Horizontal Bar Chart ─────────────────────────────────────────────────────

function TopPagesChart({
  rows,
}: {
  rows: { path: string; total: number; human: number; llm: number }[];
}) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No page view data yet
      </div>
    );
  }

  const max = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div className="space-y-2.5">
      {rows.map((row) => {
        const humanPct = (row.human / max) * 100;
        const llmPct = (row.llm / max) * 100;
        const label = row.path.replace(/^\/templates\//, "").replace(/-/g, " ").slice(0, 50);
        return (
          <div key={row.path} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground truncate mb-1" title={row.path}>
                {label || row.path}
              </div>
              <div className="h-4 w-full rounded bg-muted/30 overflow-hidden flex">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${humanPct.toFixed(1)}%` }}
                  title={`${row.human} human`}
                />
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${llmPct.toFixed(1)}%` }}
                  title={`${row.llm} LLM`}
                />
              </div>
            </div>
            <span className="text-xs font-medium tabular-nums text-right min-w-[2rem]">
              {row.total}
            </span>
          </div>
        );
      })}
    </div>
  );
}

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
      <p className="text-3xl font-bold tracking-tight">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StatsPage() {
  const empty = { totalViews: 0, totalLlm: 0, totalHuman: 0, todayViews: 0, todayLlm: 0 };
  const [summary, daily, topPages] = await Promise.all([
    getAnalyticsSummary().catch(() => empty),
    getDailyViews(30).catch(() => [] as { date: string; human: number; llm: number; bot: number }[]),
    getTopPages(15, 30).catch(() => [] as { path: string; total: number; human: number; llm: number }[]),
  ]);

  const llmPct =
    summary.totalViews > 0 ? ((summary.totalLlm / summary.totalViews) * 100).toFixed(1) : "0";

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Last 30 days · all page views including LLM crawlers</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total views"
          value={summary.totalViews}
          sub="all time"
          icon={<Eye className="h-4 w-4" />}
        />
        <StatCard
          label="Human visits"
          value={summary.totalHuman}
          sub="browsers & apps"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="LLM crawler visits"
          value={summary.totalLlm}
          sub={`${llmPct}% of total`}
          icon={<Bot className="h-4 w-4" />}
          accent="text-amber-600"
        />
        <StatCard
          label="Views today"
          value={summary.todayViews}
          sub={`${summary.todayLlm} LLM`}
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      {/* Line chart */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-base font-semibold">Daily views — last 30 days</h2>
        <LineChart data={daily} />
      </section>

      {/* Top pages */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-base font-semibold">Top pages (30 days)</h2>
        <div className="flex gap-4 text-xs text-muted-foreground mb-2">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-primary" />
            Human
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-amber-400" />
            LLM
          </span>
        </div>
        <TopPagesChart rows={topPages} />
      </section>

      {/* Raw table */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-base font-semibold">Page breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Path</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Human</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">LLM</th>
                <th className="text-right px-6 py-3 font-medium text-muted-foreground">LLM %</th>
              </tr>
            </thead>
            <tbody>
              {topPages.map((row) => (
                <tr key={row.path} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-3 font-mono text-xs truncate max-w-xs">{row.path}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{row.total}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.human}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-600">{row.llm}</td>
                  <td className="px-6 py-3 text-right tabular-nums text-muted-foreground">
                    {row.total > 0 ? ((row.llm / row.total) * 100).toFixed(0) : 0}%
                  </td>
                </tr>
              ))}
              {topPages.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    No data yet — page views will appear here once visitors arrive.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
