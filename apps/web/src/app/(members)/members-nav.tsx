"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { WORKFLOW_CATALOG } from "@/lib/workflow-catalog";

const TOP_ITEMS = [
  { emoji: "🚀", label: "Home", href: "/members/chat" },
  { emoji: "🔍", label: "Research Assistant", href: "/members/chat" }, // href built dynamically below
  { emoji: "🔖", label: "Browse Workflows", href: "/members/workflows" },
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
  const [lastNicheId, setLastNicheId] = useState<string | null>(null);

  // Persist the last selected niche so the radio stays highlighted when
  // the user navigates away from /members/workspace
  const nicheParam = searchParams.get("nicheId");
  useEffect(() => {
    if (isActive("/members/workspace") && nicheParam) {
      setLastNicheId(nicheParam);
      try { localStorage.setItem("lastNicheId", nicheParam); } catch { /* ignore */ }
    }
  }, [nicheParam, pathname]);

  // On first render, hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("lastNicheId");
      if (stored) setLastNicheId(stored);
    } catch { /* ignore */ }
  }, []);

  function isActive(path: string) {
    return pathname === path || pathname.startsWith(path + "/");
  }

  const workspaceActive = isActive("/members/workspace") || isActive("/members/workflows");

  const extraWorkflows = activeWorkflows
    .map((slug) => WORKFLOW_CATALOG.find((w) => w.id === slug))
    .filter((w): w is NonNullable<typeof w> => w !== undefined);

  // Which niche is effectively selected — used for Research Assistant link and sub-item highlighting
  const effectiveNicheId = isActive("/members/workspace")
    ? (nicheParam ?? extraWorkflows[0]?.id ?? null)
    : (lastNicheId ?? extraWorkflows[0]?.id ?? null);

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
        gap: "8px",
        padding: "5px 8px 5px 24px",
        borderRadius: "4px",
        fontSize: "13px",
        color: active ? "#37352F" : "rgba(55,53,47,0.75)",
        background: active ? "rgba(35,131,226,0.08)" : "transparent",
        textDecoration: "none",
        userSelect: "none",
        border: active ? "1px solid rgba(35,131,226,0.2)" : "1px solid transparent",
      }}
      className="hover:bg-[rgba(55,53,47,0.06)]"
    >
      {/* Radio indicator */}
      <span
        style={{
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          border: active ? "2px solid rgb(35,131,226)" : "2px solid rgba(55,53,47,0.25)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          transition: "border-color 0.15s",
        }}
      >
        {active && (
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "rgb(35,131,226)",
              display: "block",
            }}
          />
        )}
      </span>
      <span style={{ fontSize: "14px", lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontWeight: active ? 500 : 400 }}>
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

      {/* My Workspace — toggleable dropdown containing active workflows */}
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

      {/* Workflow sub-items — only active workflows, no Browse link */}
      {!collapsed && workspaceOpen && extraWorkflows.map((w, i) => {
        const active = effectiveNicheId === w.id || (effectiveNicheId === null && i === 0);
        return subItem(`/members/workspace?nicheId=${w.id}`, w.emoji, w.name, active);
      })}

      {/* Research Assistant — carries the active nicheId so the chat page pre-selects the right workspace */}
      {navItem(
        effectiveNicheId ? `/members/chat?nicheId=${effectiveNicheId}` : "/members/chat",
        TOP_ITEMS[1].emoji,
        TOP_ITEMS[1].label,
        topMaxScore >= 0 && topItemScores[1] === topMaxScore,
      )}

      {/* Browse Workflows — standalone link */}
      {navItem(TOP_ITEMS[2].href, TOP_ITEMS[2].emoji, TOP_ITEMS[2].label, topMaxScore >= 0 && topItemScores[2] === topMaxScore)}

      {/* Connections */}
      {navItem("/members/connections", "🔗", "Connections", isActive("/members/connections"))}
    </nav>
  );
}

