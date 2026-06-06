"use client";
import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { Loader2, Plus, Trash2, SlidersHorizontal, Mail, Pencil, X as XIcon, Check } from "lucide-react";
import { ConfirmModal, type PendingConfirm } from "@/components/confirm-modal";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_ACTIVE, N_BLUE, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow, WorkspaceProperty } from "@/app/api/members/workspace/route";
import { getNicheEntry } from "@/lib/niche-registry";
const READONLY_TYPES = new Set(["formula", "rollup", "relation", "created_time", "last_edited_time", "created_by", "last_edited_by"]);

// ─── Format a cell value for display ───────────────────────────────────────
function statusRowBg(status: string | null | undefined): string {
  const s = (status ?? "").toLowerCase();
  if (s === "booked") return "rgba(209,250,229,0.6)";
  if (s === "cancelled") return "rgba(254,226,226,0.6)";
  if (s === "contacted") return "rgba(219,234,254,0.6)";
  return "white";
}

function formatCell(value: string | number | boolean | null, type: string, format?: string): string {
  if (value === null || value === undefined) return "";
  if (type === "checkbox") return value ? "✔" : "✗";
  if (type === "number" && typeof value === "number") {
    const prefix = format === "pound" ? "£" : format === "dollar" ? "$" : format === "euro" ? "€" : format === "yen" ? "¥" : "";
    return prefix + value.toLocaleString();
  }
  return String(value);
}

// ─── Cell editor ───────────────────────────────────────────────────────────
function CellEditor({
  value,
  type,
  options,
  format,
  onSave,
  onCancel,
}: {
  value: string | number | boolean | null;
  type: string;
  options?: string[] | undefined;
  format?: string | undefined;
  onSave: (val: string | number | boolean | null) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<string>(
    value === null || value === undefined ? "" : String(value),
  );
  const inputRef = useRef<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const inputStyle: React.CSSProperties = {
    padding: "4px 6px",
    fontSize: "13px",
    color: N_FG,
    border: `1px solid ${N_BLUE}`,
    borderRadius: "3px",
    outline: "none",
    fontFamily: N_FONT,
    width: "100%",
    boxSizing: "border-box",
    background: "white",
  };

  function commit() {
    if (type === "number") {
      const n = parseFloat(draft);
      onSave(isNaN(n) ? null : n);
    } else if (type === "checkbox") {
      onSave(draft === "true");
    } else {
      onSave(draft.trim() === "" ? null : draft.trim());
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter" && type !== "rich_text") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { e.preventDefault(); onCancel(); }
  }

  if (type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={draft === "true"}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const val = e.target.checked;
          setDraft(String(val));
          onSave(val);
        }}
        style={{ width: "16px", height: "16px", cursor: "pointer" }}
      />
    );
  }

  if ((type === "select" || type === "status") && options && options.length > 0) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={draft}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        style={{ ...inputStyle, appearance: "auto" }}
      >
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (type === "date") {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="date"
        value={draft}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        style={inputStyle}
      />
    );
  }

  if (type === "rich_text") {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        rows={3}
        style={{ ...inputStyle, resize: "vertical" }}
      />
    );
  }

  const currencyPrefix = type === "number" && format
    ? (format === "pound" ? "£" : format === "dollar" ? "$" : format === "euro" ? "€" : format === "yen" ? "¥" : "")
    : "";

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      {currencyPrefix && (
        <span style={{ position: "absolute", left: "8px", fontSize: "13px", color: N_MUTED, pointerEvents: "none" }}>
          {currencyPrefix}
        </span>
      )}
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type === "number" ? "number" : type === "url" || type === "email" ? type : "text"}
        value={draft}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        style={currencyPrefix ? { ...inputStyle, paddingLeft: "22px" } : inputStyle}
      />
    </div>
  );
}

