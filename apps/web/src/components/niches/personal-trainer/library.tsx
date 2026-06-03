"use client";
import { useState } from "react";
import { N_FG, N_MUTED, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, asText } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

type DocType = "All" | "Training Programme" | "Client Check-In" | "Nutrition Guide";

const TYPE_COLORS: Record<string, string> = {
  "Training Programme": "#16a34a",
  "Client Check-In":    "#2563eb",
  "Nutrition Guide":    "#ea580c",
};

function DocRow({ row }: { row: WorkspaceRow }) {
  const [expanded, setExpanded] = useState(false);
  const type    = asText(row.properties["Type"]);
  const title   = asText(row.properties["Title"]);
  const client  = asText(row.properties["Client"]);
  const content = asText(row.properties["Content"]);
  const color   = TYPE_COLORS[type] ?? ACCENT;

  function exportPdf() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${title}</title><style>
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#111;line-height:1.8;}
      h1{font-size:20px;margin-bottom:4px;}strong{color:#15803d;}
      pre{white-space:pre-wrap;font-family:inherit;}
    </style></head><body>
      <h1>${title}</h1>
      ${client ? `<p style="color:#666;font-size:13px;">Client: ${client}</p>` : ""}
      <pre>${content.replace(/</g, "&lt;")}</pre>
    </body></html>`);
    w.document.close();
    w.print();
  }

  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
      <div
        onClick={() => setExpanded((x) => !x)}
        style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
      >
        <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", background: `${color}18`, color, border: `1px solid ${color}30` }}>{type || "Document"}</span>
        <span style={{ flex: 1, fontSize: "13px", color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{title || "Untitled"}</span>
        {client && <span style={{ fontSize: "11px", color: N_MUTED, flexShrink: 0 }}>{client}</span>}
        <button
          onClick={(e) => { e.stopPropagation(); exportPdf(); }}
          style={{ flexShrink: 0, padding: "3px 10px", borderRadius: "6px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
        >
          PDF
        </button>
        <span style={{ fontSize: "11px", color: N_MUTED }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && content && (
        <div style={{ padding: "12px 16px 16px", background: ACCENT_LIGHT, borderTop: `1px solid ${ACCENT_BORDER}` }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", color: N_FG, lineHeight: "1.7", fontFamily: "Georgia, serif" }}>{content}</pre>
        </div>
      )}
    </div>
  );
}

export function PTLibrary({ databases }: { databases: WorkspaceDatabase[] }) {
  const [filter, setFilter] = useState<DocType>("All");

  const docsDb = databases.find((d) => d.nicheId === "personal-trainer" && d.dbId === "documents") ?? null;
  const allDocs: WorkspaceRow[] = docsDb?.rows ?? [];

  const visible = filter === "All" ? allDocs : allDocs.filter((r) => asText(r.properties["Type"]) === filter);

  function exportAll() {
    if (visible.length === 0) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const body = visible.map((row) => {
      const title   = asText(row.properties["Title"]) || "Untitled";
      const client  = asText(row.properties["Client"]);
      const content = asText(row.properties["Content"]);
      return `<h2>${title}${client ? ` — ${client}` : ""}</h2><pre>${content.replace(/</g, "&lt;")}</pre><hr/>`;
    }).join("\n");
    w.document.write(`<html><head><title>PT Documents Export</title><style>
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#111;line-height:1.8;}
      h2{color:#15803d;font-size:16px;}pre{white-space:pre-wrap;font-family:inherit;font-size:13px;}hr{border:none;border-top:1px solid #ddd;margin:24px 0;}
    </style></head><body>${body}</body></html>`);
    w.document.close();
    w.print();
  }

  const FILTERS: DocType[] = ["All", "Training Programme", "Client Check-In", "Nutrition Guide"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: N_FONT }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ margin: "0 0 2px", fontSize: "17px", fontWeight: 700, color: N_FG }}>My Documents</h2>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>{allDocs.length} document{allDocs.length !== 1 ? "s" : ""} saved</p>
        </div>
        {visible.length > 0 && (
          <button onClick={exportAll} style={{ padding: "7px 16px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
            Export all as PDF
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ padding: "5px 14px", borderRadius: "20px", border: `1px solid ${filter === f ? ACCENT : N_BORDER_MED}`, background: filter === f ? ACCENT : "white", color: filter === f ? "white" : N_FG, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div style={{ padding: "32px", textAlign: "center", borderRadius: "12px", border: `1px dashed ${ACCENT_BORDER}`, background: ACCENT_LIGHT }}>
          <p style={{ margin: 0, fontSize: "14px", color: ACCENT_TEXT, fontWeight: 600 }}>No documents yet</p>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: N_MUTED }}>Use Programme Builder, Client Check-In or Nutrition Guide to generate and save documents.</p>
        </div>
      ) : (
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          {visible.map((row) => <DocRow key={row.pageId} row={row} />)}
        </div>
      )}
    </div>
  );
}
