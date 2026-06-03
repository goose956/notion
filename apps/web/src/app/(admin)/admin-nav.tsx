"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Blocks, Bot, Download, FileText, LayoutDashboard, MessageSquare, SlidersHorizontal, TrendingUp, Users, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true as boolean },
  { href: "/admin/niches", label: "Niches", icon: Blocks, exact: false as boolean },
  { href: "/admin/templates", label: "Templates", icon: FileText, exact: false as boolean },
  { href: "/admin/customers", label: "Customers", icon: Users, exact: false as boolean },
  { href: "/admin/agents", label: "Agents", icon: Bot, exact: false as boolean },
  { href: "/admin/tools", label: "Tools", icon: Wrench, exact: false as boolean },
  { href: "/admin/settings", label: "Settings", icon: SlidersHorizontal, exact: false as boolean },
  { href: "/admin/stats", label: "Stats", icon: BarChart2, exact: false as boolean },
  { href: "/admin/funnel", label: "Funnel", icon: TrendingUp, exact: false as boolean },
  { href: "/admin/support", label: "Support", icon: MessageSquare, exact: false as boolean },
  { href: "/admin/export", label: "Export", icon: Download, exact: false as boolean },
] as const;

export function AdminNav({ openTickets = 0 }: { openTickets?: number }) {
  const pathname = usePathname();

  return (
    <nav className="order-3 w-full md:order-none md:w-auto flex gap-1 text-sm text-muted-foreground border rounded-xl p-1.5 bg-card/80 overflow-x-auto whitespace-nowrap">
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        const showBadge = href === "/admin/support" && openTickets > 0;
        return (
          <Link
            key={href}
            href={href as never}
            className={cn(
              "rounded-lg px-3 py-1.5 transition-colors inline-flex items-center gap-1.5",
              isActive
                ? "bg-primary/10 text-primary font-semibold"
                : "hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {showBadge && (
              <span className="ml-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold leading-none inline-flex items-center justify-center px-1">
                {openTickets > 99 ? "99+" : openTickets}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
