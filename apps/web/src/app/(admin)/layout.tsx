import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      </header>
      <main>{children}</main>
    </div>
  );
}
