"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Blocks, Bot, FileText, LayoutDashboard, SlidersHorizontal, Users, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/niches", label: "Niches", icon: Blocks },
  { href: "/admin/templates", label: "Templates", icon: FileText },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/agents", label: "Agents", icon: Bot },
  { href: "/admin/tools", label: "Tools", icon: Wrench },
  { href: "/admin/settings", label: "Settings", icon: SlidersHorizontal },
  { href: "/admin/stats", label: "Stats", icon: BarChart2 },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="order-3 w-full md:order-none md:w-auto flex gap-1 text-sm text-muted-foreground border rounded-xl p-1.5 bg-card/80 overflow-x-auto whitespace-nowrap">
      {navItems.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-lg px-3 py-1.5 transition-colors inline-flex items-center gap-1.5",
              isActive
                ? "bg-primary/10 text-primary font-semibold"
                : "hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
