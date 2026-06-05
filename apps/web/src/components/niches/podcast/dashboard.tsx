"use client";
import { useState, useEffect, useRef } from "react";
import { Palette } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { asText } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const DASHBOARD_THEMES = [
  { name: "Midnight", gradient: "linear-gradient(135deg,#3b0764 0%,#6d28d9 60%,#a78bfa 100%)", shadow: "rgba(109,40,217,0.35)", emoji: "🎙️" },
  { name: "Studio",   gradient: "linear-gradient(135deg,#0f172a 0%,#1e3a8a 60%,#3b82f6 100%)", shadow: "rgba(30,58,138,0.35)", emoji: "🎚️" },
  { name: "Signal",   gradient: "linear-gradient(135deg,#78350f 0%,#d97706 60%,#fbbf24 100%)", shadow: "rgba(217,119,6,0.35)",  emoji: "📡" },
  { name: "Neon",     gradient: "linear-gradient(135deg,#134e4a 0%,#0d9488 60%,#2dd4bf 100%)", shadow: "rgba(13,148,136,0.35)", emoji: "🎧" },
  { name: "Rose",     gradient: "linear-gradient(135deg,#881337 0%,#e11d48 60%,#fb7185 100%)", shadow: "rgba(225,29,72,0.35)",  emoji: "🌸" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  Planning: "#6d28d9", Recorded: "#2563eb", Editing: "#d97706", Published: "#16a34a",
};

export function PodcastDashboard({
  databases,
  criteria,
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
}) {
  const saved = typeof window !== "undefined" ? (localStorage.getItem("podcastDashboardTheme") ?? "0") : "0";
  const [themeIdx,    setThemeIdx]    = useState(() => Math.min(parseInt(saved, 10) || 0, DASHBOARD_THEMES.length - 1));
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem("podcastDashboardTheme", String(themeIdx)); }, [themeIdx]);
  useEffect(() => {
    function close(e: MouseEvent) { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const theme = DASHBOARD_THEMES[themeIdx]!;

  const podcastName = String(criteria?.["podcast-name"] ?? "").trim();
  const niche       = String(criteria?.["niche"]         ?? "").trim();
  const format      = String(criteria?.["format"]        ?? "").trim();

  const episodesDb  = databases.find((d) => d.nicheId === "podcast" && d.dbId === "episodes")  ?? null;
  const documentsDb = databases.find((d) => d.nicheId === "podcast" && d.dbId === "documents") ?? null;

  const episodes: WorkspaceRow[] = episodesDb?.rows ?? [];
  const documents: WorkspaceRow[] = documentsDb?.rows ?? [];

  const totalEpisodes = episodes.length;
  const published     = episodes.filter((r) => asText(r.properties["Status"]) === "Published").length;
  const inProduction  = episodes.filter((r) => ["Planning", "Recorded", "Editing"].includes(asText(r.properties["Status"]))).length;
  const recentDocs    = documents.slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>
      {/* Hero banner */}
      <div style={{ position: "relative", borderRadius: "16px", background: theme.gradient, boxShadow: `0 8px 32px ${theme.shadow}`, padding: "22px 26px 20px", color: "white", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "12px", right: "14px" }} ref={pickerRef}>
          <button onClick={() => setPickerOpen((x) => !x)} style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px", padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", color: "white" }}>
            <Palette size={13} />
          </button>
          {pickerOpen && (
            <div style={{ position: "absolute", top: "34px", right: 0, background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "10px", padding: "8px", display: "flex", gap: "6px", zIndex: 50, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
              {DASHBOARD_THEMES.map((t, i) => (
                <button key={t.name} title={t.name} onClick={() => { setThemeIdx(i); setPickerOpen(false); }}
                  style={{ width: "22px", height: "22px", borderRadius: "50%", background: t.gradient, border: i === themeIdx ? "2px solid #111" : "2px solid transparent", cursor: "pointer" }} />
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: "28px", marginBottom: "6px" }}>{theme.emoji}</div>
        <h1 style={{ margin: "0 0 2px", fontSize: "20px", fontWeight: 800, textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
          {podcastName || "My Podcast"}
        </h1>
        {(niche || format) && (
          <p style={{ margin: "0 0 16px", fontSize: "13px", opacity: 0.85 }}>
            {[niche, format].filter(Boolean).join(" · ")}
          </p>
        )}

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {[
            { label: "Total Episodes", value: totalEpisodes },
            { label: "Published",      value: published },
            { label: "In Production",  value: inProduction },
            { label: "Documents",      value: documents.length },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)", borderRadius: "10px", padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: 800 }}>{value}</div>
              <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "1px" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Episode tracker */}
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG }}>Episodes</span>
            <span style={{ fontSize: "11px", color: N_MUTED }}>{totalEpisodes} total</span>
          </div>
          {episodes.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>No episodes yet — add them via the Episodes database.</p>
            </div>
          ) : (
            <div>
              {episodes.slice(0, 6).map((row) => {
                const title  = asText(row.properties["Title"])  || "Untitled";
                const guest  = asText(row.properties["Guest"])  || "";
                const num    = asText(row.properties["Number"]) || "";
                const status = asText(row.properties["Status"]) || "Planning";
                const color  = STATUS_COLORS[status] ?? "#6d28d9";
                return (
                  <div key={row.pageId} style={{ padding: "9px 16px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    {num && <span style={{ fontSize: "10px", fontWeight: 700, color: "#6d28d9", minWidth: "28px" }}>#{num}</span>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
                      {guest && <div style={{ fontSize: "11px", color: N_MUTED }}>Guest: {guest}</div>}
                    </div>
                    <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", background: `${color}15`, color, border: `1px solid ${color}25` }}>{status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent documents */}
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG }}>Recent Documents</span>
            <span style={{ fontSize: "11px", color: N_MUTED }}>{documents.length} saved</span>
          </div>
          {recentDocs.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Use the tools to generate and save documents.</p>
            </div>
          ) : (
            <div>
              {recentDocs.map((row) => {
                const title   = asText(row.properties["Title"])   || "Untitled";
                const type    = asText(row.properties["Type"])    || "";
                const episode = asText(row.properties["Episode"]) || "";
                return (
                  <div key={row.pageId} style={{ padding: "9px 16px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
                    <div style={{ fontSize: "11px", color: N_MUTED }}>{[type, episode].filter(Boolean).join(" · ")}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
