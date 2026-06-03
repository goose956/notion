"use client";
import { useState } from "react";
import { Palette } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, asText } from "./utils";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";

const DASHBOARD_THEMES = [
  {
    id: "slate",
    label: "Slate",
    emoji: "🔷",
    gradient: "linear-gradient(135deg, #0f0c29 0%, #1e1b4b 42%, #3730a3 72%, #6366f1 100%)",
    shadow: "rgba(55,48,163,0.32)",
  },
  {
    id: "amber",
    label: "Amber",
    emoji: "✨",
    gradient: "linear-gradient(135deg, #1a0e00 0%, #78350f 42%, #d97706 72%, #fbbf24 100%)",
    shadow: "rgba(120,53,15,0.32)",
  },
  {
    id: "teal",
    label: "Teal",
    emoji: "🌊",
    gradient: "linear-gradient(135deg, #011a1a 0%, #134e4a 42%, #0d9488 72%, #2dd4bf 100%)",
    shadow: "rgba(13,148,136,0.30)",
  },
  {
    id: "charcoal",
    label: "Charcoal",
    emoji: "🖤",
    gradient: "linear-gradient(135deg, #050505 0%, #111827 42%, #1f2937 72%, #4b5563 100%)",
    shadow: "rgba(17,24,39,0.45)",
  },
  {
    id: "violet",
    label: "Violet",
    emoji: "💜",
    gradient: "linear-gradient(135deg, #160820 0%, #4a1272 42%, #7c3aed 72%, #c084fc 100%)",
    shadow: "rgba(124,58,237,0.32)",
  },
] as const;
type ThemeId = (typeof DASHBOARD_THEMES)[number]["id"];

