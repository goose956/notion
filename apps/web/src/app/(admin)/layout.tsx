import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userName = session?.user?.name ?? session?.user?.email ?? "Account";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3 flex items-center gap-6">
        <Link href="/niches" className="font-semibold text-lg tracking-tight">
          Niche Factory
        </Link>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/niches" className="hover:text-foreground transition-colors">
            Niches
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
              className="hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
