"use client";
import { useState, useEffect, useRef } from "react";
import { Palette } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { asText } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const DASHBOARD_THEMES = [
  { name: "Terminal", gradient: "linear-gradient(135deg,#0a0a0a 0%,#14532d 60%,#84cc16 100%)", shadow: "rgba(132,204,22,0.30)", emoji: "💻" },
  { name: "Sunset",   gradient: "linear-gradient(135deg,#7c2d12 0%,#ea580c 55%,#fbbf24 100%)", shadow: "rgba(234,88,12,0.35)",   emoji: "🌇" },
  { name: "Neon",     gradient: "linear-gradient(135deg,#1e1b4b 0%,#7c3aed 55%,#ec4899 100%)", shadow: "rgba(124,58,237,0.35)", emoji: "🚀" },
  { name: "Ocean",    gradient: "linear-gradient(135deg,#0c4a6e 0%,#0284c7 55%,#38bdf8 100%)", shadow: "rgba(2,132,199,0.35)",  emoji: "🌊" },
  { name: "Void",     gradient: "linear-gradient(135deg,#020617 0%,#1e1b4b 55%,#4f46e5 100%)", shadow: "rgba(79,70,229,0.35)",  emoji: "🌌" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  Raw: "#6b7280", Validated: "#2563eb", Building: "#d97706", Shipped: "#16a34a", Parked: "#9ca3af",
};
const STATUS_EMOJI: Record<string, string> = {
  Raw: "💡", Validated: "✅", Building: "🔨", Shipped: "🚀", Parked: "💤",
};

export function VibeCoderDashboard({
  databases,
  criteria,
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
}) {
  const saved = typeof window !== "undefined" ? (localStorage.getItem("vibeCoderDashboardTheme") ?? "0") : "0";
  const [themeIdx,   setThemeIdx]   = useState(() => Math.min(parseInt(saved, 10) || 0, DASHBOARD_THEMES.length - 1));
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem("vibeCoderDashboardTheme", String(themeIdx)); }, [themeIdx]);
  useEffect(() => {
    function close(e: MouseEvent) { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const theme = DASHBOARD_THEMES[themeIdx]!;

  const yourName     = String(criteria?.["your-name"]     ?? "").trim();
  const tool         = String(criteria?.["building-with"] ?? "").trim();
  const niche        = String(criteria?.["niche"]         ?? "").trim();
  const stage        = String(criteria?.["stage"]         ?? "").trim();

  const ideasDb     = databases.find((d) => d.nicheId === "vibe-coder" && d.dbId === "ideas")     ?? null;
  const documentsDb = databases.find((d) => d.nicheId === "vibe-coder" && d.dbId === "documents") ?? null;

  const ideas: WorkspaceRow[]     = ideasDb?.rows     ?? [];
  const documents: WorkspaceRow[] = documentsDb?.rows ?? [];

  const totalIdeas = ideas.length;
  const building   = ideas.filter((r) => asText(r.properties["Status"]) === "Building").length;
  const shipped    = ideas.filter((r) => asText(r.properties["Status"]) === "Shipped").length;
  const validated  = ideas.filter((r) => asText(r.properties["Status"]) === "Validated").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>
      {/* Hero */}
      <div style={{ position: "relative", borderRadius: "16px", background: theme.gradient, boxShadow: `0 8px 32px ${theme.shadow}`, padding: "22px 26px 20px", color: "white", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "12px", right: "14px" }} ref={pickerRef}>
          <button onClick={() => setPickerOpen((x) => !x)} style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px", padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", color: "white" }}>
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
        <h1 style={{ margin: "0 0 2px", fontSize: "20px", fontWeight: 800, textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
          {yourName ? `${yourName}'s Build Space` : "Vibe Coder OS"}
        </h1>
        {(tool || niche || stage) && (
          <p style={{ margin: "0 0 16px", fontSize: "13px", opacity: 0.85 }}>
            {[tool, niche, stage].filter(Boolean).join(" · ")}
          </p>
        )}

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {[
            { label: "Ideas",     value: totalIdeas },
            { label: "Validated", value: validated },
            { label: "Building",  value: building },
            { label: "Shipped",   value: shipped },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)", borderRadius: "10px", padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: 800 }}>{value}</div>
              <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "1px" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Idea Bank */}
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG }}>Idea Bank</span>
            <span style={{ fontSize: "11px", color: N_MUTED }}>{totalIdeas} ideas</span>
          </div>
          {ideas.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>No ideas yet — add them to the Idea Bank database or use the Idea Scorer.</p>
            </div>
          ) : (
            <div>
              {ideas.slice(0, 7).map((row) => {
                const title  = asText(row.properties["Title"])  || "Untitled";
                const status = asText(row.properties["Status"]) || "Raw";
                const color  = STATUS_COLORS[status]  ?? "#6b7280";
                const emoji  = STATUS_EMOJI[status]   ?? "💡";
                return (
                  <div key={row.pageId} style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <span style={{ fontSize: "14px" }}>{emoji}</span>
                    <span style={{ flex: 1, fontSize: "13px", fontWeight: 500, color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
                    <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", background: `${color}15`, color, border: `1px solid ${color}25` }}>{status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Documents */}
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG }}>Recent Documents</span>
            <span style={{ fontSize: "11px", color: N_MUTED }}>{documents.length} saved</span>
          </div>
          {documents.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Score an idea, plan a project or generate launch copy to see documents here.</p>
            </div>
          ) : (
            <div>
              {documents.slice(0, 7).map((row) => {
                const title   = asText(row.properties["Title"])   || "Untitled";
                const type    = asText(row.properties["Type"])    || "";
                const project = asText(row.properties["Project"]) || "";
                return (
                  <div key={row.pageId} style={{ padding: "8px 16px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
                    <div style={{ fontSize: "11px", color: N_MUTED }}>{[type, project].filter(Boolean).join(" · ")}</div>
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
