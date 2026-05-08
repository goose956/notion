import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage all workspace operations from one place. Templates are one tab of the admin panel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/niches"
          className="rounded-lg border bg-card p-5 hover:bg-muted/30 transition-colors"
        >
          <h2 className="font-semibold">Niches</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage niche packs, editors, and deployment workflows.
          </p>
        </Link>

        <Link
          href="/admin/templates"
          className="rounded-lg border bg-card p-5 hover:bg-muted/30 transition-colors"
        >
          <h2 className="font-semibold">Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Build and publish SEO/LLM-optimized directory pages with payment links and stats.
          </p>
        </Link>
      </div>
    </div>
  );
}
