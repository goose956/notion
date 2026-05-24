"use client";

import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Trash2, ExternalLink, RefreshCw, ChevronDown, ChevronRight, WandSparkles, SlidersHorizontal, Mail, LayoutDashboard, CalendarDays, MapPin, Users, CheckCircle2, ListChecks, FileText, Pencil, Check, X } from "lucide-react";
import { SeatingPlannerView } from "../seating/SeatingPlannerView";
import type {
  WorkspaceDatabase,
  WorkspaceProperty,
  WorkspaceRow,
  WorkspaceResponse,
} from "@/app/api/members/workspace/route";

// ─── Notion design tokens ──────────────────────────────────────────────────────
const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_BORDER_MED = "rgba(55,53,47,0.16)";
const N_ACTIVE = "rgba(55,53,47,0.06)";
const N_BLUE = "rgb(35,131,226)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';
const DASHBOARD_TAB_ID = "__workspace_dashboard__";
const SEATING_TAB_ID = "__workspace_seating__";
const DRAFT_TAB_ID = "__workspace_draft_letters__";

// ─── Readonly property types (can't inline-edit these) ─────────────────────
const READONLY_TYPES = new Set(["formula", "rollup", "relation", "created_time", "last_edited_time", "created_by", "last_edited_by"]);

// ─── Format a cell value for display ───────────────────────────────────────
function formatCell(value: string | number | boolean | null, type: string): string {
  if (value === null || value === undefined) return "";
  if (type === "checkbox") return value ? "✓" : "✗";
  if (type === "number" && typeof value === "number") {
    return value.toLocaleString();
  }
  return String(value);
}

// ─── Cell editor ───────────────────────────────────────────────────────────
function CellEditor({
  value,
  type,
  options,
  onSave,
  onCancel,
}: {
  value: string | number | boolean | null;
  type: string;
  options?: string[] | undefined;
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

  if (type === "select" && options && options.length > 0) {
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

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={type === "number" ? "number" : type === "url" || type === "email" ? type : "text"}
      value={draft}
      onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKey}
      style={inputStyle}
    />
  );
}

