"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Coins, LogOut, Settings2 } from "lucide-react";
import { MembersNav } from "./members-nav";

const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

type MembersShellProps = {
  children: React.ReactNode;
  userName: string;
  userImage: string | null;
  initials: string;
  credits: number;
  signOutAction: () => Promise<void>;
};

export function MembersShell({
  children,
  userName,
  userImage,
  initials,
  credits,
  signOutAction,
}: MembersShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        fontFamily: N_FONT,
      }}
    >
      <aside
        style={{
          width: sidebarCollapsed ? "56px" : "240px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "#F7F6F3",
          borderRight: "1px solid rgba(55,53,47,0.09)",
          transition: "width 0.18s ease",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 10px 8px",
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

          {!sidebarCollapsed && (
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
          )}

          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-label={sidebarCollapsed ? "Expand members sidebar" : "Collapse members sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "4px",
              border: "1px solid rgba(55,53,47,0.12)",
              background: "white",
              color: "#37352F",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
            className="hover:bg-[rgba(55,53,47,0.06)]"
          >
            {sidebarCollapsed ? (
              <ChevronRight style={{ width: "14px", height: "14px" }} />
            ) : (
              <ChevronLeft style={{ width: "14px", height: "14px" }} />
            )}
          </button>
        </div>

        <div style={{ padding: sidebarCollapsed ? "0 8px 8px" : "0 8px 8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              gap: "8px",
              padding: "4px 8px",
              borderRadius: "3px",
            }}
            title={sidebarCollapsed ? userName : undefined}
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
                <span style={{ color: "white", fontSize: "10px", fontWeight: 600 }}>
                  {initials}
                </span>
              </div>
            )}
            {!sidebarCollapsed && (
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
            )}
          </div>
        </div>

        <div style={{ height: "1px", background: "rgba(55,53,47,0.09)" }} />

        <MembersNav collapsed={sidebarCollapsed} />

        <div style={{ flex: 1 }} />

        {!sidebarCollapsed && (
          <div
            style={{
              margin: "0 8px 4px",
              padding: "8px 10px",
              borderRadius: "6px",
              background:
                credits === 0
                  ? "rgba(239,68,68,0.08)"
                  : credits <= 5
                    ? "rgba(245,158,11,0.08)"
                    : "rgba(55,53,47,0.04)",
              border: `1px solid ${
                credits === 0
                  ? "rgba(239,68,68,0.2)"
                  : credits <= 5
                    ? "rgba(245,158,11,0.2)"
                    : "rgba(55,53,47,0.09)"
              }`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <Coins
                style={{
                  width: "13px",
                  height: "13px",
                  flexShrink: 0,
                  color: credits === 0 ? "#ef4444" : credits <= 5 ? "#f59e0b" : "#37352F",
                }}
              />
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: credits === 0 ? "#ef4444" : credits <= 5 ? "#d97706" : "#37352F",
                }}
              >
                {credits} credit{credits !== 1 ? "s" : ""} remaining
              </span>
            </div>
            <div
              style={{
                height: "4px",
                borderRadius: "2px",
                background: "rgba(55,53,47,0.1)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: "2px",
                  width: `${Math.min(100, (credits / 25) * 100)}%`,
                  background:
                    credits === 0 ? "#ef4444" : credits <= 5 ? "#f59e0b" : "rgb(35,131,226)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            {credits === 0 && (
              <p style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>
                Contact support to top up.
              </p>
            )}
          </div>
        )}

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
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              gap: "6px",
              padding: "4px 8px",
              borderRadius: "3px",
              fontSize: "14px",
              color: "rgba(55,53,47,0.65)",
              textDecoration: "none",
            }}
            className="hover:bg-[rgba(55,53,47,0.06)]"
            title={sidebarCollapsed ? "Admin panel" : undefined}
          >
            <Settings2 style={{ width: "14px", height: "14px", flexShrink: 0 }} />
            {!sidebarCollapsed && "Admin panel"}
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
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
              title={sidebarCollapsed ? "Sign out" : undefined}
            >
              <LogOut style={{ width: "14px", height: "14px", flexShrink: 0 }} />
              {!sidebarCollapsed && "Sign out"}
            </button>
          </form>
        </div>
      </aside>

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
