import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Blocks, Bot, LayoutDashboard, LogIn, LogOut, SlidersHorizontal, Sparkles, Users, Wrench } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isLoggedIn = session !== null && session !== undefined;
  const userName = session?.user?.name ?? session?.user?.email ?? "Account";

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
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          {isLoggedIn ? (
            <>
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
            </>
          ) : (
            <Link
              href="/login?callbackUrl=/admin"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border text-xs font-medium h-8 px-3 hover:bg-muted transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in with Notion
            </Link>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
