import { listActivationLinks, listNichePacks } from "@niche-factory/db";
import { Link2, Sparkles } from "lucide-react";
import { CreateLinkForm } from "./create-link-form";
import { LinkActions } from "./link-actions";

export const dynamic = "force-dynamic";

export default async function ActivationLinksPage() {
  const [links, niche_packs] = await Promise.all([
    listActivationLinks().catch(() => []),
    listNichePacks().catch(() => []),
  ]);

  const niches = niche_packs.map((n) => ({ id: n.id, name: n.name }));

  const used = links.filter((l) => l.uses > 0);
  const unused = links.filter((l) => l.uses === 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground bg-background/80 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Sales Management
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Activation Links</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create links for Etsy (or any external) sales. Each link grants credits and provisions a niche workspace. Links can be single or multi-use.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="surface-card p-4 space-y-1">
          <div className="icon-badge"><Link2 className="h-4 w-4" /></div>
          <p className="text-2xl font-bold mt-2">{links.length}</p>
          <p className="text-xs text-muted-foreground">Total links created</p>
        </div>
        <div className="surface-card p-4 space-y-1">
          <div className="icon-badge"><Link2 className="h-4 w-4" /></div>
          <p className="text-2xl font-bold mt-2">{unused.length}</p>
          <p className="text-xs text-muted-foreground">Available (unredeemed)</p>
        </div>
        <div className="surface-card p-4 space-y-1">
          <div className="icon-badge"><Link2 className="h-4 w-4" /></div>
          <p className="text-2xl font-bold mt-2">{used.length}</p>
          <p className="text-xs text-muted-foreground">Redeemed</p>
        </div>
      </div>

      {/* Create form */}
      <CreateLinkForm niches={niches} />

      {/* Links table */}
      <div className="surface-card overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">All links</h2>
        </div>
        {links.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No links created yet. Create one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Label</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Niche</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Credits</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Uses</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Expires</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">First used by</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Created</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {links.map((link) => {
                  const now = new Date();
                  const isExpired = link.expiresAt != null && link.expiresAt < now;
                  const isMaxed = link.maxUses != null && link.uses >= link.maxUses;
                  const statusLabel = link.revoked
                    ? "Revoked"
                    : isExpired
                    ? "Expired"
                    : isMaxed
                    ? "Maxed out"
                    : link.uses > 0
                    ? "Active (used)"
                    : "Active";
                  const statusColor = link.revoked || isExpired || isMaxed
                    ? "bg-red-100 text-red-700"
                    : link.uses > 0
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700";

                  return (
                    <tr key={link.token} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium">{link.label || <span className="text-muted-foreground italic">—</span>}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{link.nichePackId}</td>
                      <td className="px-4 py-3 font-medium">{link.credits}</td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {link.uses}{link.maxUses != null ? ` / ${link.maxUses}` : " / ∞"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {link.usedBy ?? "—"}
                        {link.usedAt && (
                          <span className="ml-1 text-muted-foreground/60">
                            · {new Date(link.usedAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(link.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <LinkActions token={link.token} revoked={link.revoked} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
