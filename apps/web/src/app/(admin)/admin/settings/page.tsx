import { SettingsForm } from "@/components/settings/settings-form";
import { Sparkles, SlidersHorizontal } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground bg-background/80 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Platform Configuration
        </div>
        <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage integration credentials for Stripe and Anthropic.
        </p>
      </div>

      <SettingsForm />
    </div>
  );
}