// ─── Single database table ─────────────────────────────────────────────────
export function DatabaseTable({
  db,
  isAppBackend,
  seatedGuestIds,
  onRowUpdated,
  onRowDeleted,
  onRowAdded,
}: {
  db: WorkspaceDatabase;
  isAppBackend: boolean;
  seatedGuestIds?: Set<string>;
  onRowUpdated: (pageId: string, name: string, val: string | number | boolean | null) => void;
  onRowDeleted: (pageId: string) => void;
  onRowAdded: (row: WorkspaceRow) => void;
}) {
  const [editingCell, setEditingCell] = useState<{ pageId: string; prop: string } | null>(null);
  const [savingCell, setSavingCell] = useState<{ pageId: string; prop: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addingRow, setAddingRow] = useState(false);
  const [cellError, setCellError] = useState<string | null>(null);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  // ── Row expand / full-form edit (used for documents DB) ──────────────────
  const [expandedRow, setExpandedRow] = useState<WorkspaceRow | null>(null);
  const [expandFields, setExpandFields] = useState<Record<string, string>>({});
  const [expandSaving, setExpandSaving] = useState(false);
  const [expandError, setExpandError] = useState<string | null>(null);

  // Whether this DB supports expand-to-edit
  const isExpandableDb = isAppBackend && db.dbId === "documents";

  function openExpand(row: WorkspaceRow) {
    const fields: Record<string, string> = {};
    for (const col of allCols) {
      if (READONLY_TYPES.has(col.type)) continue;
      const v = row.properties[col.name];
      fields[col.name] = v == null ? "" : String(v);
    }
    setExpandFields(fields);
    setExpandError(null);
    setExpandedRow(row);
  }

  async function handleExpandSave() {
    if (!expandedRow) return;
    setExpandSaving(true);
    setExpandError(null);
    try {
      const writableCols = allCols.filter((c) => !READONLY_TYPES.has(c.type));
      const properties: Record<string, string> = {};
      const propertyTypes: Record<string, string> = {};
      for (const col of writableCols) {
        properties[col.name] = expandFields[col.name] ?? "";
        propertyTypes[col.name] = col.type;
      }
      const res = await fetch(`/api/members/workspace/${expandedRow.pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ properties, propertyTypes }),
      });
      if (!res.ok) throw new Error("Failed to save");
      for (const [name, val] of Object.entries(properties)) {
        onRowUpdated(expandedRow.pageId, name, val === "" ? null : val);
      }
      setExpandedRow(null);
    } catch {
      setExpandError("Failed to save. Please try again.");
    } finally {
      setExpandSaving(false);
    }
  }

  const settingsKey = `workspace.sheet.${db.notionId}.columns`;

  useEffect(() => {
    if (!isAppBackend) {
      setHiddenColumns(new Set());
      setColumnWidths({});
      return;
    }
    try {
      const raw = window.localStorage.getItem(settingsKey);
      if (!raw) {
        setHiddenColumns(new Set());
        setColumnWidths({});
        return;
      }
      const parsed = JSON.parse(raw) as {
        hidden?: string[];
        widths?: Record<string, number>;
      };
      const nextHidden = new Set(
        (parsed.hidden ?? []).filter((name) => db.properties.some((p) => p.name === name)),
      );
      const nextWidths: Record<string, number> = {};
      for (const [name, width] of Object.entries(parsed.widths ?? {})) {
        if (!db.properties.some((p) => p.name === name)) continue;
        if (typeof width !== "number" || !Number.isFinite(width)) continue;
        nextWidths[name] = Math.max(90, Math.min(520, Math.round(width)));
      }
      setHiddenColumns(nextHidden);
      setColumnWidths(nextWidths);
    } catch {
      setHiddenColumns(new Set());
      setColumnWidths({});
    }
  }, [db.notionId, db.properties, isAppBackend, settingsKey]);

  useEffect(() => {
    if (!isAppBackend) return;
    try {
      window.localStorage.setItem(
        settingsKey,
        JSON.stringify({
          hidden: Array.from(hiddenColumns),
          widths: columnWidths,
        }),
      );
    } catch {
      // Ignore storage failures.
    }
  }, [hiddenColumns, columnWidths, isAppBackend, settingsKey]);

  // Visible columns: skip formula/rollup/relation by default, always show title first
  const titleCol = db.properties.find((p) => p.type === "title");
  const otherCols = db.properties.filter(
    (p) => p.type !== "title" && p.type !== "created_time" && p.type !== "last_edited_time" && p.type !== "created_by" && p.type !== "last_edited_by" && p.type !== "formula",
  );
  const allCols: WorkspaceProperty[] = titleCol
    ? [titleCol, ...otherCols]
    : otherCols;
  const visibleCols: WorkspaceProperty[] = allCols.filter((col) => !hiddenColumns.has(col.name));

  const hasOnlyOneVisibleColumn = visibleCols.length <= 1;

  function getColumnWidth(col: WorkspaceProperty): number {
    if (columnWidths[col.name] !== undefined) return columnWidths[col.name]!;
    return col.type === "title" ? 240 : 160;
  }

  function toggleColumnVisibility(columnName: string, hide: boolean) {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (hide) next.add(columnName);
      else next.delete(columnName);
      return next;
    });
  }

  const supportsEmailCompose = isAppBackend && db.dbId === "documents" &&
    !!(getNicheEntry(db.nicheId)?.dbPropertyInjections?.["documents"]);

  function buildComposeMailto(row: WorkspaceRow): string | null {
    const email = row.properties["Email"];
    if (typeof email !== "string" || !email.trim()) return null;

    const recipient = row.properties["Recipient"];
    const subject = row.properties["Subject"];
    const body = row.properties["Body"];
    const summary = row.properties["Summary"];

    const lines: string[] = [];
    if (typeof recipient === "string" && recipient.trim()) {
      lines.push(`Hi ${recipient.trim()},`);
      lines.push("");
    }
    if (typeof body === "string" && body.trim()) {
      lines.push(body.trim());
    } else if (typeof summary === "string" && summary.trim()) {
      lines.push(summary.trim());
    }

    const params = new URLSearchParams();
    if (typeof subject === "string" && subject.trim()) {
      params.set("subject", subject.trim());
    }
    if (lines.length > 0) {
      params.set("body", lines.join("\n"));
    }

    return `mailto:${email.trim()}${params.toString().length > 0 ? `?${params.toString()}` : ""}`;
  }

  // Type map for quick lookups
  const typeMap: Record<string, string> = {};
  for (const p of db.properties) typeMap[p.name] = p.type;

  // Options map (select/status) — prefer schema-defined options, fall back to row values
  const optionsMap: Record<string, string[]> = {};
  // 1. Seed from schema options (always has the full list)
  for (const col of db.properties) {
    if ((col.type === "select" || col.type === "status") && col.options && col.options.length > 0) {
      optionsMap[col.name] = [...col.options];
    }
  }
  // 2. Supplement with any values already in rows that aren't in the schema list
  for (const row of db.rows) {
    for (const [name, val] of Object.entries(row.properties)) {
      const type = typeMap[name];
      if ((type === "select" || type === "status") && typeof val === "string" && val) {
        if (!optionsMap[name]) optionsMap[name] = [];
        if (!optionsMap[name]!.includes(val)) optionsMap[name]!.push(val);
      }
    }
  }

  async function handleSave(
    pageId: string,
    propName: string,
    val: string | number | boolean | null,
  ) {
    setEditingCell(null);
    setSavingCell({ pageId, prop: propName });
    setCellError(null);
    try {
      const res = await fetch(`/api/members/workspace/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: { [propName]: val },
          propertyTypes: { [propName]: typeMap[propName] ?? "rich_text" },
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Save failed");
      }
      onRowUpdated(pageId, propName, val);
    } catch (err) {
      setCellError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingCell(null);
    }
  }

  function handleDelete(pageId: string) {
    setPendingConfirm({
      title: "Archive row",
      message: "Archive this row? It will be removed from this view.",
      confirmLabel: "Archive",
      onConfirm: () => {
        setPendingConfirm(null);
        setDeletingId(pageId);
        void fetch(`/api/members/workspace/${pageId}`, { method: "DELETE" }).then(() => {
          onRowDeleted(pageId);
        }).finally(() => {
          setDeletingId(null);
        });
      },
    });
  }

  async function handleAddRow() {
    setAddingRow(true);
    try {
      // Create with empty title
      const titleProp = db.properties.find((p) => p.type === "title");
      const props: Record<string, string> = {};
      const propTypes: Record<string, string> = {};
      if (titleProp) {
        props[titleProp.name] = "New entry";
        propTypes[titleProp.name] = "title";
      }

      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: db.notionId,
          properties: props,
          propertyTypes: propTypes,
        }),
      });

      if (!res.ok) throw new Error("Failed to create row");
      const data = (await res.json()) as { pageId: string };
      const newRow: WorkspaceRow = {
        pageId: data.pageId,
        properties: {},
      };
      if (titleProp) newRow.properties[titleProp.name] = "New entry";
      onRowAdded(newRow);
    } catch (err) {
      setCellError(err instanceof Error ? err.message : "Failed to add row");
    } finally {
      setAddingRow(false);
    }
  }

  if (visibleCols.length === 0) {
    return (
      <p style={{ fontSize: "14px", color: N_MUTED, padding: "20px" }}>
        No displayable columns in this database.
      </p>
    );
  }

  return (
    <>
      {pendingConfirm && (
        <ConfirmModal
          {...pendingConfirm}
          onCancel={() => setPendingConfirm(null)}
        />
      )}

      {/* ── Full-form row editor modal (documents DB) ───────────────────── */}
      {expandedRow && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setExpandedRow(null); }}
        >
          <div
            style={{
              background: "#fff", borderRadius: 12, width: "100%", maxWidth: 560,
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              overflow: "hidden",
              fontFamily: N_FONT,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${N_BORDER}` }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: N_FG }}>Edit document</span>
              <button onClick={() => setExpandedRow(null)} style={{ background: "none", border: "none", cursor: "pointer", color: N_MUTED, display: "flex", padding: 4 }}>
                <XIcon size={16} />
              </button>
            </div>

            {/* Fields */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14, maxHeight: "60vh", overflowY: "auto" }}>
              {allCols.filter((c) => !READONLY_TYPES.has(c.type)).map((col) => (
                <div key={col.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: N_MUTED }}>{col.name}</label>
                  {col.type === "select" && col.options ? (
                    <select
                      value={expandFields[col.name] ?? ""}
                      onChange={(e) => setExpandFields((p) => ({ ...p, [col.name]: e.target.value }))}
                      style={{ fontFamily: N_FONT, fontSize: 13, color: N_FG, background: "#fff", border: `1px solid ${N_BORDER}`, borderRadius: 6, padding: "7px 10px", outline: "none" }}
                    >
                      <option value="">—</option>
                      {col.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : col.type === "rich_text" && col.name === "Notes" ? (
                    <textarea
                      value={expandFields[col.name] ?? ""}
                      onChange={(e) => setExpandFields((p) => ({ ...p, [col.name]: e.target.value }))}
                      rows={5}
                      style={{ fontFamily: N_FONT, fontSize: 13, color: N_FG, background: "#fff", border: `1px solid ${N_BORDER}`, borderRadius: 6, padding: "7px 10px", outline: "none", resize: "vertical" }}
                    />
                  ) : col.type === "date" ? (
                    <input
                      type="date"
                      value={expandFields[col.name] ?? ""}
                      onChange={(e) => setExpandFields((p) => ({ ...p, [col.name]: e.target.value }))}
                      style={{ fontFamily: N_FONT, fontSize: 13, color: N_FG, background: "#fff", border: `1px solid ${N_BORDER}`, borderRadius: 6, padding: "7px 10px", outline: "none" }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={expandFields[col.name] ?? ""}
                      onChange={(e) => setExpandFields((p) => ({ ...p, [col.name]: e.target.value }))}
                      style={{ fontFamily: N_FONT, fontSize: 13, color: N_FG, background: "#fff", border: `1px solid ${N_BORDER}`, borderRadius: 6, padding: "7px 10px", outline: "none" }}
                    />
                  )}
                </div>
              ))}
              {expandError && <div style={{ fontSize: 12, color: "#dc2626" }}>{expandError}</div>}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px", borderTop: `1px solid ${N_BORDER}` }}>
              <button
                onClick={() => setExpandedRow(null)}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 14px", borderRadius: 6, background: "none", border: `1px solid ${N_BORDER}`, fontSize: 13, color: N_MUTED, cursor: "pointer", fontFamily: N_FONT }}
              >
                <XIcon size={13} /> Cancel
              </button>
              <button
                onClick={() => void handleExpandSave()}
                disabled={expandSaving}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 16px", borderRadius: 6, background: "#4f46e5", border: "none", fontSize: 13, fontWeight: 600, color: "#fff", cursor: expandSaving ? "not-allowed" : "pointer", opacity: expandSaving ? 0.6 : 1, fontFamily: N_FONT }}
              >
                <Check size={13} /> {expandSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ overflowX: "auto", position: "relative" }}>
      {isAppBackend && allCols.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px", position: "relative" }}>
          <button
            type="button"
            onClick={() => setColumnsMenuOpen((prev) => !prev)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              borderRadius: "4px",
              border: `1px solid ${N_BORDER_MED}`,
              background: "white",
              fontSize: "12px",
              fontWeight: 500,
              color: N_FG,
              cursor: "pointer",
              fontFamily: N_FONT,
            }}
            className="hover:bg-[rgba(55,53,47,0.04)]"
          >
            <SlidersHorizontal size={13} />
            Columns
          </button>

          {columnsMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: "34px",
                right: 0,
                width: "320px",
                maxHeight: "360px",
                overflowY: "auto",
                zIndex: 30,
                background: "white",
                border: `1px solid ${N_BORDER}`,
                borderRadius: "6px",
                boxShadow: "0 14px 30px rgba(0,0,0,0.12)",
                padding: "10px",
              }}
            >
              <p style={{ margin: "0 0 8px", fontSize: "12px", color: N_SUBTLE, fontWeight: 600 }}>
                Show columns and set widths
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {allCols.map((col) => {
                  const checked = !hiddenColumns.has(col.name);
                  const isTitle = col.type === "title";
                  const disableHide = isTitle || (checked && hasOnlyOneVisibleColumn);
                  const width = getColumnWidth(col);

                  return (
                    <div key={col.id} style={{ border: `1px solid ${N_BORDER}`, borderRadius: "5px", padding: "8px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: disableHide ? "default" : "pointer" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disableHide}
                          onChange={(e) => toggleColumnVisibility(col.name, !e.target.checked)}
                        />
                        <span style={{ fontSize: "12px", color: N_FG, fontWeight: 500, flex: 1 }}>
                          {col.name}
                        </span>
                        <span style={{ fontSize: "11px", color: N_SUBTLE }}>{col.type}</span>
                      </label>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="range"
                          min={90}
                          max={520}
                          step={10}
                          value={width}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            setColumnWidths((prev) => ({ ...prev, [col.name]: next }));
                          }}
                          style={{ flex: 1 }}
                        />
                        <span style={{ width: "44px", textAlign: "right", fontSize: "11px", color: N_SUBTLE }}>
                          {width}px
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {cellError && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: "8px",
            borderRadius: "4px",
            background: "rgba(220,38,38,0.06)",
            border: "1px solid rgba(220,38,38,0.2)",
            fontSize: "13px",
            color: "rgb(220,38,38)",
          }}
        >
          {cellError}
        </div>
      )}

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13px",
          color: N_FG,
          fontFamily: N_FONT,
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          {visibleCols.map((col) => {
            const colWidth = getColumnWidth(col);
            return <col key={col.id} style={{ width: `${colWidth}px` }} />;
          })}
          <col style={{ width: "32px" }} />
        </colgroup>
        <thead>
          <tr style={{ background: "#F7F6F3" }}>
            {visibleCols.map((col) => (
              <th
                key={col.id}
                style={{
                  padding: "7px 10px",
                  textAlign: "left",
                  fontWeight: 500,
                  fontSize: "11px",
                  color: N_SUBTLE,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  border: `1px solid ${N_BORDER}`,
                  whiteSpace: "nowrap",
                  width: `${getColumnWidth(col)}px`,
                  minWidth: `${getColumnWidth(col)}px`,
                  maxWidth: `${getColumnWidth(col)}px`,
                }}
              >
                {col.name}
              </th>
            ))}
            <th
              style={{
                padding: "7px 8px",
                border: `1px solid ${N_BORDER}`,
                width: "32px",
              }}
            />
          </tr>
        </thead>
        <tbody>
          {db.rows.length === 0 && (
            <tr>
              <td
                colSpan={visibleCols.length + 1}
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: N_MUTED,
                  border: `1px solid ${N_BORDER}`,
                }}
              >
                No rows yet — click &quot;Add row&quot; to get started.
              </td>
            </tr>
          )}
          {db.rows.map((row) => {
            const isSeated = seatedGuestIds != null && (seatedGuestIds.has(row.pageId) || seatedGuestIds.has(row.pageId + "-plus-one"));
            const rowStatus = Object.entries(row.properties).find(([k]) => k.toLowerCase() === "status")?.[1];
            const rowBg = isSeated ? "rgba(209,250,229,0.7)" : statusRowBg(typeof rowStatus === "string" ? rowStatus : null);
            return (
            <tr
              key={row.pageId}
              style={{ background: rowBg }}
              className="hover:brightness-95"
            >
              {visibleCols.map((col) => {
                const isSeatedCol = col.name === "Seated" && seatedGuestIds != null;
                const val = isSeatedCol ? isSeated : (row.properties[col.name] ?? null);
                const isEditing =
                  editingCell?.pageId === row.pageId &&
                  editingCell?.prop === col.name;
                const isSaving =
                  savingCell?.pageId === row.pageId &&
                  savingCell?.prop === col.name;
                const readonly = READONLY_TYPES.has(col.type) || isSeatedCol;
                return (
                  <td
                    key={col.id}
                    onClick={() => {
                      if (!readonly && !isSaving)
                        setEditingCell({ pageId: row.pageId, prop: col.name });
                    }}
                    style={{
                      padding: isEditing ? "4px 6px" : "7px 10px",
                      border: `1px solid ${N_BORDER}`,
                      cursor: readonly ? "default" : "pointer",
                      background: isEditing ? "rgba(35,131,226,0.04)" : undefined,
                      width: `${getColumnWidth(col)}px`,
                      minWidth: `${getColumnWidth(col)}px`,
                      maxWidth: `${getColumnWidth(col)}px`,
                      overflow: "hidden",
                      verticalAlign: "middle",
                    }}
                  >
                    {isSaving ? (
                      <Loader2
                        size={12}
                        style={{ color: N_SUBTLE, animation: "spin 1s linear infinite" }}
                      />
                    ) : isEditing ? (
                      <CellEditor
                        value={val}
                        type={col.type}
                        options={optionsMap[col.name]}
                        format={col.format}
                        onSave={(v) => void handleSave(row.pageId, col.name, v)}
                        onCancel={() => setEditingCell(null)}
                      />
                    ) : (
                      <span
                        style={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: val === null ? N_SUBTLE : col.type === "url" ? N_BLUE : N_FG,
                          fontWeight: col.type === "title" ? 500 : 400,
                        }}
                      >
                        {col.type === "url" && val ? (
                          <a
                            href={String(val)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: N_BLUE, textDecoration: "none" }}
                          >
                            {String(val)}
                          </a>
                        ) : (
                          formatCell(val, col.type, col.format) || (
                            <span style={{ color: N_SUBTLE, fontStyle: "italic" }}>
                              {readonly ? "—" : "Empty"}
                            </span>
                          )
                        )}
                      </span>
                    )}
                  </td>
                );
              })}
              {/* Row actions */}
              <td
                style={{
                  padding: "4px",
                  border: `1px solid ${N_BORDER}`,
                  textAlign: "center",
                  verticalAlign: "middle",
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  {isExpandableDb && (
                    <button
                      onClick={() => openExpand(row)}
                      title="Edit"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: N_SUBTLE, display: "flex", alignItems: "center" }}
                      className="hover:text-[#37352F]"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  {supportsEmailCompose && buildComposeMailto(row) && (
                    <a
                      href={buildComposeMailto(row)!}
                      title="Compose email"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px",
                        color: N_SUBTLE,
                        display: "inline-flex",
                        alignItems: "center",
                        textDecoration: "none",
                      }}
                      className="hover:text-[#37352F]"
                    >
                      <Mail size={13} />
                    </a>
                  )}
                  {deletingId === row.pageId ? (
                    <Loader2
                      size={12}
                      style={{ color: N_SUBTLE, animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <button
                      onClick={() => void handleDelete(row.pageId)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px",
                        color: N_SUBTLE,
                        display: "flex",
                        alignItems: "center",
                      }}
                      title="Archive row"
                      className="hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>

      {/* Add row */}
      <button
        onClick={() => void handleAddRow()}
        disabled={addingRow}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          marginTop: "6px",
          padding: "5px 10px",
          fontSize: "13px",
          color: N_MUTED,
          background: "transparent",
          border: "none",
          cursor: addingRow ? "default" : "pointer",
          fontFamily: N_FONT,
          borderRadius: "3px",
        }}
        className="hover:bg-[rgba(55,53,47,0.06)] hover:text-[#37352F]"
      >
        {addingRow ? (
          <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <Plus size={13} />
        )}
        Add row
      </button>

      {db.hasMore && (
        <p style={{ fontSize: "12px", color: N_SUBTLE, marginTop: "8px", padding: "0 4px" }}>
          Showing first 50 rows. Open in Notion to see all.
        </p>
      )}
    </div>
    </>
  );
}