// ─── Single database table ─────────────────────────────────────────────────
function DatabaseTable({
  db,
  isAppBackend,
  onRowUpdated,
  onRowDeleted,
  onRowAdded,
}: {
  db: WorkspaceDatabase;
  isAppBackend: boolean;
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
    (p) => p.type !== "title" && p.type !== "created_time" && p.type !== "last_edited_time" && p.type !== "created_by" && p.type !== "last_edited_by",
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

  const supportsEmailCompose = isAppBackend && db.nicheId === "wedding-planner" && db.dbId === "documents";

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

  // Options map (select/status) — we derive from existing row values
  const optionsMap: Record<string, string[]> = {};
  for (const row of db.rows) {
    for (const [name, val] of Object.entries(row.properties)) {
      const type = typeMap[name];
      if ((type === "select" || type === "status") && val && !optionsMap[name]) {
        // We'll collect from all rows
        optionsMap[name] = optionsMap[name] ?? [];
      }
    }
  }
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

  async function handleDelete(pageId: string) {
    if (!confirm("Archive this row?")) return;
    setDeletingId(pageId);
    try {
      await fetch(`/api/members/workspace/${pageId}`, { method: "DELETE" });
      onRowDeleted(pageId);
    } finally {
      setDeletingId(null);
    }
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
          {db.rows.map((row) => (
            <tr
              key={row.pageId}
              style={{ background: "white" }}
              className="hover:bg-[rgba(55,53,47,0.02)]"
            >
              {visibleCols.map((col) => {
                const val = row.properties[col.name] ?? null;
                const isEditing =
                  editingCell?.pageId === row.pageId &&
                  editingCell?.prop === col.name;
                const isSaving =
                  savingCell?.pageId === row.pageId &&
                  savingCell?.prop === col.name;
                const readonly = READONLY_TYPES.has(col.type);

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
                          formatCell(val, col.type) || (
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
          ))}
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
  );
}

interface DraftPayload {
  title: string;
  subject: string;
  body: string;
  summary: string;
  type: string;
}

function findPropertyName(props: WorkspaceProperty[], candidates: string[]): string | null {
  const map = new Map(props.map((p) => [p.name.toLowerCase(), p.name]));
  for (const c of candidates) {
    const match = map.get(c.toLowerCase());
    if (match) return match;
  }
  return null;
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asCurrencyNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9.-]/g, "").trim();
    if (normalized.length === 0) return null;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getCurrencyCode(criteria: Record<string, unknown> | null): string {
  const fromCriteria = asText(criteria?.["currency-code"])?.toUpperCase();
  if (!fromCriteria) return "GBP";
  if (/^[A-Z]{3}$/.test(fromCriteria)) return fromCriteria;
  return "GBP";
}

function formatCurrency(value: number | null, currencyCode: string): string {
  if (value === null || !Number.isFinite(value)) return "Not set";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

function parseWeddingDate(value: unknown): Date | null {
  const text = asText(value);
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function WeddingWorkspaceDashboard({
  databases,
  weddingCriteria,
  onWeddingCriteriaUpdated,
}: {
  databases: WorkspaceDatabase[];
  weddingCriteria: Record<string, unknown> | null;
  onWeddingCriteriaUpdated: (criteria: Record<string, unknown>) => void;
}) {
  const [coupleNamesInput, setCoupleNamesInput] = useState(asText(weddingCriteria?.["couple-names"]) ?? "");
  const [venueInput, setVenueInput] = useState(asText(weddingCriteria?.["wedding-location"]) ?? "");
  const [guestCountInput, setGuestCountInput] = useState(String(asNumber(weddingCriteria?.["guest-count"]) ?? ""));
  const [budgetInput, setBudgetInput] = useState(String(asNumber(weddingCriteria?.["total-budget"]) ?? ""));
  const [costPerGuestInput, setCostPerGuestInput] = useState(String(asNumber(weddingCriteria?.["cost-per-guest"]) ?? 100));
  const [daysToGoInput, setDaysToGoInput] = useState(String(asNumber(weddingCriteria?.["countdown-days"]) ?? ""));
  const [editingField, setEditingField] = useState<null | "couple" | "venue" | "guest" | "budget" | "costPerGuest" | "days">(null);
  const [guestScenarioCount, setGuestScenarioCount] = useState(100);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  useEffect(() => {
    setCoupleNamesInput(asText(weddingCriteria?.["couple-names"]) ?? "");
    setVenueInput(asText(weddingCriteria?.["wedding-location"]) ?? "");
    setGuestCountInput(String(asNumber(weddingCriteria?.["guest-count"]) ?? ""));
    setBudgetInput(String(asNumber(weddingCriteria?.["total-budget"]) ?? ""));
    setCostPerGuestInput(String(asNumber(weddingCriteria?.["cost-per-guest"]) ?? 100));
    setDaysToGoInput(String(asNumber(weddingCriteria?.["countdown-days"]) ?? ""));
  }, [weddingCriteria]);

  const guestsDb = databases.find((d) => d.nicheId === "wedding-planner" && d.dbId === "guests") ?? null;
  const timelineDb =
    databases.find(
      (d) => d.nicheId === "wedding-planner" && /planning\s*(timeline|timetable)/i.test(d.dbName),
    ) ?? null;
  const budgetDb = databases.find((d) => d.nicheId === "wedding-planner" && d.dbId === "budget") ?? null;
  const documentsDb = databases.find((d) => d.nicheId === "wedding-planner" && d.dbId === "documents") ?? null;

  const coupleNames = asText(weddingCriteria?.["couple-names"]);
  const weddingDate = parseWeddingDate(weddingCriteria?.["wedding-date"]);
  const venue = asText(weddingCriteria?.["wedding-location"]);
  const plannedGuests = asNumber(weddingCriteria?.["guest-count"]);
  const totalBudget = asNumber(weddingCriteria?.["total-budget"]);
  const savedCostPerGuest = asNumber(weddingCriteria?.["cost-per-guest"]);
  const costPerGuest = savedCostPerGuest ?? 100;
  const currencyCode = getCurrencyCode(weddingCriteria);
  const countdownMode = asText(weddingCriteria?.["countdown-mode"]);
  const manualCountdownDays = asNumber(weddingCriteria?.["countdown-days"]);

  const trackedGuests = guestsDb?.rows.length ?? 0;
  const targetGuests = plannedGuests ?? trackedGuests;
  const guestSpend = targetGuests > 0 ? targetGuests * costPerGuest : 0;
  const budgetActualFieldName = budgetDb
    ? findPropertyName(budgetDb.properties, ["Actual Cost", "Actual", "Spent", "Total"])
    : null;
  const budgetEstimatedFieldName = budgetDb
    ? findPropertyName(budgetDb.properties, ["Estimated Cost", "Estimated"])
    : null;
  const budgetDepositFieldName = budgetDb
    ? findPropertyName(budgetDb.properties, ["Deposit"])
    : null;
  const budgetTotalsSpend = budgetDb
    ? budgetDb.rows.reduce((sum, row) => {
        const actual = budgetActualFieldName
          ? asCurrencyNumber(row.properties[budgetActualFieldName])
          : null;
        const estimated = budgetEstimatedFieldName
          ? asCurrencyNumber(row.properties[budgetEstimatedFieldName])
          : null;
        const deposit = budgetDepositFieldName
          ? asCurrencyNumber(row.properties[budgetDepositFieldName])
          : null;
        const next = actual ?? estimated ?? deposit ?? 0;
        return sum + next;
      }, 0)
    : 0;
  const hasAddedExpenses = budgetTotalsSpend > 0;
  const totalSpent = guestSpend + budgetTotalsSpend;
  const remainingBudget = totalBudget !== null ? totalBudget - totalSpent : null;
  const budgetUsedPercent =
    totalBudget && totalBudget > 0
      ? Math.max(0, Math.min(100, Math.round((totalSpent / totalBudget) * 100)))
      : 0;
  const tableFieldName = guestsDb
    ? findPropertyName(guestsDb.properties, ["Table", "Table Number", "Table Assignment"])
    : null;

  useEffect(() => {
    setGuestScenarioCount(targetGuests > 0 ? targetGuests : 100);
  }, [targetGuests]);

  const scenarioSpend = guestScenarioCount * costPerGuest;
  const scenarioDelta = scenarioSpend - guestSpend;

  const seatedGuests =
    guestsDb && tableFieldName
      ? guestsDb.rows.filter((row) => {
          const value = row.properties[tableFieldName];
          if (typeof value === "number") return value > 0;
          if (typeof value === "string") return value.trim().length > 0;
          return false;
        }).length
      : 0;

  const seatingStarted = seatedGuests > 0;
  const seatingProgress = trackedGuests > 0 ? Math.round((seatedGuests / trackedGuests) * 100) : 0;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const computedFromDate = weddingDate
    ? Math.ceil((weddingDate.getTime() - now.getTime()) / 86_400_000)
    : null;
  const useManualCountdown =
    countdownMode === "manual" ? manualCountdownDays !== null : manualCountdownDays !== null;
  const countdownDays = useManualCountdown ? manualCountdownDays : computedFromDate;

  const countdownLabel =
    countdownDays === null
      ? "Set your wedding date"
      : countdownDays >= 0
        ? `${countdownDays} day${countdownDays === 1 ? "" : "s"} to go`
        : `${Math.abs(countdownDays)} day${Math.abs(countdownDays) === 1 ? "" : "s"} since your wedding date`;

  const normalizedDays = countdownDays === null ? null : Math.max(0, countdownDays);
  const countdownPercent =
    normalizedDays === null ? 0 : Math.min(100, Math.max(0, Math.round(((365 - Math.min(365, normalizedDays)) / 365) * 100)));
  const urgencyColor =
    normalizedDays === null
      ? "rgb(107,114,128)"
      : normalizedDays <= 30
        ? "rgb(220,38,38)"
        : normalizedDays <= 90
          ? "rgb(249,115,22)"
          : normalizedDays <= 180
            ? "rgb(234,179,8)"
            : "rgb(22,163,74)";

  async function saveTopDetails(): Promise<boolean> {
    setSavingDetails(true);
    setDetailsError(null);
    try {
      const parsedGuestCount = Number(guestCountInput);
      const parsedBudget = Number(budgetInput);
      const parsedCostPerGuest = Number(costPerGuestInput);
      const parsedCountdownDays = Number(daysToGoInput);

      const nextCriteria = {
        ...(weddingCriteria ?? {}),
        "couple-names": coupleNamesInput.trim(),
        "wedding-location": venueInput.trim(),
        "guest-count":
          guestCountInput.trim() === "" || !Number.isFinite(parsedGuestCount)
            ? null
            : Math.max(0, Math.round(parsedGuestCount)),
        "total-budget":
          budgetInput.trim() === "" || !Number.isFinite(parsedBudget)
            ? null
            : Math.max(0, Math.round(parsedBudget)),
        "cost-per-guest":
          costPerGuestInput.trim() === "" || !Number.isFinite(parsedCostPerGuest)
            ? 100
            : Math.max(0, Math.round(parsedCostPerGuest)),
        "countdown-days":
          daysToGoInput.trim() === "" || !Number.isFinite(parsedCountdownDays)
            ? null
            : Math.max(0, Math.round(parsedCountdownDays)),
        "countdown-mode":
          daysToGoInput.trim() === "" || !Number.isFinite(parsedCountdownDays)
            ? "date"
            : "manual",
      };

      const res = await fetch("/api/members/criteria/wedding-planner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria: nextCriteria }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save wedding details");
      }
      const body = (await res.json().catch(() => ({}))) as { criteria?: Record<string, unknown> };
      onWeddingCriteriaUpdated(body.criteria ?? nextCriteria);
      return true;
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Failed to save wedding details");
      return false;
    } finally {
      setSavingDetails(false);
    }
  }

  async function commitInlineEdit(field: "couple" | "venue" | "guest" | "budget" | "costPerGuest" | "days") {
    const ok = await saveTopDetails();
    if (ok) setEditingField((prev) => (prev === field ? null : prev));
  }

  function cancelInlineEdit(field: "couple" | "venue" | "guest" | "budget" | "costPerGuest" | "days") {
    setCoupleNamesInput(asText(weddingCriteria?.["couple-names"]) ?? "");
    setVenueInput(asText(weddingCriteria?.["wedding-location"]) ?? "");
    setGuestCountInput(String(asNumber(weddingCriteria?.["guest-count"]) ?? ""));
    setBudgetInput(String(asNumber(weddingCriteria?.["total-budget"]) ?? ""));
    setCostPerGuestInput(String(asNumber(weddingCriteria?.["cost-per-guest"]) ?? 100));
    setDaysToGoInput(String(asNumber(weddingCriteria?.["countdown-days"]) ?? ""));
    setEditingField((prev) => (prev === field ? null : prev));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

      {/* ── HERO BANNER ──────────────────────────────────────────────────── */}
      <section
        style={{
          borderRadius: "16px",
          background: "linear-gradient(135deg, #2a0f1e 0%, #6b2040 42%, #a85470 72%, #d4957a 100%)",
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(107,32,64,0.28), 0 2px 8px rgba(0,0,0,0.10)",
          display: "grid",
          gridTemplateColumns: "1fr auto",
        }}
      >
        {/* Names + Venue */}
        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ margin: "0 0 10px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
            ✦ Wedding Dashboard
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            {editingField === "couple" ? (
              <input
                value={coupleNamesInput}
                onChange={(e) => setCoupleNamesInput(e.target.value)}
                placeholder="e.g. Olivia & James"
                style={{ height: "40px", padding: "0 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)", fontSize: "22px", fontWeight: 700, fontFamily: N_FONT, color: "white", minWidth: "260px" }}
              />
            ) : (
              <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "white", textShadow: "0 1px 6px rgba(0,0,0,0.25)" }}>
                {coupleNames ?? "Your Wedding Plan"}
              </h2>
            )}
            {editingField === "couple" ? (
              <>
                <button type="button" onClick={() => void commitInlineEdit("couple")} disabled={savingDetails} style={{ border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.18)", borderRadius: "6px", cursor: "pointer", padding: "4px 7px", color: "white" }}><Check size={13} /></button>
                <button type="button" onClick={() => cancelInlineEdit("couple")} disabled={savingDetails} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", borderRadius: "6px", cursor: "pointer", padding: "4px 7px", color: "rgba(255,255,255,0.6)" }}><X size={13} /></button>
              </>
            ) : (
              <button type="button" onClick={() => setEditingField("couple")} style={{ border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.1)", borderRadius: "6px", cursor: "pointer", padding: "4px 7px", color: "rgba(255,255,255,0.65)" }}><Pencil size={12} /></button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <MapPin size={13} style={{ color: "rgba(255,255,255,0.55)", flexShrink: 0 }} />
            {editingField === "venue" ? (
              <>
                <input
                  value={venueInput}
                  onChange={(e) => setVenueInput(e.target.value)}
                  placeholder="e.g. The Barn, Cotswolds"
                  style={{ height: "28px", padding: "0 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)", fontSize: "13px", fontFamily: N_FONT, color: "white", minWidth: "220px" }}
                />
                <button type="button" onClick={() => void commitInlineEdit("venue")} disabled={savingDetails} style={{ border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.18)", borderRadius: "6px", cursor: "pointer", padding: "3px 6px", color: "white" }}><Check size={12} /></button>
                <button type="button" onClick={() => cancelInlineEdit("venue")} disabled={savingDetails} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", borderRadius: "6px", cursor: "pointer", padding: "3px 6px", color: "rgba(255,255,255,0.6)" }}><X size={12} /></button>
              </>
            ) : (
              <>
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.82)", fontWeight: 500 }}>{venue ?? "Add venue →"}</span>
                <button type="button" onClick={() => setEditingField("venue")} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", borderRadius: "6px", cursor: "pointer", padding: "3px 6px", color: "rgba(255,255,255,0.6)" }}><Pencil size={11} /></button>
              </>
            )}
          </div>

          {detailsError && <span style={{ fontSize: "12px", color: "#ffb3b3", marginTop: "8px" }}>{detailsError}</span>}
        </div>

        {/* Countdown ring */}
        <div style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: "16px", borderLeft: "1px solid rgba(255,255,255,0.10)" }}>
          <div
            style={{
              width: "108px",
              height: "108px",
              borderRadius: "999px",
              background: `conic-gradient(${urgencyColor} ${countdownPercent * 3.6}deg, rgba(255,255,255,0.14) 0deg)`,
              display: "grid",
              placeItems: "center",
              boxShadow: `0 0 22px ${urgencyColor}66`,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "999px",
                background: "rgba(30,8,20,0.85)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "26px", fontWeight: 800, color: urgencyColor, lineHeight: 1 }}>{countdownDays ?? "—"}</span>
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>days</span>
            </div>
          </div>

          <div style={{ minWidth: "130px" }}>
            <p style={{ margin: "0 0 4px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>Countdown</p>
            <p style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 700, color: "white", lineHeight: 1.3 }}>{countdownLabel}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
              {editingField === "days" ? (
                <>
                  <input
                    type="number"
                    min={0}
                    value={daysToGoInput}
                    onChange={(e) => setDaysToGoInput(e.target.value)}
                    placeholder="Days"
                    style={{ height: "26px", width: "80px", padding: "0 7px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.15)", fontSize: "12px", fontFamily: N_FONT, color: "white" }}
                  />
                  <button type="button" onClick={() => void commitInlineEdit("days")} disabled={savingDetails} style={{ border: "1px solid rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.18)", borderRadius: "6px", cursor: "pointer", padding: "3px 5px", color: "white" }}><Check size={12} /></button>
                  <button type="button" onClick={() => cancelInlineEdit("days")} disabled={savingDetails} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", borderRadius: "6px", cursor: "pointer", padding: "3px 5px", color: "rgba(255,255,255,0.6)" }}><X size={12} /></button>
                </>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.52)", lineHeight: 1.3 }}>
                    {weddingDate
                      ? weddingDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
                      : "Set a wedding date"}
                  </p>
                  <button type="button" onClick={() => setEditingField("days")} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", borderRadius: "6px", cursor: "pointer", padding: "3px 5px", color: "rgba(255,255,255,0.6)" }}><Pencil size={11} /></button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── STAT CARDS ───────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "10px" }}>

        {/* Location */}
        <div style={{ borderRadius: "12px", background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "1px solid #bbf7d0", padding: "14px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: "#16a34a22", marginBottom: "9px" }}>
            <MapPin size={15} style={{ color: "#16a34a" }} />
          </div>
          <p style={{ margin: "0 0 3px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#166534" }}>Location</p>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: N_FG }}>{venue ?? "Not set yet"}</p>
        </div>

        {/* Guest Plan */}
        <div style={{ borderRadius: "12px", background: "linear-gradient(135deg, #fff0f5 0%, #ffe4ed 100%)", border: "1px solid #fecdd3", padding: "14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: "#be185d22", marginBottom: "9px" }}>
              <Users size={15} style={{ color: "#be185d" }} />
            </div>
            {editingField === "guest" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <input type="number" min={0} value={guestCountInput} onChange={(e) => setGuestCountInput(e.target.value)} style={{ height: "24px", width: "68px", padding: "0 6px", borderRadius: "5px", border: `1px solid ${N_BORDER_MED}`, fontSize: "12px", fontFamily: N_FONT }} />
                <button type="button" onClick={() => void commitInlineEdit("guest")} disabled={savingDetails} style={{ border: "none", background: "#be185d22", borderRadius: "5px", cursor: "pointer", padding: "3px 5px", color: "#be185d" }}><Check size={11} /></button>
                <button type="button" onClick={() => cancelInlineEdit("guest")} disabled={savingDetails} style={{ border: "none", background: "transparent", borderRadius: "5px", cursor: "pointer", padding: "3px", color: N_SUBTLE }}><X size={11} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => setEditingField("guest")} style={{ border: "none", background: "#be185d18", borderRadius: "6px", cursor: "pointer", padding: "3px 7px", color: "#be185d", fontSize: "11px", display: "flex", alignItems: "center", gap: "3px" }}><Pencil size={10} /></button>
            )}
          </div>
          <p style={{ margin: "0 0 3px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#9d174d" }}>Guest Plan</p>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: N_FG }}>{targetGuests > 0 ? `${targetGuests} planned` : "No target set"}</p>
          <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#be185d99" }}>{trackedGuests} in guest list</p>
        </div>

        {/* Planning Timeline */}
        <div style={{ borderRadius: "12px", background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)", border: "1px solid #c4b5fd", padding: "14px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: "#7c3aed22", marginBottom: "9px" }}>
            <CalendarDays size={15} style={{ color: "#7c3aed" }} />
          </div>
          <p style={{ margin: "0 0 3px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#5b21b6" }}>Planning Timeline</p>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: N_FG }}>{timelineDb?.rows.length ?? 0} milestones</p>
        </div>

        {/* Draft Letters */}
        <div style={{ borderRadius: "12px", background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "1px solid #fde68a", padding: "14px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: "#d9770622", marginBottom: "9px" }}>
            <FileText size={15} style={{ color: "#d97706" }} />
          </div>
          <p style={{ margin: "0 0 3px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#92400e" }}>Draft Letters</p>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: N_FG }}>{documentsDb?.rows.length ?? 0} saved drafts</p>
        </div>
      </div>

      {/* ── BUDGET PANEL ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>

        {/* Budget overview */}
        <div style={{ borderRadius: "12px", background: "linear-gradient(135deg, #fff7f9 0%, #ffe4ed 100%)", border: "1px solid #fecdd3", padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: "#be185d22" }}>
                <span style={{ fontSize: "15px", fontWeight: 800, color: "#be185d" }}>£</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#9d174d" }}>Budget Overview</span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Currency: {currencyCode}
                </span>
              </div>
            </div>
            {editingField === "budget" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <input type="number" min={0} value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} style={{ height: "26px", width: "96px", padding: "0 7px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "12px", fontFamily: N_FONT }} />
                <button type="button" onClick={() => void commitInlineEdit("budget")} disabled={savingDetails} style={{ border: "none", background: "#be185d22", borderRadius: "6px", cursor: "pointer", padding: "3px 5px", color: "#be185d" }}><Check size={12} /></button>
                <button type="button" onClick={() => cancelInlineEdit("budget")} disabled={savingDetails} style={{ border: "none", background: "transparent", borderRadius: "6px", cursor: "pointer", padding: "3px", color: N_SUBTLE }}><X size={12} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => setEditingField("budget")} style={{ border: "none", background: "#be185d18", borderRadius: "6px", cursor: "pointer", padding: "3px 9px", color: "#be185d", fontSize: "11px", display: "flex", alignItems: "center", gap: "3px" }}><Pencil size={10} /> Edit</button>
            )}
          </div>

          <p style={{ margin: "0 0 1px", fontSize: "30px", fontWeight: 800, color: N_FG, letterSpacing: "-0.02em" }}>{formatCurrency(totalBudget, currencyCode)}</p>
          <p style={{ margin: "0 0 12px", fontSize: "10px", color: "#9d174d88", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total budget</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
            <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "8px", padding: "9px 11px", border: "1px solid rgba(190,24,93,0.1)" }}>
              <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: N_SUBTLE }}>Spent</p>
              <p style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#be185d" }}>{formatCurrency(totalSpent, currencyCode)}</p>
              <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "3px" }}>
                <p style={{ margin: 0, fontSize: "10px", color: N_SUBTLE }}>
                  Guest plan: {formatCurrency(guestSpend, currencyCode)}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "10px",
                    fontWeight: 700,
                    color: hasAddedExpenses ? "#6d28d9" : N_SUBTLE,
                    background: hasAddedExpenses ? "rgba(109,40,217,0.12)" : "transparent",
                    borderRadius: "999px",
                    padding: hasAddedExpenses ? "2px 8px" : "0",
                    width: "fit-content",
                  }}
                >
                  Added expenses: {formatCurrency(budgetTotalsSpend, currencyCode)}
                </p>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "8px", padding: "9px 11px", border: "1px solid rgba(21,128,61,0.12)" }}>
              <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: N_SUBTLE }}>Remaining</p>
              <p style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: remainingBudget !== null && remainingBudget < 0 ? "rgb(220,38,38)" : "#15803d" }}>
                {remainingBudget === null ? "—" : formatCurrency(remainingBudget, currencyCode)}
              </p>
            </div>
          </div>

          {totalBudget !== null && totalBudget > 0 && (
            <>
              <div style={{ height: "9px", borderRadius: "999px", background: "rgba(190,24,93,0.1)", overflow: "hidden", marginBottom: "5px" }}>
                <div style={{ height: "100%", width: `${budgetUsedPercent}%`, background: budgetUsedPercent >= 100 ? "rgb(220,38,38)" : "linear-gradient(90deg, #be185d, #e11d74)", borderRadius: "999px", transition: "width 0.4s ease" }} />
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "#9d174d", fontWeight: 600 }}>{budgetUsedPercent}% of budget used</p>
            </>
          )}
        </div>

        {/* Guest cost planner */}
        <div style={{ borderRadius: "12px", background: "white", border: `1px solid ${N_BORDER_MED}`, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG }}>Guest Cost Planner</span>
            {editingField === "costPerGuest" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <input type="number" min={0} value={costPerGuestInput} onChange={(e) => setCostPerGuestInput(e.target.value)} style={{ height: "26px", width: "76px", padding: "0 7px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "12px", fontFamily: N_FONT }} />
                <button type="button" onClick={() => void commitInlineEdit("costPerGuest")} disabled={savingDetails} style={{ border: "none", background: N_ACTIVE, borderRadius: "6px", cursor: "pointer", padding: "3px 5px", color: N_FG }}><Check size={12} /></button>
                <button type="button" onClick={() => cancelInlineEdit("costPerGuest")} disabled={savingDetails} style={{ border: "none", background: "transparent", borderRadius: "6px", cursor: "pointer", padding: "3px", color: N_SUBTLE }}><X size={12} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => setEditingField("costPerGuest")} style={{ border: "none", background: N_ACTIVE, borderRadius: "6px", cursor: "pointer", padding: "3px 9px", color: N_SUBTLE, fontSize: "11px", display: "flex", alignItems: "center", gap: "3px" }}><Pencil size={10} /> Edit</button>
            )}
          </div>

          <div style={{ background: "rgba(55,53,47,0.04)", borderRadius: "10px", padding: "10px 13px", marginBottom: "12px", border: `1px solid ${N_BORDER}` }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ fontSize: "12px", color: N_SUBTLE, fontWeight: 600 }}>Per guest</span>
              <span style={{ fontSize: "22px", fontWeight: 800, color: N_FG, letterSpacing: "-0.02em" }}>{formatCurrency(costPerGuest, currencyCode)}</span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: N_MUTED }}>
              {targetGuests} guests × {formatCurrency(costPerGuest, currencyCode)} = <strong style={{ color: N_FG }}>{formatCurrency(guestSpend, currencyCode)}</strong>
            </p>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: N_SUBTLE }}>Guest Scenario</span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG }}>{guestScenarioCount} guests</span>
            </div>
            <input
              type="range"
              min={50}
              max={200}
              step={1}
              value={guestScenarioCount}
              onChange={(e) => setGuestScenarioCount(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#be185d" }}
            />
            <div style={{ marginTop: "7px", padding: "9px 11px", borderRadius: "9px", background: scenarioDelta > 0 ? "#fff0f5" : scenarioDelta < 0 ? "#f0fdf4" : "rgba(55,53,47,0.04)", border: `1px solid ${scenarioDelta > 0 ? "#fecdd3" : scenarioDelta < 0 ? "#bbf7d0" : N_BORDER}` }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: N_SUBTLE }}>Projected spend</span>
                <span style={{ fontSize: "16px", fontWeight: 800, color: N_FG }}>{formatCurrency(scenarioSpend, currencyCode)}</span>
              </div>
              {scenarioDelta !== 0 && (
                <p style={{ margin: "3px 0 0", fontSize: "11px", fontWeight: 700, color: scenarioDelta > 0 ? "#be185d" : "#15803d" }}>
                  {scenarioDelta > 0 ? "▲" : "▼"} {formatCurrency(Math.abs(scenarioDelta), currencyCode)} {scenarioDelta > 0 ? "more" : "less"} than current plan
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── TABLE PLAN ───────────────────────────────────────────────────── */}
      <section
        style={{
          borderRadius: "12px",
          background: seatingStarted ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" : "linear-gradient(135deg, #fafafa 0%, #f3f4f6 100%)",
          border: seatingStarted ? "1px solid #86efac" : `1px solid ${N_BORDER_MED}`,
          padding: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", borderRadius: "10px", background: seatingStarted ? "#16a34a22" : "rgba(55,53,47,0.06)" }}>
              <ListChecks size={16} style={{ color: seatingStarted ? "#16a34a" : N_SUBTLE }} />
            </div>
            <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG }}>Table Plan</span>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, color: seatingStarted ? "#15803d" : N_SUBTLE, background: seatingStarted ? "#dcfce7" : "rgba(55,53,47,0.06)", borderRadius: "999px", padding: "4px 12px" }}>
            <CheckCircle2 size={12} />
            {seatingStarted ? "In progress" : "Not started"}
          </span>
        </div>

        <div style={{ height: "10px", borderRadius: "999px", background: seatingStarted ? "#86efac44" : "rgba(55,53,47,0.08)", overflow: "hidden", marginBottom: "7px" }}>
          <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, seatingProgress))}%`, background: "linear-gradient(90deg, #16a34a, #22c55e)", borderRadius: "999px", transition: "width 0.4s ease" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: "12px", color: seatingStarted ? "#166534" : N_MUTED }}>
            {seatedGuests} of {trackedGuests} guests assigned to tables
          </p>
          {trackedGuests > 0 && (
            <span style={{ fontSize: "13px", fontWeight: 800, color: seatingStarted ? "#16a34a" : N_SUBTLE }}>{seatingProgress}%</span>
          )}
        </div>
      </section>
    </div>
  );
}

function WeddingDraftStudio({
  db,
  onRowAdded,
}: {
  db: WorkspaceDatabase;
  onRowAdded: (row: WorkspaceRow) => void;
}) {
  const [recipient, setRecipient] = useState("");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("photography quote enquiry");
  const [tone, setTone] = useState("Warm and professional");
  const [keyPoints, setKeyPoints] = useState("");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [draft, setDraft] = useState<DraftPayload | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/members/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient,
          purpose,
          tone,
          keyPoints,
          extraInstructions,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        draft?: DraftPayload;
        error?: string;
      };
      if (!res.ok || !body.draft) {
        throw new Error(body.error ?? "Failed to generate draft");
      }
      setDraft(body.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate draft");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const properties: Record<string, string | number | boolean | null> = {};
    const propertyTypes: Record<string, string> = {};

    const titleName = findPropertyName(db.properties, ["Title"]);
    const typeName = findPropertyName(db.properties, ["Type"]);
    const createdName = findPropertyName(db.properties, ["Created"]);
    const recipientName = findPropertyName(db.properties, ["Recipient"]);
    const emailName = findPropertyName(db.properties, ["Email"]);
    const summaryName = findPropertyName(db.properties, ["Summary"]);
    const subjectName = findPropertyName(db.properties, ["Subject", "Email Subject"]);
    const bodyName = findPropertyName(db.properties, ["Body", "Content", "Draft", "Email Body"]);

    if (titleName) {
      properties[titleName] = draft.title.trim() || "Email Draft";
      propertyTypes[titleName] = "title";
    }
    if (typeName) {
      properties[typeName] = draft.type || "Vendor Enquiry";
      propertyTypes[typeName] = "select";
    }
    if (createdName) {
      properties[createdName] = new Date().toISOString().slice(0, 10);
      propertyTypes[createdName] = "date";
    }
    if (recipientName) {
      properties[recipientName] = recipient || "Vendor";
      propertyTypes[recipientName] = "rich_text";
    }
    if (emailName) {
      properties[emailName] = email.trim();
      propertyTypes[emailName] = "email";
    }
    if (summaryName) {
      properties[summaryName] = draft.summary || draft.body.slice(0, 240);
      propertyTypes[summaryName] = "rich_text";
    }
    if (subjectName) {
      properties[subjectName] = draft.subject;
      propertyTypes[subjectName] = "rich_text";
    }
    if (bodyName) {
      properties[bodyName] = draft.body;
      propertyTypes[bodyName] = "rich_text";
    }

    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: db.notionId,
          properties,
          propertyTypes,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { pageId?: string; error?: string };
      if (!res.ok || !body.pageId) {
        throw new Error(body.error ?? "Failed to save draft");
      }

      onRowAdded({ pageId: body.pageId, properties });
      setSuccess("Draft saved to workspace.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        border: `1px solid ${N_BORDER}`,
        borderRadius: "8px",
        background: "#fff9f8",
        padding: "16px",
        marginBottom: "14px",
      }}
    >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <WandSparkles size={16} color="#be185d" />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#6b2040" }}>
              ✍️ AI Draft Studio
            </h3>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
        </div>
        </div>
        <p style={{ margin: "0 0 12px", fontSize: "13px", color: N_MUTED, lineHeight: 1.5 }}>
          Create reusable wedding outreach emails, edit them, then save to this Documents database for future reuse.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Recipient (e.g. Bloom Wedding Photography)"
          style={{ padding: "8px", fontSize: "13px", border: `1px solid ${N_BORDER_MED}`, borderRadius: "4px", fontFamily: N_FONT }}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address (e.g. hello@vendor.com)"
          type="email"
          style={{ padding: "8px", fontSize: "13px", border: `1px solid ${N_BORDER_MED}`, borderRadius: "4px", fontFamily: N_FONT }}
        />
        <input
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Purpose (e.g. request pricing + availability)"
          style={{ padding: "8px", fontSize: "13px", border: `1px solid ${N_BORDER_MED}`, borderRadius: "4px", fontFamily: N_FONT }}
        />
        <input
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          placeholder="Tone"
          style={{ padding: "8px", fontSize: "13px", border: `1px solid ${N_BORDER_MED}`, borderRadius: "4px", fontFamily: N_FONT }}
        />
        <input
          value={keyPoints}
          onChange={(e) => setKeyPoints(e.target.value)}
          placeholder="Key points to include"
          style={{ padding: "8px", fontSize: "13px", border: `1px solid ${N_BORDER_MED}`, borderRadius: "4px", fontFamily: N_FONT }}
        />
      </div>

      <textarea
        value={extraInstructions}
        onChange={(e) => setExtraInstructions(e.target.value)}
        placeholder="Extra instructions (optional)"
        rows={2}
        style={{ width: "100%", padding: "8px", fontSize: "13px", border: `1px solid ${N_BORDER_MED}`, borderRadius: "4px", fontFamily: N_FONT, marginBottom: "10px", boxSizing: "border-box" }}
      />

      <div style={{ display: "flex", gap: "8px", marginBottom: draft ? "12px" : 0 }}>
        <button
          onClick={() => void handleGenerate()}
          disabled={generating || !purpose.trim()}
          style={{
            padding: "8px 12px",
            borderRadius: "4px",
            border: "none",
            background: generating ? "rgba(190,24,93,0.2)" : "linear-gradient(135deg, #6b2040, #be185d)",
            color: "white",
            fontSize: "13px",
            fontWeight: 600,
            fontFamily: N_FONT,
            cursor: generating ? "default" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {generating ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <WandSparkles size={13} />}
          {generating ? "Generating..." : "Generate Draft"}
        </button>
      </div>

      {draft && (
        <div style={{ borderTop: `1px solid ${N_BORDER}`, paddingTop: "10px" }}>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Title"
            style={{ width: "100%", padding: "8px", fontSize: "13px", border: `1px solid ${N_BORDER_MED}`, borderRadius: "4px", fontFamily: N_FONT, marginBottom: "8px", boxSizing: "border-box" }}
          />
          <input
            value={draft.subject}
            onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            placeholder="Email Subject"
            style={{ width: "100%", padding: "8px", fontSize: "13px", border: `1px solid ${N_BORDER_MED}`, borderRadius: "4px", fontFamily: N_FONT, marginBottom: "8px", boxSizing: "border-box" }}
          />
          <textarea
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            placeholder="Draft body"
            rows={10}
            style={{ width: "100%", padding: "8px", fontSize: "13px", border: `1px solid ${N_BORDER_MED}`, borderRadius: "4px", fontFamily: N_FONT, marginBottom: "8px", boxSizing: "border-box", lineHeight: 1.5 }}
          />
          <textarea
            value={draft.summary}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            placeholder="Short summary"
            rows={2}
            style={{ width: "100%", padding: "8px", fontSize: "13px", border: `1px solid ${N_BORDER_MED}`, borderRadius: "4px", fontFamily: N_FONT, marginBottom: "8px", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => void handleSave()}
              disabled={saving || !draft.body.trim()}
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                border: `1px solid ${N_BORDER_MED}`,
                background: "white",
                color: "#6b2040",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: N_FONT,
                cursor: saving ? "default" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              {saving ? "Saving..." : "Save to Workspace"}
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ margin: "10px 0 0", color: "rgb(220,38,38)", fontSize: "12px" }}>{error}</p>}
      {success && <p style={{ margin: "10px 0 0", color: "rgb(15,123,108)", fontSize: "12px" }}>{success}</p>}
    </div>
  );
}

// ─── Main workspace page component ────────────────────────────────────────────
export default function WorkspacePage() {
  const searchParams = useSearchParams();
  const nicheIdParam = searchParams.get("nicheId");
  const dbIdParam = searchParams.get("dbId");

  const [databases, setDatabases] = useState<WorkspaceDatabase[]>([]);
  const [backend, setBackend] = useState<"app" | "notion">("notion");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedNiches, setExpandedNiches] = useState<Set<string>>(new Set());

  const [weddingCriteria, setWeddingCriteria] = useState<Record<string, unknown> | null>(null);

  function applyRequestedSelection(
    nextDatabases: WorkspaceDatabase[],
    nextBackend: "app" | "notion" = backend,
  ) {
    const requestedDb = nextDatabases.find((d) =>
      (nicheIdParam ? d.nicheId === nicheIdParam : true) &&
      (dbIdParam ? d.dbId === dbIdParam : true),
    );

    if (requestedDb) {
      setActiveTab(requestedDb.notionId);
      return;
    }

    const hasWeddingWorkspace = nextDatabases.some((d) => d.nicheId === "wedding-planner");
    if (!nicheIdParam && !dbIdParam && nextBackend === "app" && hasWeddingWorkspace) {
      setActiveTab((prev) => (prev ? prev : DASHBOARD_TAB_ID));
      return;
    }

    if (nextDatabases.length > 0) {
      setActiveTab((prev) => {
        if (prev === DASHBOARD_TAB_ID && nextBackend === "app" && hasWeddingWorkspace) return prev;
        if (prev === SEATING_TAB_ID && nextBackend === "app" && hasWeddingWorkspace) return prev;
        if (prev === DRAFT_TAB_ID && nextBackend === "app" && hasWeddingWorkspace) return prev;
        if (prev && nextDatabases.some((d) => d.notionId === prev)) return prev;
        return nextDatabases[0]!.notionId;
      });
    }
  }

  async function loadDatabases(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/members/workspace");
      if (!res.ok) throw new Error("Failed to load workspace data");
      const data = (await res.json()) as WorkspaceResponse;
      setDatabases(data.databases);
      setBackend(data.backend);
      setWeddingCriteria(data.weddingCriteria ?? null);

      // Auto-expand all niches and select first tab
      const nicheIds = [...new Set(data.databases.map((d) => d.nicheId))];
      setExpandedNiches(new Set(nicheIds));
      applyRequestedSelection(data.databases, data.backend);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setWeddingCriteria(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDatabases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (databases.length === 0) return;
    // Only re-apply URL-based selection when URL params exist.
    // This prevents row edits/adds from snapping back to the originally requested db.
    if (!nicheIdParam && !dbIdParam) return;
    applyRequestedSelection(databases, backend);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nicheIdParam, dbIdParam, backend]);

  useEffect(() => {
    if (activeTab !== DASHBOARD_TAB_ID) return;
    void loadDatabases(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  function handleRowUpdated(dbNotionId: string, pageId: string, name: string, val: string | number | boolean | null) {
    setDatabases((prev) =>
      prev.map((db) =>
        db.notionId !== dbNotionId
          ? db
          : {
              ...db,
              rows: db.rows.map((r) =>
                r.pageId !== pageId ? r : { ...r, properties: { ...r.properties, [name]: val } },
              ),
            },
      ),
    );
  }

  function handleRowDeleted(dbNotionId: string, pageId: string) {
    setDatabases((prev) =>
      prev.map((db) =>
        db.notionId !== dbNotionId
          ? db
          : { ...db, rows: db.rows.filter((r) => r.pageId !== pageId) },
      ),
    );
  }

  function handleRowAdded(dbNotionId: string, row: WorkspaceRow) {
    setDatabases((prev) =>
      prev.map((db) =>
        db.notionId !== dbNotionId ? db : { ...db, rows: [...db.rows, row] },
      ),
    );
  }

  // Group databases by niche
  const nicheGroups: Array<{ nicheId: string; nicheName: string; dbs: WorkspaceDatabase[] }> = [];
  for (const db of databases) {
    const existing = nicheGroups.find((g) => g.nicheId === db.nicheId);
    if (existing) {
      existing.dbs.push(db);
    } else {
      nicheGroups.push({ nicheId: db.nicheId, nicheName: db.nicheName, dbs: [db] });
    }
  }

  const activeDb = databases.find((d) => d.notionId === activeTab);
  const guestsDb = databases.find((d) => d.nicheId === "wedding-planner" && d.dbId === "guests") ?? null;
  const documentsDb = databases.find((d) => d.nicheId === "wedding-planner" && d.dbId === "documents") ?? null;
  const hasWeddingWorkspace = databases.some((d) => d.nicheId === "wedding-planner");
  const activeDbDisplay = activeDb && backend === "app" && activeDb.nicheId === "wedding-planner" && activeDb.dbId === "documents"
    ? {
        ...activeDb,
        properties: activeDb.properties.some((p) => p.name === "Email")
          ? activeDb.properties
          : [...activeDb.properties, { id: "Email", name: "Email", type: "email" }],
      }
    : activeDb;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: N_FONT }}>

      {/* ── Left sidebar: database list ───────────────────────────────────── */}
      <div
        style={{
          width: "220px",
          flexShrink: 0,
          borderRight: `1px solid ${N_BORDER}`,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #fff9f8 0%, #fef0f1 100%)",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "14px 14px 10px",
            borderBottom: `1px solid ${N_BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#6b2040", letterSpacing: "0.01em" }}>💍 My Workspace</span>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Link
              href="/templates"
              title="Browse niches"
              style={{
                display: "flex",
                alignItems: "center",
                padding: "3px 7px",
                borderRadius: "3px",
                fontSize: "12px",
                color: N_MUTED,
                background: "none",
                border: `1px solid ${N_BORDER_MED}`,
                textDecoration: "none",
                gap: "3px",
                fontFamily: N_FONT,
              }}
            >
              <Plus size={11} />
              Add niche
            </Link>
            <button
              onClick={() => void loadDatabases(true)}
              disabled={refreshing}
              title="Refresh"
              style={{
                background: "none",
                border: "none",
                cursor: refreshing ? "default" : "pointer",
                padding: "3px",
                color: N_SUBTLE,
                display: "flex",
                alignItems: "center",
              }}
            >
              <RefreshCw
                size={13}
                style={refreshing ? { animation: "spin 1s linear infinite" } : undefined}
              />
            </button>
          </div>
        </div>



        {loading && (
          <div style={{ padding: "16px", display: "flex", alignItems: "center", gap: "8px", color: N_MUTED, fontSize: "13px" }}>
            <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
            Loading…
          </div>
        )}

        {!loading && databases.length === 0 && (
          <div style={{ padding: "12px 10px" }}>
            <p style={{ fontSize: "12px", color: N_MUTED, lineHeight: 1.5, margin: "0 0 10px" }}>
              No niches deployed yet.
            </p>
            <Link
              href="/templates"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                padding: "7px 10px",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: 600,
                color: "white",
                background: N_FG,
                textDecoration: "none",
                fontFamily: N_FONT,
              }}
            >
              <Plus size={13} />
              Set up a niche
            </Link>
          </div>
        )}

        {nicheGroups.map((group) => {
          const expanded = expandedNiches.has(group.nicheId);
          return (
            <div key={group.nicheId}>
              <button
                onClick={() =>
                  setExpandedNiches((prev) => {
                    const next = new Set(prev);
                    if (next.has(group.nicheId)) next.delete(group.nicheId);
                    else next.add(group.nicheId);
                    return next;
                  })
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  width: "100%",
                  padding: "7px 10px 5px",
                  background: group.nicheId === "wedding-planner" ? "rgba(190,24,93,0.06)" : "none",
                  border: "none",
                  borderTop: group.nicheId === "wedding-planner" ? "1px solid rgba(190,24,93,0.12)" : "none",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: group.nicheId === "wedding-planner" ? "#9d174d" : N_SUBTLE,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontFamily: N_FONT,
                  textAlign: "left",
                }}
              >
                {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                {group.nicheId === "wedding-planner" ? "🌸 " : ""}{group.nicheName}
              </button>

              {expanded && backend === "app" && group.nicheId === "wedding-planner" && (
                <button
                  onClick={() => setActiveTab(DASHBOARD_TAB_ID)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    width: "100%",
                    padding: "6px 10px 6px 20px",
                    background: activeTab === DASHBOARD_TAB_ID ? "rgba(190,24,93,0.12)" : "none",
                    border: "none",
                    borderLeft: activeTab === DASHBOARD_TAB_ID ? "2px solid #be185d" : "2px solid transparent",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: activeTab === DASHBOARD_TAB_ID ? "#9d174d" : N_FG,
                    fontFamily: N_FONT,
                    textAlign: "left",
                    borderRadius: "0 4px 4px 0",
                    fontWeight: activeTab === DASHBOARD_TAB_ID ? 600 : 400,
                  }}
                  className="hover:bg-[rgba(190,24,93,0.06)]"
                >
                  <LayoutDashboard size={13} style={{ color: activeTab === DASHBOARD_TAB_ID ? "#be185d" : N_SUBTLE, flexShrink: 0 }} />
                  Dashboard
                </button>
              )}
              {expanded &&
                group.dbs.map((db) => {
                  const active = activeTab === db.notionId;
                  const isPlanningTimetable = /planning\s*(timetable|timeline)/i.test(db.dbName);
                  return (
                    <div key={db.notionId}>
                      <button
                        onClick={() => setActiveTab(db.notionId)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "7px",
                          width: "100%",
                          padding: "5px 10px 5px 20px",
                          background: active ? (group.nicheId === "wedding-planner" ? "rgba(190,24,93,0.10)" : N_ACTIVE) : "none",
                          border: "none",
                          borderLeft: group.nicheId === "wedding-planner" ? (active ? "2px solid #be185d" : "2px solid transparent") : "none",
                          cursor: "pointer",
                          fontSize: "13px",
                          color: active && group.nicheId === "wedding-planner" ? "#9d174d" : N_FG,
                          fontFamily: N_FONT,
                          textAlign: "left",
                          borderRadius: "0 4px 4px 0",
                        }}
                        className={group.nicheId === "wedding-planner" ? "hover:bg-[rgba(190,24,93,0.06)]" : "hover:bg-[rgba(55,53,47,0.06)]"}
                      >
                        <span style={{ fontSize: "14px", flexShrink: 0 }}>
                          {db.icon ?? "📋"}
                        </span>
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontWeight: active ? 500 : 400,
                          }}
                        >
                          {db.dbName}
                        </span>
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: "11px",
                            color: N_SUBTLE,
                            flexShrink: 0,
                          }}
                        >
                          {db.rows.length}
                        </span>
                      </button>

                      {backend === "app" && group.nicheId === "wedding-planner" && isPlanningTimetable && (
                        <>
                          <button
                            onClick={() => setActiveTab(SEATING_TAB_ID)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "7px",
                              width: "100%",
                              padding: "5px 10px 5px 20px",
                              borderRadius: "0 4px 4px 0",
                              border: "none",
                              borderLeft: activeTab === SEATING_TAB_ID ? "2px solid #be185d" : "2px solid transparent",
                              fontSize: "13px",
                              color: activeTab === SEATING_TAB_ID ? "#9d174d" : N_FG,
                              background: activeTab === SEATING_TAB_ID ? "rgba(190,24,93,0.10)" : "none",
                              fontFamily: N_FONT,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                            className="hover:bg-[rgba(190,24,93,0.06)]"
                          >
                            <span style={{ fontSize: "14px", flexShrink: 0 }}>🪑</span>
                            Seating Planner
                          </button>
                          <button
                            onClick={() => setActiveTab(DRAFT_TAB_ID)}
                            disabled={!documentsDb}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "7px",
                              width: "100%",
                              padding: "5px 10px 5px 20px",
                              borderRadius: "0 4px 4px 0",
                              border: "none",
                              borderLeft: activeTab === DRAFT_TAB_ID ? "2px solid #be185d" : "2px solid transparent",
                              fontSize: "13px",
                              color: activeTab === DRAFT_TAB_ID ? "#9d174d" : N_FG,
                              background: activeTab === DRAFT_TAB_ID ? "rgba(190,24,93,0.10)" : "none",
                              fontFamily: N_FONT,
                              cursor: documentsDb ? "pointer" : "default",
                              textAlign: "left",
                              opacity: documentsDb ? 1 : 0.5,
                            }}
                            className="hover:bg-[rgba(190,24,93,0.06)]"
                          >
                            <span style={{ fontSize: "14px", flexShrink: 0 }}>✍️</span>
                            Draft Letters
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {loading ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              color: N_MUTED,
              fontSize: "14px",
            }}
          >
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            Loading your databases from Notion…
          </div>
        ) : error ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "12px",
              padding: "40px",
            }}
          >
            <p style={{ fontSize: "15px", color: "rgb(220,38,38)", fontWeight: 500 }}>
              {error}
            </p>
            <button
              onClick={() => void loadDatabases()}
              style={{
                padding: "6px 16px",
                borderRadius: "4px",
                border: `1px solid ${N_BORDER_MED}`,
                background: "white",
                fontSize: "13px",
                color: N_FG,
                cursor: "pointer",
                fontFamily: N_FONT,
              }}
            >
              Try again
            </button>
          </div>
        ) : databases.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "12px",
              padding: "60px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "48px" }}>📂</span>
            <p style={{ fontSize: "20px", fontWeight: 700, color: N_FG, margin: 0 }}>
              No niches set up yet
            </p>
            <p style={{ fontSize: "14px", color: N_MUTED, maxWidth: "340px", lineHeight: 1.6, margin: 0 }}>
              Browse the template library, pick a niche, and deploy it to your workspace in one click.
            </p>
            <Link
              href="/templates"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                marginTop: "4px",
                padding: "10px 22px",
                borderRadius: "5px",
                fontSize: "15px",
                fontWeight: 600,
                color: "white",
                background: N_FG,
                textDecoration: "none",
                fontFamily: N_FONT,
              }}
            >
              <Plus size={15} />
              Browse niches
            </Link>
          </div>
        ) : activeTab === DASHBOARD_TAB_ID ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
            <WeddingWorkspaceDashboard
              databases={databases}
              weddingCriteria={weddingCriteria}
              onWeddingCriteriaUpdated={(criteria) => setWeddingCriteria(criteria)}
            />
          </div>
        ) : activeTab === SEATING_TAB_ID ? (
          <SeatingPlannerView guestsDb={guestsDb} embedded />
        ) : activeTab === DRAFT_TAB_ID ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
            {documentsDb ? (
              <WeddingDraftStudio
                db={documentsDb}
                onRowAdded={(row) => handleRowAdded(documentsDb.notionId, row)}
              />
            ) : (
              <div
                style={{
                  border: `1px solid ${N_BORDER}`,
                  borderRadius: "8px",
                  background: "#fff9f8",
                  padding: "16px",
                  color: N_MUTED,
                  fontSize: "13px",
                }}
              >
                Draft Letters needs the Documents database to be available.
              </div>
            )}
          </div>
        ) : !activeDbDisplay ? null : (
          <>
            {/* Header */}
            <div
              style={{
                padding: "16px 24px 12px",
                borderBottom: `1px solid ${N_BORDER}`,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexShrink: 0,
                background: activeDbDisplay.nicheId === "wedding-planner"
                  ? "linear-gradient(135deg, #fff9f8 0%, #fef0f3 100%)"
                  : "white",
              }}
            >
              <span style={{ fontSize: "20px" }}>{activeDbDisplay.icon ?? "📋"}</span>
              <div style={{ flex: 1 }}>
                <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: N_FG }}>
                  {activeDbDisplay.dbName}
                </h1>
                <p style={{ margin: 0, fontSize: "12px", color: N_MUTED }}>
                  {activeDbDisplay.nicheName} · {activeDbDisplay.rows.length} row{activeDbDisplay.rows.length !== 1 ? "s" : ""}
                  {activeDbDisplay.hasMore ? "+" : ""}
                </p>
              </div>
              {backend === "notion" && (
                <a
                  href={`https://notion.so/${activeDbDisplay.notionId.replace(/-/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "5px 12px",
                    borderRadius: "4px",
                    fontSize: "13px",
                    color: N_MUTED,
                    textDecoration: "none",
                    border: `1px solid ${N_BORDER_MED}`,
                    background: "white",
                    flexShrink: 0,
                  }}
                >
                  Open in Notion
                  <ExternalLink size={12} />
                </a>
              )}
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              <DatabaseTable
                db={activeDbDisplay}
                isAppBackend={backend === "app"}
                onRowUpdated={(pageId, name, val) =>
                  handleRowUpdated(activeDbDisplay.notionId, pageId, name, val)
                }
                onRowDeleted={(pageId) => handleRowDeleted(activeDbDisplay.notionId, pageId)}
                onRowAdded={(row) => handleRowAdded(activeDbDisplay.notionId, row)}
              />
            </div>
          </>
        )}

      </div>
    </div>
  );
}
