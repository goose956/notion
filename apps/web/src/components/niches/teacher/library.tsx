"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

type DocType = "all" | "Lesson Plan" | "Report Comment" | "Assessment";

const TYPE_COLORS: Record<string, string> = {
  "Lesson Plan":    "#2563eb",
  "Report Comment": "#16a34a",
  "Assessment":     "#ea580c",
};

function asText(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map((v) => (typeof v === "object" && v !== null && "plain_text" in v ? String((v as { plain_text: string }).plain_text) : String(v))).join("");
  return String(val);
}

function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] ?? ACCENT;
  return (
    <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", background: `${color}18`, color, border: `1px solid ${color}30`, flexShrink: 0 }}>
      {type}
    </span>
  );
}

function DocRow({ row }: { row: WorkspaceRow }) {
  const [open, setOpen] = useState(false);
  const title   = asText(row.properties["Title"]);
  const type    = asText(row.properties["Type"]);
  const subject = asText(row.properties["Subject"]);
  const yr      = asText(row.properties["Year Group"]);
  const content = asText(row.properties["Content"]);

  function exportPDF() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#1a1a1a;line-height:1.7;}
      h1{font-size:20px;margin-bottom:4px;}
      .meta{font-size:13px;color:#666;margin-bottom:28px;}
      pre{white-space:pre-wrap;font-family:inherit;font-size:13px;}
      @media print{body{margin:20px;}}
    </style></head><body>
      <h1>${title}</h1>
      <p class="meta">${[type, subject, yr].filter(Boolean).join(" · ")}</p>
      <pre>${content.replace(/</g, "&lt;")}</pre>
    </body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <div style={{ borderBottom: `1px solid ${N_BORDER}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px" }}>
        <button
          onClick={() => setOpen((p) => !p)}
          style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: N_FONT, minWidth: 0 }}>
          <TypeBadge type={type} />
          <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Untitled"}</span>
          {(subject || yr) && <span style={{ fontSize: "11px", color: N_MUTED, flexShrink: 0 }}>{[subject, yr].filter(Boolean).join(" · ")}</span>}
          {open ? <ChevronUp size={14} color={N_MUTED} /> : <ChevronDown size={14} color={N_MUTED} />}
        </button>
        <button onClick={exportPDF}
          style={{ flexShrink: 0, padding: "4px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, background: "white", color: N_FG, fontSize: "11px", fontWeight: 600, cursor: "pointer", fontFamily: N_FONT }}>
          📄 PDF
        </button>
      </div>
      {open && content && (
        <div style={{ padding: "0 16px 16px", fontSize: "13px", color: N_FG, lineHeight: 1.75, whiteSpace: "pre-wrap", borderTop: `1px solid ${N_BORDER}`, paddingTop: "12px" }}>
          {content}
        </div>
      )}
      {open && !content && (
        <div style={{ padding: "8px 16px 12px", fontSize: "12px", color: N_MUTED, fontStyle: "italic" }}>No content saved.</div>
      )}
    </div>
  );
}

export function TeacherLibrary({ databases }: { databases: WorkspaceDatabase[] }) {
  const [filter, setFilter] = useState<DocType>("all");

  const docsDb  = databases.find((d) => d.nicheId === "teacher" && d.dbId === "documents") ?? null;
  const allDocs = docsDb?.rows ?? [];

  const filtered = filter === "all" ? allDocs : allDocs.filter((r) => asText(r.properties["Type"]) === filter);
  const counts: Record<string, number> = {};
  for (const r of allDocs) {
    const t = asText(r.properties["Type"]);
    counts[t] = (counts[t] ?? 0) + 1;
  }

  function exportAll() {
    if (filtered.length === 0) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const sections = filtered.map((r) => {
      const title   = asText(r.properties["Title"]);
      const type    = asText(r.properties["Type"]);
      const subject = asText(r.properties["Subject"]);
      const yr      = asText(r.properties["Year Group"]);
      const content = asText(r.properties["Content"]);
      return `<h2>${title}</h2><p class="meta">${[type, subject, yr].filter(Boolean).join(" · ")}</p><pre>${content.replace(/</g, "&lt;")}</pre><hr>`;
    }).join("\n");
    win.document.write(`<!DOCTYPE html><html><head><title>My Planning Documents</title><style>
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#1a1a1a;line-height:1.7;}
      h2{font-size:18px;margin-top:40px;margin-bottom:4px;}
      .meta{font-size:13px;color:#666;margin-bottom:16px;}
      pre{white-space:pre-wrap;font-family:inherit;font-size:13px;}
      hr{margin:32px 0;border:none;border-top:1px solid #ddd;}
      @media print{body{margin:20px;} h2{page-break-before:always;}}
    </style></head><body><h1>My Planning Documents</h1>${sections}</body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: N_FONT }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>My Documents</h2>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
            All saved lesson plans, report comments and assessments — {allDocs.length} document{allDocs.length !== 1 ? "s" : ""} total.
          </p>
        </div>
        {filtered.length > 0 && (
          <button onClick={exportAll}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_TEXT, fontWeight: 600, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT }}>
            📄 Export all as PDF
          </button>
        )}
      </div>

      {allDocs.length === 0 ? (
        <div style={{ padding: "32px", textAlign: "center", borderRadius: "12px", border: `1px dashed ${N_BORDER_MED}` }}>
          <p style={{ margin: "0 0 6px", fontSize: "15px", color: N_FG, fontWeight: 600 }}>No documents yet</p>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Use Lesson Planner, Report Writer and Assessment Builder to generate and save documents here.</p>
        </div>
      ) : (
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          {/* Filter tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${N_BORDER_MED}`, overflowX: "auto" }}>
            {(["all", "Lesson Plan", "Report Comment", "Assessment"] as DocType[]).map((f) => {
              const active = filter === f;
              const count = f === "all" ? allDocs.length : (counts[f] ?? 0);
              const color = f === "all" ? ACCENT : (TYPE_COLORS[f] ?? ACCENT);
              return (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ display: "flex", alignItems: "center", gap: "6px", padding: "12px 16px", border: "none", background: "none", borderBottom: active ? `2px solid ${color}` : "2px solid transparent", color: active ? color : N_MUTED, fontWeight: active ? 700 : 400, fontSize: "13px", cursor: "pointer", fontFamily: N_FONT, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {f === "all" ? "All" : f}
                  {count > 0 && (
                    <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "99px", background: active ? `${color}18` : "rgba(148,163,184,0.15)", color: active ? color : N_MUTED, fontWeight: 700 }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", fontSize: "13px", color: N_MUTED }}>
              No {filter} documents saved yet.
            </div>
          ) : (
            filtered.map((row) => <DocRow key={row.pageId} row={row} />)
          )}
        </div>
      )}
    </div>
  );
}
