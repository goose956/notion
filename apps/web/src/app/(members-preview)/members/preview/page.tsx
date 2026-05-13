/**
 * Dev-only preview of the members profile with dummy data.
 * No auth required — for local development and design review only.
 *
 * Not linked in production navigation, accessible at /members/preview.
 */
import Link from "next/link";
import { ArrowRight, Mail, MessageSquare, Settings2, ShoppingBag } from "lucide-react";

const DUMMY_MEMBER = {
  name: "Alex Demo",
  email: "alex@example.com",
  notionUserId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  initials: "AD",
};

const DUMMY_PURCHASES = [
  {
    id: "tpl-1",
    slug: "local-plumber-lead-pipeline",
    title: "Local Plumber Lead Pipeline",
    tagline: "Capture Google Maps businesses and turn raw listings into qualified outreach leads.",
  },
  {
    id: "tpl-2",
    slug: "creator-sponsorship-crm",
    title: "Creator Sponsorship CRM",
    tagline: "Manage brand deals, follow-ups, and payout stages without spreadsheet chaos.",
  },
];

export const metadata = { title: "Profile Preview — Niche Factory (Dev)" };

export default function MembersPreviewPage() {
  return (
    <div className="p-8 max-w-2xl space-y-8">
      {/* Dev banner */}
      <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center justify-between gap-4">
        <span>
          <strong>Dev preview</strong> — dummy data, no auth required.
        </span>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/admin" className="inline-flex items-center gap-1 hover:underline">
            <Settings2 className="h-3.5 w-3.5" />
            Admin
          </Link>
          <Link href="/members/profile" className="inline-flex items-center gap-1 hover:underline font-medium">
            Real profile →
          </Link>
        </div>
      </div>

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
          <div className="w-[72px] h-[72px] rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold border text-primary">
            {DUMMY_MEMBER.initials}
          </div>

          <div className="space-y-1">
            <p className="text-xl font-semibold leading-tight">{DUMMY_MEMBER.name}</p>
            <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {DUMMY_MEMBER.email}
            </p>
          </div>
        </div>

        <div className="border-t pt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Connected via
            </p>
            <p className="font-medium">Notion</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Notion user ID
            </p>
            <p className="font-mono text-xs bg-muted rounded px-2 py-1 truncate">
              {DUMMY_MEMBER.notionUserId}
            </p>
          </div>
        </div>
      </section>

      {/* Purchased templates */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">My Templates</h2>
          <span className="ml-auto text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 font-medium">
            {DUMMY_PURCHASES.length}
          </span>
        </div>

        <ul className="space-y-2">
          {DUMMY_PURCHASES.map((t) => (
            <li
              key={t.id}
              className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{t.title}</p>
                <p className="text-sm text-muted-foreground truncate">{t.tagline}</p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 text-sm text-muted-foreground">
                View
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Chat preview link */}
      <section>
        <Link
          href="/members/chat"
          className="rounded-xl border bg-card p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">Research Chat</p>
            <p className="text-sm text-muted-foreground">
              Ask Claude to research niches, competitors, or market trends.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </Link>
      </section>
    </div>
  );
}
