import Link from "next/link";
import { Bot, LayoutDashboard, Settings2, Sparkles, User } from "lucide-react";

/** Lightweight shell used only by /members/preview (no auth required). */
export default function MembersPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar — mirrors (members)/layout.tsx but uses dummy identity */}
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

        {/* Dummy user identity */}
        <div className="px-4 py-4 border-b flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold shrink-0 text-primary">
            AD
          </div>
          <span className="text-sm font-medium truncate">Alex Demo</span>
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
            href="/members/preview"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm bg-accent text-accent-foreground font-medium transition-colors"
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
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
