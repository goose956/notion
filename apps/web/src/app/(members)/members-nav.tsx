"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { WORKFLOW_CATALOG } from "@/lib/workflow-catalog";

const STATIC_ITEMS = [
  { emoji: "🚀", label: "Get Started", href: "/members/get-started?view=1" },
  { emoji: "🗂️", label: "My Workspace", href: "/members/workspace" },
  { emoji: "🔍", label: "Research Assistant", href: "/members/chat" },
  { emoji: "🎫", label: "Support", href: "/members/support" },
] as const;

export function MembersNav({
  collapsed = false,
  supportUnread = 0,
  activeWorkflows = [],
}: {
  collapsed?: boolean;
  supportUnread?: number;
  activeWorkflows?: string[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function isActive(href: string) {
    const [pathOnly, rawQuery = ""] = href.split("?");
    if (!pathOnly) return false;
    const pathMatches = pathname === pathOnly || pathname.startsWith(pathOnly + "/");
    if (!pathMatches) return false;
    const itemParams = new URLSearchParams(rawQuery);
    for (const [key, value] of itemParams.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  }

  // Determine active static item (with query param scoring)
  const itemScores = STATIC_ITEMS.map((item) => {
    const [pathOnly, rawQuery = ""] = item.href.split("?");
    if (!pathOnly) return -1;
    const pathMatches = pathname === pathOnly || pathname.startsWith(pathOnly + "/");
    if (!pathMatches) return -1;
    const itemParams = new URLSearchParams(rawQuery);
    for (const [key, value] of itemParams.entries()) {
      if (searchParams.get(key) !== value) return -1;
    }
    return Array.from(itemParams.keys()).length;
  });
  const maxScore = itemScores.reduce((best, score) => (score > best ? score : best), -1);

  // Extra workflows (excluding any that are already covered by static items like chat)
  const extraWorkflows = activeWorkflows
    .filter((slug) => slug !== "research-assistant")
    .map((slug) => WORKFLOW_CATALOG.find((w) => w.id === slug))
    .filter((w): w is NonNullable<typeof w> => w !== undefined);

  const navLink = (
    href: string,
    content: React.ReactNode,
    active: boolean,
    titleText?: string,
  ) => (
    <Link
      key={href}
      href={href as never}
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
      title={collapsed ? titleText : undefined}
    >
      {content}
    </Link>
  );

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

      {STATIC_ITEMS.map((item, index) => {
        const active = maxScore >= 0 && itemScores[index] === maxScore;
        return navLink(
          item.href,
          <>
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
          </>,
          active,
          item.label,
        );
      })}

      {/* Active extra workflow nav items */}
      {extraWorkflows.map((w) => {
        const href = `/members/chat?niche=${w.id}`;
        const active = isActive("/members/chat") && searchParams.get("niche") === w.id;
        return navLink(
          href,
          <>
            <span
              style={{
                fontSize: "15px",
                lineHeight: 1,
                width: collapsed ? "16px" : "20px",
                textAlign: "center",
                flexShrink: 0,
              }}
            >
              {w.emoji}
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
                {w.name}
              </span>
            )}
          </>,
          active,
          w.name,
        );
      })}

      {/* Browse / add workflows link */}
      {navLink(
        "/members/workflows",
        <>
          <span
            style={{
              fontSize: "14px",
              lineHeight: 1,
              width: collapsed ? "16px" : "20px",
              textAlign: "center",
              flexShrink: 0,
              color: "rgba(55,53,47,0.5)",
            }}
          >
            ＋
          </span>
          {!collapsed && (
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                color: "rgba(55,53,47,0.6)",
                fontSize: "13px",
              }}
            >
              Browse workflows
            </span>
          )}
        </>,
        isActive("/members/workflows"),
        "Browse workflows",
      )}
    </nav>
  );
}
