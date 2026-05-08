import Link from "next/link";
import { auth, signOut } from "@/auth";

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
      <header className="border-b px-6 py-3 flex items-center gap-6">
        <Link href="/admin" className="font-semibold text-lg tracking-tight">
          Niche Factory
        </Link>
        <nav className="flex gap-1 text-sm text-muted-foreground border rounded-lg p-1">
          <Link href="/admin" className="rounded-md px-3 py-1.5 hover:bg-muted/60 hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <Link href="/admin/niches" className="rounded-md px-3 py-1.5 hover:bg-muted/60 hover:text-foreground transition-colors">
            Niches
          </Link>
          <Link href="/admin/templates" className="rounded-md px-3 py-1.5 hover:bg-muted/60 hover:text-foreground transition-colors">
            Templates
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
                  className="hover:text-foreground transition-colors"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login?callbackUrl=/admin"
              className="inline-flex items-center justify-center rounded-md border text-xs font-medium h-8 px-3 hover:bg-muted transition-colors"
            >
              Sign in with Notion
            </Link>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
