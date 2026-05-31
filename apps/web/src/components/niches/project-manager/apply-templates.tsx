"use client";
import { useState } from "react";
import { Loader2, CheckSquare, Square } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const ACCENT = "#4f46e5";

function asText(v: unknown): string { return v == null ? "" : String(v); }

const CATEGORY_ORDER = ["Marketing", "Launch", "Development", "Research", "Admin", "Content"];
const CATEGORY_COLORS: Record<string, { icon: string; color: string; bg: string }> = {
  Marketing:   { icon: "📣", color: "#db2777", bg: "rgba(219,39,119,0.08)" },
  Launch:      { icon: "🚀", color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
  Development: { icon: "💻", color: "#2563eb", bg: "rgba(37,99,235,0.08)" },
  Research:    { icon: "🔍", color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  Admin:       { icon: "📁", color: "#6b7280", bg: "rgba(107,114,128,0.08)" },
  Content:     { icon: "✍️", color: "#d97706", bg: "rgba(217,119,6,0.08)" },
};

export function PMApplyTemplates({
  projectsDb,
  templatesDb,
  tasksDb,
  onRowAdded,
}: {
  projectsDb: WorkspaceDatabase | null;
  templatesDb: WorkspaceDatabase | null;
  tasksDb: WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const projects   = projectsDb?.rows ?? [];
  const templates  = templatesDb?.rows ?? [];

  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Group templates by category
  const grouped = CATEGORY_ORDER.reduce<Record<string, typeof templates>>((acc, cat) => {
    const items = templates.filter((t) => asText(t.properties["Category"]) === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});
  // Any uncategorised templates
  const uncategorised = templates.filter((t) => !CATEGORY_ORDER.includes(asText(t.properties["Category"])));
  if (uncategorised.length > 0) grouped["Other"] = uncategorised;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleCategory(cat: string) {
    const catIds = (grouped[cat] ?? []).map((t) => t.pageId);
    const allSelected = catIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      catIds.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  }

  function selectAll() { setSelected(new Set(templates.map((t) => t.pageId))); }
  function clearAll()  { setSelected(new Set()); }

  async function applyTemplates() {
    if (!selectedProject || selected.size === 0 || !tasksDb) return;
    setApplying(true);
    setResult(null);
    let added = 0;
    try {
      for (const templateId of selected) {
        const template = templates.find((t) => t.pageId === templateId);
        if (!template) continue;
        const res = await fetch("/api/members/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId: tasksDb.notionId,
            properties: {
              "Task":     asText(template.properties["Template Name"]),
              "Project":  selectedProject,
              "Status":   "To Do",
              "Priority": asText(template.properties["Priority"]) || "Medium",
              "Type":     asText(template.properties["Category"]) || "Other",
              "Notes":    asText(template.properties["Description"]),
            },
            propertyTypes: {
              "Task": "title", "Project": "rich_text", "Status": "select",
              "Priority": "select", "Type": "select", "Notes": "rich_text",
            },
          }),
        });
        if (res.ok) {
          const data = await res.json() as { pageId?: string };
          if (data.pageId) {
            onRowAdded(tasksDb.notionId, {
              pageId: data.pageId,
              properties: {
                "Task":     asText(template.properties["Template Name"]),
                "Project":  selectedProject,
                "Status":   "To Do",
                "Priority": asText(template.properties["Priority"]) || "Medium",
                "Type":     asText(template.properties["Category"]) || "Other",
                "Notes":    asText(template.properties["Description"]),
              },
            });
            added++;
          }
        }
      }
      setResult(`✓ Added ${added} task${added !== 1 ? "s" : ""} to "${selectedProject}"`);
      setSelected(new Set());
    } catch {
      setResult("Something went wrong — please try again.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div style={{ maxWidth: "720px", fontFamily: N_FONT }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800, color: N_FG }}>Apply Templates</h1>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          Pick a project, tick the tasks you need, and they'll all be added in one click.
        </p>
      </div>

      {/* Project selector */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: N_FG, marginBottom: "6px" }}>
          1. Choose a project
        </label>
        {projects.length === 0 ? (
          <p style={{ fontSize: "13px", color: N_MUTED }}>No projects yet. Add one in the Projects database first.</p>
        ) : (
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            style={{ width: "100%", maxWidth: "360px", padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "14px", color: N_FG, fontFamily: N_FONT, background: "white" }}
          >
            <option value="">— Select a project —</option>
            {projects.map((p) => (
              <option key={p.pageId} value={asText(p.properties["Name"])}>{asText(p.properties["Name"])}</option>
            ))}
          </select>
        )}
      </div>

      {/* Template list */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: N_FG }}>2. Select templates ({selected.size} selected)</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={selectAll} style={{ fontSize: "11px", color: ACCENT, background: "none", border: "none", cursor: "pointer", fontFamily: N_FONT }}>Select all</button>
            <button onClick={clearAll}  style={{ fontSize: "11px", color: N_SUBTLE, background: "none", border: "none", cursor: "pointer", fontFamily: N_FONT }}>Clear</button>
          </div>
        </div>

        {templates.length === 0 ? (
          <p style={{ fontSize: "13px", color: N_MUTED }}>No templates found. Task templates should have been created automatically — try refreshing the page.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {Object.entries(grouped).map(([cat, items]) => {
              const catInfo = CATEGORY_COLORS[cat] ?? { icon: "📌", color: ACCENT, bg: "rgba(79,70,229,0.06)" };
              const allSelected = items.every((t) => selected.has(t.pageId));
              return (
                <div key={cat} style={{ borderRadius: "8px", border: `1px solid ${N_BORDER}`, overflow: "hidden" }}>
                  <button
                    onClick={() => toggleCategory(cat)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: "8px",
                      padding: "9px 12px", background: catInfo.bg, border: "none",
                      cursor: "pointer", fontFamily: N_FONT, textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: "14px" }}>{catInfo.icon}</span>
                    <span style={{ flex: 1, fontSize: "12px", fontWeight: 700, color: catInfo.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{cat}</span>
                    <span style={{ fontSize: "11px", color: catInfo.color, opacity: 0.7 }}>{allSelected ? "deselect all" : "select all"}</span>
                  </button>
                  <div>
                    {items.map((t) => {
                      const isSelected = selected.has(t.pageId);
                      return (
                        <button
                          key={t.pageId}
                          onClick={() => toggle(t.pageId)}
                          style={{
                            width: "100%", display: "flex", alignItems: "flex-start", gap: "10px",
                            padding: "9px 14px", background: isSelected ? "rgba(79,70,229,0.04)" : "white",
                            border: "none", borderTop: `1px solid ${N_BORDER}`,
                            cursor: "pointer", fontFamily: N_FONT, textAlign: "left",
                          }}
                        >
                          {isSelected
                            ? <CheckSquare size={15} style={{ color: ACCENT, flexShrink: 0, marginTop: "1px" }} />
                            : <Square size={15} style={{ color: N_SUBTLE, flexShrink: 0, marginTop: "1px" }} />
                          }
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: "0 0 1px", fontSize: "13px", fontWeight: isSelected ? 600 : 400, color: N_FG }}>{asText(t.properties["Template Name"])}</p>
                            {asText(t.properties["Description"]) && (
                              <p style={{ margin: 0, fontSize: "11px", color: N_MUTED, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {asText(t.properties["Description"])}
                              </p>
                            )}
                          </div>
                          <span style={{
                            fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "99px", flexShrink: 0,
                            background: asText(t.properties["Priority"]) === "High" ? "rgba(239,68,68,0.1)" : asText(t.properties["Priority"]) === "Low" ? "rgba(59,130,246,0.1)" : "rgba(245,158,11,0.1)",
                            color: asText(t.properties["Priority"]) === "High" ? "#dc2626" : asText(t.properties["Priority"]) === "Low" ? "#2563eb" : "#d97706",
                          }}>{asText(t.properties["Priority"]) || "Medium"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Apply button */}
      {result && (
        <div style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "6px", background: result.startsWith("✓") ? "rgba(22,163,74,0.07)" : "rgba(220,38,38,0.07)", border: `1px solid ${result.startsWith("✓") ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`, fontSize: "13px", color: result.startsWith("✓") ? "#15803d" : "#b91c1c" }}>
          {result}
        </div>
      )}
      <button
        onClick={() => void applyTemplates()}
        disabled={!selectedProject || selected.size === 0 || applying || !tasksDb}
        style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "10px 24px", borderRadius: "6px", border: "none",
          background: (!selectedProject || selected.size === 0 || applying) ? "rgba(55,53,47,0.12)" : ACCENT,
          color: (!selectedProject || selected.size === 0 || applying) ? N_MUTED : "white",
          fontSize: "14px", fontWeight: 600, cursor: (!selectedProject || selected.size === 0 || applying) ? "default" : "pointer",
          fontFamily: N_FONT,
        }}
      >
        {applying ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Adding tasks…</> : `Add ${selected.size} task${selected.size !== 1 ? "s" : ""} to project`}
      </button>
    </div>
  );
}
