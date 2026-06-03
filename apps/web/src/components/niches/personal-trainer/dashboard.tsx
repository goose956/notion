"use client";
import { N_FG, N_MUTED, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, asText } from "./utils";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";

export function PTDashboard({
  databases,
  criteria,
}: {
  databases: WorkspaceDatabase[];
  criteria:  Record<string, unknown> | null;
}) {
  const clientsDb  = databases.find((d) => d.nicheId === "personal-trainer" && d.dbId === "clients")  ?? null;
  const docsDb     = databases.find((d) => d.nicheId === "personal-trainer" && d.dbId === "documents") ?? null;

  const clients    = clientsDb?.rows ?? [];
  const allDocs    = docsDb?.rows    ?? [];
  const programmes = allDocs.filter((r) => asText(r.properties["Type"]) === "Training Programme");
  const checkins   = allDocs.filter((r) => asText(r.properties["Type"]) === "Client Check-In");
  const nutrition  = allDocs.filter((r) => asText(r.properties["Type"]) === "Nutrition Guide");

  const businessName = String(criteria?.["business-name"] ?? "").trim();
  const speciality   = String(criteria?.["speciality"]    ?? "").trim();
  const setting      = String(criteria?.["setting"]       ?? "").trim();

  const stats = [
    { label: "Clients",           value: clients.length,    color: ACCENT },
    { label: "Programmes",        value: programmes.length, color: "#2563eb" },
    { label: "Check-Ins",         value: checkins.length,   color: "#7c3aed" },
    { label: "Nutrition Guides",  value: nutrition.length,  color: "#ea580c" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>
          {businessName ? `${businessName}` : "PT Business Hub"}
        </h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
          {speciality && setting ? `${speciality} · ${setting}` : "Your AI-powered personal training workspace."}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {stats.map((s) => (
          <div key={s.label} style={{ padding: "16px", borderRadius: "10px", border: `1px solid ${N_BORDER_MED}`, background: "white", textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: "26px", fontWeight: 800, color: s.color }}>{s.value}</p>
            <p style={{ margin: 0, fontSize: "12px", color: N_MUTED }}>{s.label}</p>
          </div>
        ))}
      </div>

      {allDocs.length === 0 && clients.length === 0 && (
        <div style={{ padding: "20px", borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT }}>
          <p style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>Get started in 3 steps</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { n: "1", label: "Add your clients",       desc: "Use the Clients database to log each client's goal, level and equipment." },
              { n: "2", label: "Programme Builder",      desc: "Enter a client's details and the AI generates a complete 4-week training programme." },
              { n: "3", label: "Client Check-In",        desc: "Write professional progress updates and check-in emails with one click." },
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

      {clients.length > 0 && (
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER_MED}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Your Clients</p>
          </div>
          {clients.slice(0, 8).map((row) => {
            const name  = asText(row.properties["Title"]);
            const goal  = asText(row.properties["Goal"]);
            const level = asText(row.properties["Level"]);
            const goalColors: Record<string, string> = {
              "Weight Loss": "#16a34a", "Muscle Building": "#2563eb", "Athletic Performance": "#7c3aed",
              "General Fitness": "#0891b2", "Rehabilitation": "#ea580c", "Endurance": "#d97706", "Flexibility & Mobility": "#db2777",
            };
            const color = goalColors[goal] ?? ACCENT;
            return (
              <div key={row.pageId} style={{ padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ flexShrink: 0, width: "30px", height: "30px", borderRadius: "50%", background: `${color}18`, color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700 }}>
                  {(name || "?")[0]?.toUpperCase()}
                </span>
                <span style={{ flex: 1, fontSize: "13px", color: N_FG, fontWeight: 500 }}>{name || "Unnamed Client"}</span>
                {goal  && <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", background: `${color}15`, color, border: `1px solid ${color}25` }}>{goal}</span>}
                {level && <span style={{ fontSize: "11px", color: N_MUTED }}>{level}</span>}
              </div>
            );
          })}
        </div>
      )}

      {allDocs.length > 0 && (
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER_MED}` }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>Recent Documents</p>
          </div>
          {allDocs.slice(0, 5).map((row) => {
            const type   = asText(row.properties["Type"]);
            const title  = asText(row.properties["Title"]);
            const client = asText(row.properties["Client"]);
            const typeColors: Record<string, string> = { "Training Programme": "#16a34a", "Client Check-In": "#2563eb", "Nutrition Guide": "#ea580c" };
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
