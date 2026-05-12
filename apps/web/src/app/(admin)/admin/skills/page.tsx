import { SkillsCatalog } from "@/components/skills/skills-catalog";

export default function SkillsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="surface-card p-6 bg-card/80">
        <h1 className="text-2xl font-bold tracking-tight">Skills Catalog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All registered agent skills. Skills marked as needing an API key can be configured in{" "}
          <a href="/admin/settings" className="underline text-primary">
            Settings
          </a>
          .
        </p>
      </div>
      <SkillsCatalog />
    </div>
  );
}
