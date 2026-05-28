"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { WORKFLOW_CATALOG } from "@/lib/workflow-catalog";

const TOP_ITEMS = [
  { emoji: "🚀", label: "Get Started", href: "/members/get-started?view=1" },
  { emoji: "🔍", label: "Research Assistant", href: "/members/chat" },
] as const;

export function MembersNav({
  collapsed = false,
  supportUnread: _supportUnread = 0,
  activeWorkflows = [],
}: {
  collapsed?: boolean;
  supportUnread?: number;
  activeWorkflows?: string[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [workspaceOpen, setWorkspaceOpen] = useState(true);

  function isActive(path: string) {
    return pathname === path || pathname.startsWith(path + "/");
  }

  const workspaceActive = isActive("/members/workspace") || isActive("/members/workflows");

  const extraWorkflows = activeWorkflows
    .map((slug) => WORKFLOW_CATALOG.find((w) => w.id === slug))
    .filter((w): w is NonNullable<typeof w> => w !== undefined);

  // Scores for TOP_ITEMS active detection (query-param aware)
  const topItemScores = TOP_ITEMS.map((item) => {
    const [pathOnly, rawQuery = ""] = item.href.split("?");
    if (!pathOnly) return -1;
    if (!(pathname === pathOnly || pathname.startsWith(pathOnly + "/"))) return -1;
    const itemParams = new URLSearchParams(rawQuery);
    for (const [key, value] of itemParams.entries()) {
      if (searchParams.get(key) !== value) return -1;
    }
    return Array.from(itemParams.keys()).length;
  });
  const topMaxScore = topItemScores.reduce((best, s) => (s > best ? s : best), -1);

  const navItem = (
    href: string,
    emoji: string,
    label: string,
    active: boolean,
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
      title={collapsed ? label : undefined}
    >
      <span style={{ fontSize: "16px", lineHeight: 1, width: collapsed ? "16px" : "20px", textAlign: "center", flexShrink: 0 }}>
        {emoji}
      </span>
      {!collapsed && (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {label}
        </span>
      )}
    </Link>
  );

  const subItem = (href: string, emoji: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href as never}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "3px 8px 3px 28px",
        borderRadius: "3px",
        fontSize: "13px",
        color: active ? "#37352F" : "rgba(55,53,47,0.75)",
        background: active ? "rgba(55,53,47,0.08)" : "transparent",
        textDecoration: "none",
        userSelect: "none",
      }}
      className="hover:bg-[rgba(55,53,47,0.06)]"
    >
      <span style={{ fontSize: "13px", lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
        {label}
      </span>
    </Link>
  );

  return (
    <nav style={{ padding: "4px 8px" }}>
      {!collapsed && (
        <p style={{ fontSize: "11px", fontWeight: 500, color: "rgba(55,53,47,0.45)", textTransform: "uppercase", letterSpacing: "0.05em", padding: "8px 8px 3px" }}>
          Workspace
        </p>
      )}

      {/* Get Started */}
      {navItem(TOP_ITEMS[0].href, TOP_ITEMS[0].emoji, TOP_ITEMS[0].label, topMaxScore >= 0 && topItemScores[0] === topMaxScore)}

      {/* My Workspace — toggleable dropdown */}
      <button
        type="button"
        onClick={() => !collapsed && setWorkspaceOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: collapsed ? "6px" : "4px 8px",
          borderRadius: "3px",
          fontSize: "14px",
          color: "#37352F",
          background: workspaceActive ? "rgba(55,53,47,0.08)" : "transparent",
          border: "none",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
          userSelect: "none",
          justifyContent: collapsed ? "center" : "flex-start",
          fontFamily: "inherit",
        }}
        className="hover:bg-[rgba(55,53,47,0.06)]"
        title={collapsed ? "My Workspace" : undefined}
      >
        <span style={{ fontSize: "16px", lineHeight: 1, width: collapsed ? "16px" : "20px", textAlign: "center", flexShrink: 0 }}>
          🗂️
        </span>
        {!collapsed && (
          <>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              My Workspace
            </span>
            {workspaceOpen
              ? <ChevronDown style={{ width: "13px", height: "13px", flexShrink: 0, color: "rgba(55,53,47,0.4)" }} />
              : <ChevronRight style={{ width: "13px", height: "13px", flexShrink: 0, color: "rgba(55,53,47,0.4)" }} />
            }
          </>
        )}
      </button>

      {/* Sub-items — only shown when expanded and sidebar not icon-only */}
      {!collapsed && workspaceOpen && (
        <>
          {extraWorkflows.map((w) =>
            subItem(
              `/members/workspace?niche=${w.id}`,
              w.emoji,
              w.name,
              isActive("/members/workspace") && searchParams.get("niche") === w.id,
            ),
          )}
          {subItem(
            "/members/workflows",
            "＋",
            "Browse workflows",
            isActive("/members/workflows"),
          )}
        </>
      )}

      {/* Research Assistant */}
      {navItem(TOP_ITEMS[1].href, TOP_ITEMS[1].emoji, TOP_ITEMS[1].label, topMaxScore >= 0 && topItemScores[1] === topMaxScore)}
    </nav>
  );
}

