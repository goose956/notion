"use client";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, asText } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const DOC_TYPE_COLORS: Record<string, string> = {
  "Appointment Summary": "#2563eb",
  "Behaviour Profile":   "#7c3aed",
  "EHCP Evidence":       "#d97706",
  "Letter":              "#ea580c",
  "Other":               "#6b7280",
};

function DocCard({ row }: { row: WorkspaceRow }) {
  const title   = asText(row.properties["Title"])   || "Untitled";
  const type    = asText(row.properties["Type"])    || "Other";
  const content = asText(row.properties["Content"]) || "";
  const color   = DOC_TYPE_COLORS[type] ?? "#6b7280";

  function exportPdf() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${title}</title><style>
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#111;line-height:1.8;}
      h1{font-size:20px;}pre{white-space:pre-wrap;font-family:inherit;font-size:13px;}
    </style></head><body><h1>${title}</h1><pre>${content.replace(/</g,"&lt;")}</pre></body></html>`);
    w.document.close(); w.print();
  }

  return (
    <div style={{ borderRadius: "10px", border: `1px solid ${N_BORDER}`, background: "white", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
          <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "99px", background: `${color}15`, color, border: `1px solid ${color}25` }}>{type}</span>
          <span style={{ fontSize: "13px", fontWeight: 600, color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        </div>
        <button onClick={exportPdf} style={{ flexShrink: 0, padding: "4px 12px", borderRadius: "6px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, color: ACCENT_TEXT, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>PDF</button>
      </div>
      {content && (
        <p style={{ margin: 0, fontSize: "12px", color: N_MUTED, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
          {content}
        </p>
      )}
    </div>
  );
}

export function SENDDocuments({ documentsDb }: { documentsDb: WorkspaceDatabase | null }) {
  const rows: WorkspaceRow[] = documentsDb?.rows ?? [];

  const byType: Record<string, WorkspaceRow[]> = {};
  for (const row of rows) {
    const t = asText(row.properties["Type"]) || "Other";
    if (!byType[t]) byType[t] = [];
    byType[t]!.push(row);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Documents</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>All saved documents — appointment summaries, behaviour profiles, EHCP evidence, and letters. Generate documents from the other tabs; they appear here automatically.</p>
      </div>

      {rows.length === 0 ? (
        <div style={{ borderRadius: "12px", border: `1px dashed ${N_BORDER}`, padding: "40px 24px", textAlign: "center" }}>
          <p style={{ margin: "0 0 6px", fontSize: "15px" }}>📁</p>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>No documents yet. Save outputs from Appointments, Behaviour Log, EHCP Builder, or Letter Writer.</p>
        </div>
      ) : (
        Object.entries(byType).map(([type, typeRows]) => (
          <div key={type} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: N_FG }}>{type}</span>
              <span style={{ fontSize: "11px", color: N_MUTED }}>({typeRows.length})</span>
            </div>
            {typeRows.map(row => <DocCard key={row.pageId} row={row} />)}
          </div>
        ))
      )}
    </div>
  );
}
