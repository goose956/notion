import Link from "next/link";
import { ArrowRight, Blocks, FileText, SlidersHorizontal, Sparkles, Users } from "lucide-react";

export default function AdminHomePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="surface-card p-6 bg-card/80">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground bg-background/80">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Admin Command Center
        </div>
        <h1 className="text-2xl font-bold tracking-tight mt-3">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage all workspace operations from one place. Templates are one tab of the admin panel.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          href="/admin/niches"
          className="surface-card p-5 hover:shadow-lg transition-shadow"
        >
          <div className="icon-badge"><Blocks className="h-4 w-4" /></div>
          <h2 className="font-semibold mt-3">Niches</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage niche packs, editors, and deployment workflows.
          </p>
          <span className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-primary">
            Open niches
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        <Link
          href="/admin/templates"
          className="surface-card p-5 hover:shadow-lg transition-shadow"
        >
          <div className="icon-badge"><FileText className="h-4 w-4" /></div>
          <h2 className="font-semibold mt-3">Templates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Build and publish SEO/LLM-optimized directory pages with payment links and stats.
          </p>
          <span className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-primary">
            Open templates
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        <Link
          href="/admin/customers"
          className="surface-card p-5 hover:shadow-lg transition-shadow"
        >
          <div className="icon-badge"><Users className="h-4 w-4" /></div>
          <h2 className="font-semibold mt-3">Customers</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View buyers, purchased templates, and revenue from Stripe checkouts.
          </p>
          <span className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-primary">
            Open customers
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        <Link
          href="/admin/settings"
          className="surface-card p-5 hover:shadow-lg transition-shadow"
        >
          <div className="icon-badge"><SlidersHorizontal className="h-4 w-4" /></div>
          <h2 className="font-semibold mt-3">Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure Stripe and AI integration credentials for runtime APIs.
          </p>
          <span className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-primary">
            Open settings
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
