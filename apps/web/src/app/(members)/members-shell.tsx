"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Coins, LogOut, Menu, MessageCircle, User, X } from "lucide-react";
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
  supportUnread?: number;
  activeWorkflows?: string[];
};

export function MembersShell({
  children,
  userName,
  userImage,
  initials,
  credits,
  signOutAction,
  supportUnread = 0,
  activeWorkflows = [],
}: MembersShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 960;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileNavOpen(false);
      }
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        fontFamily: N_FONT,
        position: "relative",
      }}
    >
      {isMobile && mobileNavOpen && (
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close members sidebar"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            border: "none",
            zIndex: 29,
            cursor: "pointer",
          }}
        />
      )}

      <aside
        style={{
          width: isMobile ? "260px" : sidebarCollapsed ? "56px" : "240px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "#F7F6F3",
          borderRight: "1px solid rgba(55,53,47,0.09)",
          transition: isMobile ? "transform 0.2s ease" : "width 0.18s ease",
          overflow: "hidden",
          position: isMobile ? "fixed" : "relative",
          inset: isMobile ? "0 auto 0 0" : "auto",
          zIndex: 30,
          transform: isMobile ? (mobileNavOpen ? "translateX(0)" : "translateX(-100%)") : "none",
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
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/s-logo.png" alt="Stridivo" style={{ height: "22px", width: "auto" }} />
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
              Stridivo.com
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              if (isMobile) {
                setMobileNavOpen(false);
                return;
              }
              setSidebarCollapsed((prev) => !prev);
            }}
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
            {isMobile ? (
              <X style={{ width: "14px", height: "14px" }} />
            ) : sidebarCollapsed ? (
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

        <MembersNav collapsed={sidebarCollapsed} supportUnread={supportUnread} activeWorkflows={activeWorkflows} />

        <div style={{ flex: 1 }} />

        <div
          style={{
            borderTop: "1px solid rgba(55,53,47,0.09)",
            padding: "4px 8px",
          }}
        >
          {!sidebarCollapsed && (
            <div
              style={{
                margin: "4px 0 4px",
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
                <Link
                  href={"/members/credits" as never}
                  style={{
                    marginTop: "6px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#991b1b",
                    textDecoration: "none",
                    borderRadius: "4px",
                    padding: "5px 8px",
                    border: "1px solid rgba(239,68,68,0.35)",
                    background: "rgba(239,68,68,0.12)",
                  }}
                >
                  Top up credits now
                </Link>
              )}
              {credits > 0 && credits <= 5 && (
                <Link
                  href={"/members/credits" as never}
                  style={{
                    marginTop: "6px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#92400e",
                    textDecoration: "none",
                    borderRadius: "4px",
                    padding: "5px 8px",
                    border: "1px solid rgba(245,158,11,0.35)",
                    background: "rgba(245,158,11,0.12)",
                  }}
                >
                  Refill before you run out
                </Link>
              )}
            </div>
          )}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            padding: "6px",
            borderRadius: "6px",
            background: "rgba(55,53,47,0.04)",
            border: "1px solid rgba(55,53,47,0.07)",
          }}>
            <Link
              href={"/members/credits" as never}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
                gap: "6px",
                padding: "5px 8px",
                borderRadius: "4px",
                fontSize: "13px",
                color: "rgba(55,53,47,0.7)",
                textDecoration: "none",
                background: "rgba(234,196,88,0.12)",
              }}
              className="hover:bg-[rgba(234,196,88,0.2)]"
              title={sidebarCollapsed ? "Credits" : undefined}
            >
              <Coins style={{ width: "13px", height: "13px", flexShrink: 0, color: "#b45309" }} />
              {!sidebarCollapsed && "Credits"}
            </Link>
            <Link
              href={"/members/support" as never}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
                gap: "6px",
                padding: "5px 8px",
                borderRadius: "4px",
                fontSize: "13px",
                color: "rgba(55,53,47,0.7)",
                textDecoration: "none",
                position: "relative",
                background: "rgba(35,131,226,0.08)",
              }}
              className="hover:bg-[rgba(35,131,226,0.14)]"
              title={sidebarCollapsed ? "Support" : undefined}
            >
              <MessageCircle style={{ width: "13px", height: "13px", flexShrink: 0, color: "rgb(35,131,226)" }} />
              {!sidebarCollapsed && "Support"}
              {supportUnread > 0 && (
                <span
                  style={{
                    display: "inline-block",
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "rgb(235,87,87)",
                    flexShrink: 0,
                    ...(sidebarCollapsed
                      ? { position: "absolute", top: "4px", right: "4px" }
                      : {}),
                  }}
                />
              )}
            </Link>
            <Link
              href={"/members/profile" as never}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
                gap: "6px",
                padding: "5px 8px",
                borderRadius: "4px",
                fontSize: "13px",
                color: "rgba(55,53,47,0.7)",
                textDecoration: "none",
                background: "rgba(55,53,47,0.05)",
              }}
              className="hover:bg-[rgba(55,53,47,0.1)]"
              title={sidebarCollapsed ? "Profile" : undefined}
            >
              <User style={{ width: "13px", height: "13px", flexShrink: 0 }} />
              {!sidebarCollapsed && "Profile"}
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  gap: "6px",
                  padding: "5px 8px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  color: "rgba(185,28,28,0.8)",
                  background: "rgba(239,68,68,0.07)",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                  fontFamily: N_FONT,
                }}
                className="hover:bg-[rgba(239,68,68,0.13)]"
                title={sidebarCollapsed ? "Sign out" : undefined}
              >
                <LogOut style={{ width: "13px", height: "13px", flexShrink: 0 }} />
                {!sidebarCollapsed && "Sign out"}
              </button>
            </form>
          </div>
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
        {isMobile && (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(6px)",
              borderBottom: "1px solid rgba(55,53,47,0.09)",
            }}
          >
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "6px",
                border: "1px solid rgba(55,53,47,0.15)",
                background: "white",
                color: "#37352F",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label="Open members sidebar"
            >
              <Menu style={{ width: "16px", height: "16px" }} />
            </button>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#37352F" }}>
              Stridivo.com
            </span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(55,53,47,0.65)" }}>
              {credits} credits
            </span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
