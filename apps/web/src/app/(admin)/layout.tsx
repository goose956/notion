import Link from "next/link";
import { cookies } from "next/headers";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { AdminNav } from "./admin-nav";
import { getOpenTicketCount } from "@niche-factory/db";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already enforces the password cookie for all /admin/* routes.
  // Layout just renders the shell.
  const session = await auth();
  const userName = session?.user?.name ?? session?.user?.email ?? "Account";

  const openTickets = await getOpenTicketCount().catch(() => 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur px-4 py-3 md:px-6 flex flex-wrap items-center gap-3 md:gap-6">
        <Link href="/admin" className="font-semibold text-lg tracking-tight inline-flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/s-logo.png" alt="Stridivo" className="h-7 w-auto" />
          Stridivo.com
        </Link>
        <AdminNav openTickets={openTickets} />
        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground max-w-full">
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
          <form
            action={async () => {
              "use server";
              cookies().set("admin_auth", "", { maxAge: 0, path: "/" });
              redirect("/admin/login");
            }}
          >
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors text-xs"
            >
              <LogOut className="h-3 w-3" />
              Admin logout
            </button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