export function FreelancerDashboard({
  databases,
  criteria,
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
}) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "slate";
    return (localStorage.getItem("freelancerDashboardTheme") as ThemeId | null) ?? "slate";
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const theme = DASHBOARD_THEMES.find((t) => t.id === themeId) ?? DASHBOARD_THEMES[0]!;

  function selectTheme(id: ThemeId) {
    setThemeId(id);
    localStorage.setItem("freelancerDashboardTheme", id);
    setShowThemePicker(false);
  }

  const clientsDb  = databases.find((d) => d.nicheId === "freelancer" && d.dbId === "clients")  ?? null;
  const projectsDb = databases.find((d) => d.nicheId === "freelancer" && d.dbId === "projects") ?? null;
  const docsDb     = databases.find((d) => d.nicheId === "freelancer" && d.dbId === "documents") ?? null;

  const clients      = clientsDb?.rows  ?? [];
  const projects     = projectsDb?.rows ?? [];
  const allDocs      = docsDb?.rows     ?? [];
  const activeClients  = clients.filter((r)  => asText(r.properties["Status"]) === "Active");
  const activeProjects = projects.filter((r) => asText(r.properties["Status"]) === "Active");
  const proposals      = allDocs.filter((r)  => asText(r.properties["Type"]) === "Proposal");
  const totalValue     = projects.reduce((sum, r) => {
    const v = r.properties["Value"];
    const n = typeof v === "number" ? v : (v && typeof v === "object" && "number" in (v as object) ? (v as { number: number }).number : 0);
    return sum + (n || 0);
  }, 0);

  const yourName   = String(criteria?.["your-name"] ?? "").trim();
  const service    = String(criteria?.["service"]   ?? "").trim();
  const rateType   = String(criteria?.["rate-type"] ?? "").trim();
  const country    = String(criteria?.["country"]   ?? "").trim();
  const currency   = country.toLowerCase().includes("united states") ? "$" : country.toLowerCase().includes("australia") || country.toLowerCase().includes("canada") ? "A$" : "£";

  const stats = [
    { label: "Active Clients",   value: activeClients.length  },
    { label: "Live Projects",    value: activeProjects.length },
    { label: "Proposals Sent",   value: proposals.length      },
    { label: "Total Project Value", value: totalValue > 0 ? `${currency}${totalValue.toLocaleString()}` : "—" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>

      {/* ── HERO BANNER ─────────────────────────────────────────────────────── */}
      <section style={{ borderRadius: "16px", background: theme.gradient, overflow: "visible", boxShadow: `0 12px 40px ${theme.shadow}, 0 2px 8px rgba(0,0,0,0.12)`, padding: "22px 26px 20px", display: "flex", flexDirection: "column", gap: "10px", position: "relative" }}>
        <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
          💼 Freelancer OS
        </p>

        {/* Theme picker */}
        <div style={{ position: "relative" }}>
          <button type="button" onClick={() => setShowThemePicker((s) => !s)} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.12)", cursor: "pointer", fontSize: "11px", color: "rgba(255,255,255,0.85)", fontFamily: N_FONT }}>
            <Palette size={11} /> {theme.emoji} {theme.label}
          </button>
          {showThemePicker && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50, background: "white", borderRadius: "10px", boxShadow: "0 8px 28px rgba(0,0,0,0.18)", padding: "10px 12px", display: "flex", gap: "8px", flexWrap: "wrap", minWidth: "240px", border: "1px solid rgba(0,0,0,0.08)" }}>
              {DASHBOARD_THEMES.map((t) => (
                <button key={t.id} type="button" onClick={() => selectTheme(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "6px 8px", borderRadius: "8px", border: t.id === themeId ? "2px solid #37352F" : "2px solid transparent", background: t.id === themeId ? "rgba(55,53,47,0.07)" : "transparent", cursor: "pointer", fontFamily: N_FONT }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: t.gradient, flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.20)" }} />
                  <span style={{ fontSize: "10px", color: "#37352F", fontWeight: t.id === themeId ? 700 : 400 }}>{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <h2 style={{ margin: 0, fontSize: "28px", fontWeight: 800, color: "white", textShadow: "0 1px 8px rgba(0,0,0,0.30)" }}>
          {yourName ? `${yourName}` : "My Freelance Business"}
        </h2>
        {(service || rateType) && (
          <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
            {[service, rateType].filter(Boolean).join(" · ")}
          </p>
        )}

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
          {stats.map((s) => (
            <div key={s.label} style={{ padding: "5px 14px", borderRadius: "99px", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "white" }}>{s.value}</span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Getting started ──────────────────────────────────────────────────── */}
      {allDocs.length === 0 && clients.length === 0 && (
        <div style={{ padding: "20px", borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT }}>
          <p style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>Get started in 3 steps</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { n: "1", label: "Proposal Writer", desc: "Enter a project brief and AI writes a full professional proposal — ready to send." },
              { n: "2", label: "Invoice Builder",  desc: "Generate a complete invoice with line items, payment terms and your details." },
              { n: "3", label: "Outreach Writer",  desc: "AI writes cold email pitches tailored to a specific prospect and industry." },
            ].map((s) => (
              <div key={s.n} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0, width: "22px", height: "22px", borderRadius: "50%", background: ACCENT, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>{s.n}</span>
                <div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: ACCENT_TEXT }}>{s.label}</span>
                  <span style={{ fontSize: "13px", color: N_MUTED }}> — {s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Active projects ──────────────────────────────────────────────────── */}
      {activeProjects.length > 0 && (
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER_MED}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Active Projects</p>
          </div>
          {activeProjects.slice(0, 6).map((row) => {
            const name   = asText(row.properties["Title"]);
            const client = asText(row.properties["Client"]);
            const val    = row.properties["Value"];
            const num    = typeof val === "number" ? val : (val && typeof val === "object" && "number" in (val as object) ? (val as { number: number }).number : null);
            return (
              <div key={row.pageId} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ flexShrink: 0, width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a" }} />
                <span style={{ flex: 1, fontSize: "13px", color: N_FG, fontWeight: 500 }}>{name || "Untitled Project"}</span>
                {client && <span style={{ fontSize: "11px", color: N_MUTED }}>{client}</span>}
                {num != null && num > 0 && <span style={{ fontSize: "12px", fontWeight: 700, color: ACCENT_TEXT }}>{currency}{num.toLocaleString()}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Recent documents ─────────────────────────────────────────────────── */}
      {allDocs.length > 0 && (
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER_MED}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Recent Documents</p>
          </div>
          {allDocs.slice(0, 5).map((row) => {
            const type   = asText(row.properties["Type"]);
            const title  = asText(row.properties["Title"]);
            const client = asText(row.properties["Client"]);
            const typeColors: Record<string, string> = { Proposal: "#4f46e5", Invoice: "#16a34a", Outreach: "#7c3aed" };
            const color = typeColors[type] ?? ACCENT;
            return (
              <div key={row.pageId} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", background: `${color}18`, color, border: `1px solid ${color}30` }}>{type}</span>
                <span style={{ flex: 1, fontSize: "13px", color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Untitled"}</span>
                {client && <span style={{ fontSize: "11px", color: N_MUTED, flexShrink: 0 }}>{client}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
