"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const ITEMS = [
  { emoji: "🚀", label: "Get Started", href: "/members/get-started?view=1" },
  { emoji: "🗂️", label: "My Workspace", href: "/members/workspace" },
  { emoji: "🔍", label: "Research Assistant", href: "/members/chat" },
  { emoji: "🎫", label: "Support", href: "/members/support" },
] as const;

export function MembersNav({ collapsed = false, supportUnread = 0 }: { collapsed?: boolean; supportUnread?: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const itemScores = ITEMS.map((item) => {
    const [pathOnly, rawQuery = ""] = item.href.split("?");
    if (!pathOnly) return -1;

    const pathMatches =
      pathname === pathOnly || pathname.startsWith(pathOnly + "/");
    if (!pathMatches) return -1;

    const itemParams = new URLSearchParams(rawQuery);
    for (const [key, value] of itemParams.entries()) {
      if (searchParams.get(key) !== value) return -1;
    }

    return Array.from(itemParams.keys()).length;
  });

  const maxScore = itemScores.reduce((best, score) => (score > best ? score : best), -1);

  return (
    <nav style={{ padding: "4px 8px" }}>
      {!collapsed && (
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
      )}
      {ITEMS.map((item, index) => {
        const active = maxScore >= 0 && itemScores[index] === maxScore;
        return (
          <Link
            key={item.href}
            href={item.href as never}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: collapsed ? "6px" : "4px 8px",
              borderRadius: "3px",
              fontSize: "14px",
              color: "#37352F",
              background: active ? "rgba(55,53,47,0.08)" : "transparent",
              textDecoration: "none",
              userSelect: "none",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
            className="hover:bg-[rgba(55,53,47,0.06)]"
            title={collapsed ? item.label : undefined}
          >
            <span
              style={{
                fontSize: "16px",
                lineHeight: 1,
                width: collapsed ? "16px" : "20px",
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              {item.emoji}
            </span>
            {!collapsed && (
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
            )}
            {item.href === "/members/support" && supportUnread > 0 && (
              <span
                style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "rgb(235,87,87)",
                  flexShrink: 0,
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
