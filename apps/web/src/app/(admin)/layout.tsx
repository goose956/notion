import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { LogOut } from "lucide-react";
import { AdminNav } from "./admin-nav";

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
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur px-4 py-3 md:px-6 flex flex-wrap items-center gap-3 md:gap-6">
        <Link href="/admin" className="font-semibold text-lg tracking-tight inline-flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/s-logo.png" alt="Stridivo" className="h-7 w-auto" />
          Stridivo.com
        </Link>
        <AdminNav />
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
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
