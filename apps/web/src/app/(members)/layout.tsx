import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Bot, LayoutDashboard, LogOut, Settings2, Sparkles, User } from "lucide-react";

export default async function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login?callbackUrl=/members/profile");
  }

  const userName = session.user?.name ?? session.user?.email ?? "Account";
  const userImage = session.user?.image ?? null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r bg-card">
        <div className="px-4 py-4 border-b">
          <Link
            href="/"
            className="font-semibold text-sm inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="icon-badge">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            Niche Factory
          </Link>
        </div>

        {/* User identity */}
        <div className="px-4 py-4 border-b flex items-center gap-3">
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt=""
              width={36}
              height={36}
              className="rounded-full shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
              {userName[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <span className="text-sm font-medium truncate">{userName}</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          <Link
            href="/members"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Overview
          </Link>
          <Link
            href="/members/profile"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          >
            <User className="h-4 w-4 shrink-0" />
            Profile
          </Link>
          <Link
            href="/members/chat"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          >
            <Bot className="h-4 w-4 shrink-0" />
            Research Chat
          </Link>
        </nav>

        {/* Admin shortcut */}
        <div className="px-3 pb-2">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors border border-dashed"
          >
            <Settings2 className="h-3.5 w-3.5 shrink-0" />
            Admin panel
          </Link>
        </div>

        {/* Sign out */}
        <div className="p-3 border-t">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors w-full"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
