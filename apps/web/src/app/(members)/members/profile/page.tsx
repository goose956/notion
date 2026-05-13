import { auth } from "@/auth";
import { getPurchasedTemplates } from "@niche-factory/db";
import Link from "next/link";
import { ArrowRight, Mail, ShoppingBag, Tag } from "lucide-react";

export const metadata = { title: "Profile — Niche Factory" };

export default async function ProfilePage() {
  const session = await auth();
  // Layout guarantees session is non-null; cast for TS
  const s = session!;
  const user = s.user ?? {};

  const name = user.name ?? "Member";
  const email = user.email ?? "";
  const image = user.image ?? null;
  const notionUserId = (s as Record<string, unknown>)["notionUserId"] as
    | string
    | undefined;

  const purchasedTemplates = email ? await getPurchasedTemplates(email) : [];

  return (
    <div className="p-8 max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your account details and purchased templates.
        </p>
      </div>

      {/* Identity card */}
      <section className="rounded-xl border bg-card p-6 space-y-5">
        <div className="flex items-center gap-4">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              width={72}
              height={72}
              className="rounded-full border"
            />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-muted flex items-center justify-center text-2xl font-semibold border">
              {name[0]?.toUpperCase() ?? "?"}
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xl font-semibold leading-tight">{name}</p>
            {email && (
              <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {email}
              </p>
            )}
          </div>
        </div>

        <div className="border-t pt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Connected via
            </p>
            <p className="font-medium">Notion</p>
          </div>
          {notionUserId && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Notion user ID
              </p>
              <p className="font-mono text-xs bg-muted rounded px-2 py-1 truncate">
                {notionUserId}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Purchased templates */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">My Templates</h2>
          {purchasedTemplates.length > 0 && (
            <span className="ml-auto text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 font-medium">
              {purchasedTemplates.length}
            </span>
          )}
        </div>

        {purchasedTemplates.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center space-y-3">
            <Tag className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              No templates purchased yet.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Browse templates
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {purchasedTemplates.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{t.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {t.tagline}
                  </p>
                </div>
                <Link
                  href={`/templates/${t.slug}`}
                  className="shrink-0 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
