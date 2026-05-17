import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { BarChart2, Blocks, Bot, LayoutDashboard, LogOut, SlidersHorizontal, Sparkles, Users, Wrench } from "lucide-react";

function isAdminEmail(email: string | null | undefined): boolean {
  const raw = process.env["ADMIN_EMAIL"] ?? "";
  if (!raw.trim()) return true; // not configured — allow all (dev fallback)
  return raw.split(",").map((e) => e.trim().toLowerCase()).includes((email ?? "").toLowerCase());
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userName = session?.user?.name ?? session?.user?.email ?? "Account";

  if (!isAdminEmail(session?.user?.email)) {
    redirect("/members/get-started");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur px-6 py-3 flex items-center gap-6">
        <Link href="/admin" className="font-semibold text-lg tracking-tight inline-flex items-center gap-2">
          <span className="icon-badge"><Sparkles className="h-4 w-4" /></span>
          Niche Factory
        </Link>
        <nav className="flex gap-1 text-sm text-muted-foreground border rounded-xl p-1.5 bg-card/80">
          <Link href="/admin" className="rounded-lg px-3 py-1.5 hover:bg-muted/60 hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <Link href="/admin/niches" className="rounded-lg px-3 py-1.5 hover:bg-muted/60 hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <Blocks className="h-3.5 w-3.5" />
            Niches
          </Link>
          <Link href="/admin/templates" className="rounded-lg px-3 py-1.5 hover:bg-muted/60 hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <Blocks className="h-3.5 w-3.5" />
            Templates
          </Link>
          <Link href="/admin/customers" className="rounded-lg px-3 py-1.5 hover:bg-muted/60 hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Customers
          </Link>
          <Link href="/admin/agents" className="rounded-lg px-3 py-1.5 hover:bg-muted/60 hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            Agents
          </Link>
          <Link href="/admin/tools" className="rounded-lg px-3 py-1.5 hover:bg-muted/60 hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5" />
            Tools
          </Link>
          <Link href="/admin/settings" className="rounded-lg px-3 py-1.5 hover:bg-muted/60 hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Settings
          </Link>
          <Link href="/admin/stats" className="rounded-lg px-3 py-1.5 hover:bg-muted/60 hover:text-foreground transition-colors inline-flex items-center gap-1.5">
            <BarChart2 className="h-3.5 w-3.5" />
            Stats
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <span className="truncate max-w-[160px]">{userName}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
