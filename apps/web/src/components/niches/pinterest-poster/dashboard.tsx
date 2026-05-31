"use client";
import { useMemo } from "react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";

const ACCENT = "#e60023";

function asText(v: unknown): string { return v == null ? "" : String(v); }

export function PinterestDashboard({
  pinHistoryDb,
  criteria,
}: {
  pinHistoryDb: WorkspaceDatabase | null;
  criteria: Record<string, unknown> | null;
}) {
  const pins = pinHistoryDb?.rows ?? [];

  const stats = useMemo(() => {
    const total = pins.length;
    const posted = pins.filter((p) => asText(p.properties["Status"]) === "Posted").length;
    const thisWeek = pins.filter((p) => {
      const d = asText(p.properties["Date"]);
      if (!d) return false;
      const date = new Date(d);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }).length;
    const thisMonth = pins.filter((p) => {
      const d = asText(p.properties["Date"]);
      if (!d) return false;
      const date = new Date(d);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    return { total, posted, thisWeek, thisMonth };
  }, [pins]);

  const recentPins = useMemo(() => {
    return [...pins]
      .sort((a, b) => {
        const da = new Date(asText(a.properties["Date"]) || 0).getTime();
        const db = new Date(asText(b.properties["Date"]) || 0).getTime();
        return db - da;
      })
      .slice(0, 8);
  }, [pins]);

  const weeklyGoal = parseInt(asText(criteria?.["posting-goal"]) || "10", 10) || 10;
  const weeklyPct = Math.min(100, Math.round((stats.thisWeek / weeklyGoal) * 100));

  return (
    <div style={{ maxWidth: "860px", fontFamily: N_FONT }}>
      {/* Header */}
      <div style={{
        borderRadius: "14px",
        background: "linear-gradient(135deg, #6f0110 0%, #ad081b 45%, #e60023 75%, #ff4060 100%)",
        padding: "22px 28px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 8px 28px rgba(230,0,35,0.25)",
      }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
            📌 Pinterest Poster
          </p>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "white" }}>
            {criteria?.["board-name"] ? String(criteria["board-name"]) : "Your Pins"}
          </h1>
          {!!criteria?.["topics"] && (
            <p style={{ margin: "6px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
              {String(criteria["topics"])}
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <span style={{ fontSize: "36px", fontWeight: 800, color: "white", lineHeight: 1 }}>{stats.total}</span>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>total pins</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "24px" }}>
        {[
          { label: "Total Pins",    value: stats.total,     color: ACCENT },
          { label: "Posted",        value: stats.posted,    color: "#16a34a" },
          { label: "This Week",     value: stats.thisWeek,  color: "#2563eb" },
          { label: "This Month",    value: stats.thisMonth, color: "#7c3aed" },
        ].map((s) => (
          <div key={s.label} style={{ borderRadius: "10px", border: `1px solid ${N_BORDER}`, background: "white", padding: "14px 16px" }}>
            <p style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: s.color }}>{s.value}</p>
            <p style={{ margin: 0, fontSize: "11px", color: N_SUBTLE, fontWeight: 500 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly goal */}
      <div style={{ borderRadius: "10px", border: `1px solid ${N_BORDER}`, background: "white", padding: "16px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: N_FG }}>Weekly goal</p>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>{stats.thisWeek} / {weeklyGoal} pins</p>
        </div>
        <div style={{ height: "6px", borderRadius: "99px", background: N_BORDER, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${weeklyPct}%`, background: ACCENT, borderRadius: "99px", transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Recent pins */}
      {recentPins.length > 0 && (
        <div>
          <h2 style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700, color: N_FG }}>Recent Pins</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {recentPins.map((pin) => {
              const status = asText(pin.properties["Status"]);
              const statusColor = status === "Posted" ? "#16a34a" : status === "Failed" ? "#dc2626" : "#d97706";
              const statusBg   = status === "Posted" ? "rgba(22,163,74,0.08)" : status === "Failed" ? "rgba(220,38,38,0.08)" : "rgba(217,119,6,0.08)";
              const pinUrl = asText(pin.properties["Pin URL"]);
              return (
                <div key={pin.pageId} style={{ borderRadius: "8px", border: `1px solid ${N_BORDER}`, background: "white", padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px" }}>
                  {asText(pin.properties["Image URL"]) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asText(pin.properties["Image URL"])} alt="" style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {asText(pin.properties["Title"])}
                    </p>
                    <p style={{ margin: 0, fontSize: "11px", color: N_SUBTLE }}>
                      {asText(pin.properties["Topic"])}
                      {asText(pin.properties["Date"]) && ` · ${new Date(asText(pin.properties["Date"])).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", background: statusBg, color: statusColor }}>{status}</span>
                    {pinUrl && (
                      <a href={pinUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", color: ACCENT, textDecoration: "none" }}>View →</a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pins.length === 0 && (
        <div style={{ borderRadius: "10px", border: `1px dashed ${N_BORDER}`, padding: "32px", textAlign: "center" }}>
          <p style={{ fontSize: "32px", margin: "0 0 8px" }}>📌</p>
          <p style={{ fontSize: "14px", color: N_MUTED, margin: "0 0 4px" }}>No pins yet</p>
          <p style={{ fontSize: "12px", color: N_SUBTLE, margin: 0 }}>Head to Create Pin to post your first pin.</p>
        </div>
      )}
    </div>
  );
}
