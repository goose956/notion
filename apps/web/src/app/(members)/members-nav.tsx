"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { emoji: "🚀", label: "Get Started", href: "/members/get-started" },
  { emoji: "🗂️", label: "My Workspace", href: "/members/workspace" },
  { emoji: "🔍", label: "Research Assistant", href: "/members/chat" },
  { emoji: "✍️", label: "Draft letters", href: "/members/workspace?nicheId=wedding-planner&dbId=documents&editor=1" },
  { emoji: "👤", label: "Profile", href: "/members/profile" },
] as const;

export function MembersNav() {
  const pathname = usePathname();

  return (
    <nav style={{ padding: "4px 8px" }}>
      <p
        style={{
          fontSize: "11px",
          fontWeight: 500,
          color: "rgba(55,53,47,0.45)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          padding: "8px 8px 3px",
        }}
      >
        Workspace
      </p>
      {ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 8px",
              borderRadius: "3px",
              fontSize: "14px",
              color: "#37352F",
              background: active ? "rgba(55,53,47,0.08)" : "transparent",
              textDecoration: "none",
              userSelect: "none",
            }}
            className="hover:bg-[rgba(55,53,47,0.06)]"
          >
            <span
              style={{
                fontSize: "16px",
                lineHeight: 1,
                width: "20px",
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              {item.emoji}
            </span>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
