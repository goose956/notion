"use client";
import { useState, useEffect, useRef } from "react";
import { Palette } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { asText } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const THEMES = [
  { name: "Violet",   gradient: "linear-gradient(135deg,#3b0764 0%,#7c3aed 55%,#c4b5fd 100%)", shadow: "rgba(124,58,237,0.35)",  emoji: "💜" },
  { name: "Sunrise",  gradient: "linear-gradient(135deg,#7c2d12 0%,#ea580c 55%,#fed7aa 100%)", shadow: "rgba(234,88,12,0.30)",   emoji: "🌅" },
  { name: "Ocean",    gradient: "linear-gradient(135deg,#0c4a6e 0%,#0284c7 55%,#7dd3fc 100%)", shadow: "rgba(2,132,199,0.30)",   emoji: "🌊" },
  { name: "Forest",   gradient: "linear-gradient(135deg,#052e16 0%,#16a34a 55%,#86efac 100%)", shadow: "rgba(22,163,74,0.30)",   emoji: "🌿" },
  { name: "Rose",     gradient: "linear-gradient(135deg,#500724 0%,#be185d 55%,#fbcfe8 100%)", shadow: "rgba(190,24,93,0.30)",   emoji: "🌸" },
] as const;

const APPT_COLORS: Record<string, string> = {
  "SALT": "#2563eb", "OT": "#16a34a", "CAMHS": "#7c3aed",
  "School": "#d97706", "GP / Paed": "#ea580c", "Tribunal": "#dc2626", "Other": "#6b7280",
};

export function SENDDashboard({
  databases,
  criteria,
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
}) {
  const saved = typeof window !== "undefined" ? (localStorage.getItem("sendDashboardTheme") ?? "0") : "0";
  const [themeIdx,   setThemeIdx]   = useState(() => Math.min(parseInt(saved, 10) || 0, THEMES.length - 1));
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem("sendDashboardTheme", String(themeIdx)); }, [themeIdx]);
  useEffect(() => {
    function close(e: MouseEvent) { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const theme       = THEMES[themeIdx]!;
  const childName   = String(criteria?.["child-name"]     ?? "").trim();
  const childAge    = String(criteria?.["child-age"]      ?? "").trim();
  const diagnosis   = String(criteria?.["diagnosis"]      ?? "").trim();
  const focus       = String(criteria?.["current-focus"]  ?? "").trim();

  const apptDb    = databases.find(d => d.nicheId === "send-parent" && d.dbId === "appointments")     ?? null;
  const behavDb   = databases.find(d => d.nicheId === "send-parent" && d.dbId === "behaviour-log")   ?? null;
  const docsDb    = databases.find(d => d.nicheId === "send-parent" && d.dbId === "documents")        ?? null;

  const appointments: WorkspaceRow[] = apptDb?.rows    ?? [];
  const behaviours:   WorkspaceRow[] = behavDb?.rows   ?? [];
  const documents:    WorkspaceRow[] = docsDb?.rows    ?? [];

  const recentAppts  = appointments.slice(0, 5);
  const recentBehavs = behaviours.slice(0, 4);

  const highIntensity = behaviours.filter(r => asText(r.properties["Intensity"]) === "High").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT }}>
      {/* Hero */}
      <div style={{ position: "relative", borderRadius: "16px", background: theme.gradient, boxShadow: `0 8px 32px ${theme.shadow}`, padding: "28px 28px 24px", color: "white", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "12px", right: "14px" }} ref={pickerRef}>
          <button onClick={() => setPickerOpen(x => !x)} style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px", padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", color: "white" }}>
            <Palette size={13} />
          </button>
          {pickerOpen && (
            <div style={{ position: "absolute", top: "34px", right: 0, background: "white", border: `1px solid ${N_BORDER}`, borderRadius: "10px", padding: "8px", display: "flex", gap: "6px", zIndex: 50, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
              {THEMES.map((t, i) => (
                <button key={t.name} title={t.name} onClick={() => { setThemeIdx(i); setPickerOpen(false); }}
                  style={{ width: "22px", height: "22px", borderRadius: "50%", background: t.gradient, border: i === themeIdx ? "2px solid #111" : "2px solid transparent", cursor: "pointer" }} />
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: "28px", marginBottom: "6px" }}>{theme.emoji}</div>
        <h1 style={{ margin: "0 0 2px", fontSize: "20px", fontWeight: 800, textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
          {childName ? `${childName}'s SEND Hub` : "SEND Parent OS"}
        </h1>
        {(childAge || diagnosis || focus) && (
          <p style={{ margin: "0 0 16px", fontSize: "13px", opacity: 0.85 }}>
            {[childAge ? `Age ${childAge}` : null, diagnosis, focus].filter(Boolean).join(" · ")}
          </p>
        )}

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {[
            { label: "Appointments",   value: appointments.length },
            { label: "Behaviour Logs", value: behaviours.length },
            { label: "Documents",      value: documents.length },
            { label: "High Intensity", value: highIntensity },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)", borderRadius: "10px", padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: 800 }}>{value}</div>
              <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "1px" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Recent appointments */}
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG }}>Recent Appointments</span>
            <span style={{ fontSize: "11px", color: N_MUTED }}>{appointments.length} logged</span>
          </div>
          {recentAppts.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>No appointments logged yet. Use Appointment Manager to add one.</p>
            </div>
          ) : (
            <div>
              {recentAppts.map(row => {
                const title = asText(row.properties["Title"])        || "Untitled";
                const type  = asText(row.properties["Type"])         || "";
                const prof  = asText(row.properties["Professional"]) || "";
                const color = APPT_COLORS[type] ?? "#6b7280";
                return (
                  <div key={row.pageId} style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    {type && <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px", background: `${color}15`, color, border: `1px solid ${color}25` }}>{type}</span>}
                    <span style={{ flex: 1, fontSize: "13px", fontWeight: 500, color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
                    {prof && <span style={{ flexShrink: 0, fontSize: "11px", color: N_MUTED }}>{prof}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent behaviour logs */}
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG }}>Recent Behaviour Logs</span>
            <span style={{ fontSize: "11px", color: N_MUTED }}>{behaviours.length} logged</span>
          </div>
          {recentBehavs.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>No behaviour logs yet. Use the Behaviour Log tab to start tracking.</p>
            </div>
          ) : (
            <div>
              {recentBehavs.map(row => {
                const title     = asText(row.properties["Title"])    || "Untitled";
                const intensity = asText(row.properties["Intensity"]) || "";
                const location  = asText(row.properties["Location"]) || "";
                const intensityColor = intensity === "High" ? "#dc2626" : intensity === "Medium" ? "#d97706" : "#16a34a";
                return (
                  <div key={row.pageId} style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    {intensity && <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px", background: `${intensityColor}15`, color: intensityColor, border: `1px solid ${intensityColor}25` }}>{intensity}</span>}
                    <span style={{ flex: 1, fontSize: "13px", fontWeight: 500, color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
                    {location && <span style={{ flexShrink: 0, fontSize: "11px", color: N_MUTED }}>{location}</span>}
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
