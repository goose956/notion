import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Settings2, LogOut } from "lucide-react";
import { MembersNav } from "./members-nav";

const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

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
  const initials = (userName[0] ?? "?").toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        fontFamily: N_FONT,
      }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: "240px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "#F7F6F3",
          borderRight: "1px solid rgba(55,53,47,0.09)",
        }}
      >
        {/* Workspace header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 14px 8px",
          }}
        >
          <div
            style={{
              width: "22px",
              height: "22px",
              borderRadius: "3px",
              background: "#37352F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "white", fontSize: "11px", fontWeight: 700 }}>
              N
            </span>
          </div>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#37352F",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Niche Factory
          </span>
        </div>

        {/* User identity */}
        <div style={{ padding: "0 8px 8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 8px",
              borderRadius: "3px",
            }}
          >
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userImage}
                alt=""
                width={20}
                height={20}
                style={{ borderRadius: "50%", flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#37352F",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{ color: "white", fontSize: "10px", fontWeight: 600 }}
                >
                  {initials}
                </span>
              </div>
            )}
            <span
              style={{
                fontSize: "14px",
                color: "#37352F",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {userName}
            </span>
          </div>
        </div>

        <div
          style={{ height: "1px", background: "rgba(55,53,47,0.09)" }}
        />

        {/* Navigation */}
        <MembersNav />

        <div style={{ flex: 1 }} />

        {/* Bottom: admin + sign out */}
        <div
          style={{
            borderTop: "1px solid rgba(55,53,47,0.09)",
            padding: "4px 8px",
          }}
        >
          <Link
            href="/admin"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 8px",
              borderRadius: "3px",
              fontSize: "14px",
              color: "rgba(55,53,47,0.65)",
              textDecoration: "none",
            }}
            className="hover:bg-[rgba(55,53,47,0.06)]"
          >
            <Settings2 style={{ width: "14px", height: "14px", flexShrink: 0 }} />
            Admin panel
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                borderRadius: "3px",
                fontSize: "14px",
                color: "rgba(55,53,47,0.65)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                width: "100%",
                fontFamily: N_FONT,
              }}
              className="hover:bg-[rgba(55,53,47,0.06)]"
            >
              <LogOut style={{ width: "14px", height: "14px", flexShrink: 0 }} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          background: "white",
          fontFamily: N_FONT,
        }}
      >
        {children}
      </main>
    </div>
  );
}


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
