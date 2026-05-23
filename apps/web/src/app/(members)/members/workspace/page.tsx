"use client";

import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Trash2, ExternalLink, RefreshCw, ChevronDown, ChevronRight, WandSparkles, SlidersHorizontal, Mail } from "lucide-react";
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

interface SeatingGuest {
  id: string;
  name: string;
}

interface SeatingTable {
  id: string;
  name: string;
  number: number;
  seats: number;
  shape: "round" | "rectangle";
  x: number;
  y: number;
  guestIds: string[];
}

function findPropertyName(props: WorkspaceProperty[], candidates: string[]): string | null {
  const map = new Map(props.map((p) => [p.name.toLowerCase(), p.name]));
  for (const c of candidates) {
    const match = map.get(c.toLowerCase());
    if (match) return match;
  }
  return null;
}

function getGuestDisplayName(row: WorkspaceRow): string {
  const candidates = ["Full Name", "Guest Name", "Name", "Title"];
  for (const key of candidates) {
    const val = row.properties[key];
    if (typeof val === "string" && val.trim().length > 0) return val.trim();
  }
  for (const val of Object.values(row.properties)) {
    if (typeof val === "string" && val.trim().length > 0) return val.trim();
  }
  return "Guest";
}

function WeddingSeatingPlanner({
  db,
  onRowUpdated,
}: {
  db: WorkspaceDatabase;
  onRowUpdated: (pageId: string, name: string, val: string | number | boolean | null) => void;
}) {
  const ROOM_WIDTH = 1200;
  const ROOM_HEIGHT = 780;
  const GRID_SIZE = 24;

  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const dragStateRef = useRef<{ tableId: string; offsetX: number; offsetY: number } | null>(null);
  const roomRef = useRef<HTMLDivElement | null>(null);

  const storageKey = `wedding.seating.${db.notionId}`;
  const tableFieldName = findPropertyName(db.properties, ["Table", "Table Number", "Table Assignment"]);

  const guests: SeatingGuest[] = db.rows.map((row) => ({
    id: row.pageId,
    name: getGuestDisplayName(row),
  }));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setTables([]);
        setSelectedTableId(null);
        return;
      }
      const parsed = JSON.parse(raw) as { tables?: SeatingTable[]; zoom?: number; snapToGrid?: boolean };
      const next = Array.isArray(parsed.tables) ? parsed.tables : [];
      const cleaned = next.map((t) => ({
        id: t.id,
        name: t.name || `Table ${t.number}`,
        number: Number.isFinite(t.number) ? Math.max(1, Math.round(t.number)) : 1,
        seats: Number.isFinite(t.seats) ? Math.max(1, Math.round(t.seats)) : 8,
        shape: t.shape === "rectangle" ? "rectangle" : "round",
        x: Number.isFinite(t.x) ? t.x : 20,
        y: Number.isFinite(t.y) ? t.y : 20,
        guestIds: Array.isArray(t.guestIds) ? t.guestIds.filter((id) => guests.some((g) => g.id === id)) : [],
      }));
      setTables(cleaned);
      setZoom(
        typeof parsed.zoom === "number" && Number.isFinite(parsed.zoom)
          ? Math.min(180, Math.max(60, Math.round(parsed.zoom)))
          : 100,
      );
      setSnapToGrid(typeof parsed.snapToGrid === "boolean" ? parsed.snapToGrid : true);
      setSelectedTableId(cleaned[0]?.id ?? null);
    } catch {
      setTables([]);
      setSelectedTableId(null);
      setZoom(100);
      setSnapToGrid(true);
    }
  }, [storageKey, db.rows]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ tables, zoom, snapToGrid }));
    } catch {
      // Ignore storage failures.
    }
  }, [storageKey, tables, zoom, snapToGrid]);

  useEffect(() => {
    if (tables.length === 0) {
      if (selectedTableId !== null) setSelectedTableId(null);
      return;
    }
    if (selectedTableId !== null && tables.some((t) => t.id === selectedTableId)) return;
    setSelectedTableId(tables[0]!.id);
  }, [tables, selectedTableId]);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const room = roomRef.current;
      if (!room) return;
      const rect = room.getBoundingClientRect();
      const zoomScale = zoom / 100;
      const roomX = (event.clientX - rect.left) / zoomScale;
      const roomY = (event.clientY - rect.top) / zoomScale;

      setTables((prev) =>
        prev.map((table) => {
          if (table.id !== drag.tableId) return table;
          const rawX = Math.max(0, Math.min(ROOM_WIDTH - 170, roomX - drag.offsetX));
          const rawY = Math.max(0, Math.min(ROOM_HEIGHT - 130, roomY - drag.offsetY));

          const x = snapToGrid ? Math.round(rawX / GRID_SIZE) * GRID_SIZE : rawX;
          const y = snapToGrid ? Math.round(rawY / GRID_SIZE) * GRID_SIZE : rawY;

          return {
            ...table,
            x,
            y,
          };
        }),
      );
    };

    const handleUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [zoom, snapToGrid]);

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;
  const zoomScale = zoom / 100;

  const guestById = new Map(guests.map((g) => [g.id, g]));
  const assignedGuestIds = new Set<string>();
  for (const table of tables) {
    for (const guestId of table.guestIds) assignedGuestIds.add(guestId);
  }
  const unseatedGuests = guests.filter((guest) => !assignedGuestIds.has(guest.id));
  const overCapacityTables = tables.filter((table) => table.guestIds.length > table.seats);

  function normalizeTableLabel(table: SeatingTable): string {
    return table.name.trim().length > 0 ? table.name.trim() : `Table ${table.number}`;
  }

  function buildSvgMarkup(): string {
    const esc = (input: string) =>
      input
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

    const tableNodes = tables
      .map((table) => {
        const label = normalizeTableLabel(table);
        const assignedNames = table.guestIds
          .map((id) => guestById.get(id)?.name)
          .filter((n): n is string => typeof n === "string");
        const guestLines = assignedNames.slice(0, 4).map((name) => esc(name));
        const moreCount = Math.max(0, assignedNames.length - guestLines.length);

        if (table.shape === "rectangle") {
          return `
            <g transform="translate(${table.x},${table.y})">
              <rect x="0" y="0" width="170" height="110" rx="10" fill="#ffffff" stroke="#d6d3ce" />
              <text x="12" y="18" font-size="12" font-family="Arial, sans-serif" fill="#37352f" font-weight="700">#${table.number}</text>
              <text x="12" y="35" font-size="12" font-family="Arial, sans-serif" fill="#37352f">${esc(label)}</text>
              <text x="12" y="51" font-size="11" font-family="Arial, sans-serif" fill="#6b6862">${table.guestIds.length}/${table.seats} seated</text>
              ${guestLines
                .map((line, idx) => `<text x="12" y="${68 + idx * 12}" font-size="10" font-family="Arial, sans-serif" fill="#6b6862">${line}</text>`)
                .join("")}
              ${moreCount > 0 ? `<text x="12" y="106" font-size="10" font-family="Arial, sans-serif" fill="#6b6862">+${moreCount} more</text>` : ""}
            </g>
          `;
        }

        return `
          <g transform="translate(${table.x},${table.y})">
            <circle cx="85" cy="55" r="54" fill="#ffffff" stroke="#d6d3ce" />
            <text x="85" y="28" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" fill="#37352f" font-weight="700">#${table.number}</text>
            <text x="85" y="44" text-anchor="middle" font-size="11" font-family="Arial, sans-serif" fill="#37352f">${esc(label)}</text>
            <text x="85" y="58" text-anchor="middle" font-size="10" font-family="Arial, sans-serif" fill="#6b6862">${table.guestIds.length}/${table.seats}</text>
            ${guestLines
              .map((line, idx) => `<text x="85" y="${72 + idx * 11}" text-anchor="middle" font-size="9" font-family="Arial, sans-serif" fill="#6b6862">${line}</text>`)
              .join("")}
            ${moreCount > 0 ? `<text x="85" y="106" text-anchor="middle" font-size="9" font-family="Arial, sans-serif" fill="#6b6862">+${moreCount} more</text>` : ""}
          </g>
        `;
      })
      .join("\n");

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${ROOM_WIDTH}" height="${ROOM_HEIGHT}" viewBox="0 0 ${ROOM_WIDTH} ${ROOM_HEIGHT}">
        <defs>
          <pattern id="grid" width="${GRID_SIZE}" height="${GRID_SIZE}" patternUnits="userSpaceOnUse">
            <path d="M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}" fill="none" stroke="#ece9e3" stroke-width="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="${ROOM_WIDTH}" height="${ROOM_HEIGHT}" fill="#faf9f7" />
        <rect x="0" y="0" width="${ROOM_WIDTH}" height="${ROOM_HEIGHT}" fill="url(#grid)" />
        <text x="16" y="24" font-size="14" font-family="Arial, sans-serif" fill="#37352f" font-weight="700">Wedding Seating Plan</text>
        <text x="16" y="42" font-size="11" font-family="Arial, sans-serif" fill="#6b6862">Tables: ${tables.length} · Guests seated: ${assignedGuestIds.size}/${guests.length}</text>
        ${tableNodes}
      </svg>
    `.trim();
  }

  async function exportAsPng() {
    if (tables.length === 0) {
      setError("Add at least one table before exporting.");
      return;
    }
    setError(null);
    try {
      const svgMarkup = buildSvgMarkup();
      const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not render export image."));
        image.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = ROOM_WIDTH * 2;
      canvas.height = ROOM_HEIGHT * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.drawImage(image, 0, 0, ROOM_WIDTH, ROOM_HEIGHT);

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `wedding-seating-plan-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export PNG.");
    }
  }

  function printAsPdf() {
    if (tables.length === 0) {
      setError("Add at least one table before printing.");
      return;
    }
    setError(null);
    const svgMarkup = buildSvgMarkup();
    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      setError("Popup blocked. Allow popups to print/export PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Wedding Seating Plan</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #fff; }
            .wrap { max-width: 1200px; margin: 0 auto; }
            svg { width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="wrap">${svgMarkup}</div>
          <script>
            window.onload = function () { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function createTable() {
    setError(null);
    const usedNumbers = new Set(tables.map((t) => t.number));
    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) nextNumber++;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const table: SeatingTable = {
      id,
      number: nextNumber,
      name: `Table ${nextNumber}`,
      seats: 8,
      shape: "round",
      x: 32 + (tables.length % 5) * 140,
      y: 28 + Math.floor(tables.length / 5) * 120,
      guestIds: [],
    };
    setTables((prev) => [...prev, table]);
    setSelectedTableId(id);
  }

  function updateTable(tableId: string, updater: (table: SeatingTable) => SeatingTable) {
    setTables((prev) => prev.map((table) => (table.id === tableId ? updater(table) : table)));
  }

  function deleteTable(tableId: string) {
    if (!confirm("Delete this table and unassign its guests?")) return;
    setTables((prev) => prev.filter((table) => table.id !== tableId));
  }

  function tableForGuest(guestId: string): SeatingTable | null {
    for (const table of tables) {
      if (table.guestIds.includes(guestId)) return table;
    }
    return null;
  }

  function toggleGuestOnSelectedTable(guestId: string, checked: boolean) {
    const tableId = selectedTable?.id;
    if (!tableId) return;

    setTables((prev) =>
      prev.map((table) => {
        const hadGuest = table.guestIds.includes(guestId);
        if (table.id === tableId) {
          if (checked && !hadGuest) return { ...table, guestIds: [...table.guestIds, guestId] };
          if (!checked && hadGuest) return { ...table, guestIds: table.guestIds.filter((id) => id !== guestId) };
          return table;
        }
        if (checked && hadGuest) {
          return { ...table, guestIds: table.guestIds.filter((id) => id !== guestId) };
        }
        return table;
      }),
    );
  }

  async function saveAssignmentsToGuestList() {
    setError(null);
    setSuccess(null);
    if (!tableFieldName) {
      setError("Could not find a Table field in this Guest List database.");
      return;
    }

    setSaving(true);
    try {
      const assignmentByGuest = new Map<string, string>();
      for (const table of tables) {
        const label = table.name.trim().length > 0 ? table.name.trim() : `Table ${table.number}`;
        for (const guestId of table.guestIds) {
          assignmentByGuest.set(guestId, label);
        }
      }

      for (const row of db.rows) {
        const nextVal = assignmentByGuest.get(row.pageId) ?? null;
        const currentVal = row.properties[tableFieldName];
        const currentText = typeof currentVal === "string" ? currentVal : null;
        if (currentText === nextVal) continue;

        const res = await fetch(`/api/members/workspace/${row.pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            properties: { [tableFieldName]: nextVal },
            propertyTypes: { [tableFieldName]: "rich_text" },
          }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to save one or more guest assignments");
        }

        onRowUpdated(row.pageId, tableFieldName, nextVal);
      }

      setSuccess("Seating assignments saved to your Guest List.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save seating assignments");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        border: `1px solid ${N_BORDER}`,
        borderRadius: "8px",
        background: "#FBFBFA",
        padding: "14px",
        marginBottom: "14px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: N_FG }}>Seating Planner</h3>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: N_MUTED }}>
            Add and move tables around the room, then assign guests and save back to your Guest List.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={createTable}
            style={{
              padding: "6px 10px",
              borderRadius: "4px",
              border: `1px solid ${N_BORDER_MED}`,
              background: "white",
              color: N_FG,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: N_FONT,
            }}
          >
            + Add table
          </button>
          <button
            type="button"
            onClick={() => void exportAsPng()}
            style={{
              padding: "6px 10px",
              borderRadius: "4px",
              border: `1px solid ${N_BORDER_MED}`,
              background: "white",
              color: N_FG,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: N_FONT,
            }}
          >
            Export PNG
          </button>
          <button
            type="button"
            onClick={printAsPdf}
            style={{
              padding: "6px 10px",
              borderRadius: "4px",
              border: `1px solid ${N_BORDER_MED}`,
              background: "white",
              color: N_FG,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: N_FONT,
            }}
          >
            Print / PDF
          </button>
          <button
            type="button"
            onClick={() => void saveAssignmentsToGuestList()}
            disabled={saving}
            style={{
              padding: "6px 10px",
              borderRadius: "4px",
              border: "none",
              background: saving ? "rgba(55,53,47,0.2)" : N_FG,
              color: "white",
              fontSize: "12px",
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
              fontFamily: N_FONT,
            }}
          >
            {saving ? "Saving..." : "Save to Guest List"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: N_FG }}>
          Zoom
          <input
            type="range"
            min={60}
            max={180}
            step={5}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <span style={{ width: "42px", textAlign: "right", color: N_MUTED }}>{zoom}%</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: N_FG }}>
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={(e) => setSnapToGrid(e.target.checked)}
          />
          Snap to grid
        </label>
      </div>

      {(unseatedGuests.length > 0 || overCapacityTables.length > 0) && (
        <div
          style={{
            marginBottom: "10px",
            padding: "8px 10px",
            borderRadius: "6px",
            border: "1px solid rgba(245,158,11,0.35)",
            background: "rgba(245,158,11,0.08)",
          }}
        >
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#b45309" }}>
            Seating conflicts detected
          </p>
          {unseatedGuests.length > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#92400e" }}>
              {unseatedGuests.length} unseated guest{unseatedGuests.length !== 1 ? "s" : ""}: {unseatedGuests.slice(0, 6).map((g) => g.name).join(", ")}
              {unseatedGuests.length > 6 ? "..." : ""}
            </p>
          )}
          {overCapacityTables.length > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#92400e" }}>
              Over capacity: {overCapacityTables.map((t) => `${normalizeTableLabel(t)} (${t.guestIds.length}/${t.seats})`).join(", ")}
            </p>
          )}
        </div>
      )}

      {error && (
        <p style={{ margin: "0 0 10px", fontSize: "12px", color: "rgb(220,38,38)" }}>{error}</p>
      )}
      {success && (
        <p style={{ margin: "0 0 10px", fontSize: "12px", color: "rgb(15,123,108)" }}>{success}</p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
        <div
          style={{
            position: "relative",
            minHeight: "520px",
            border: `1px dashed ${N_BORDER_MED}`,
            borderRadius: "6px",
            background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(247,246,243,0.75))",
            overflow: "auto",
          }}
        >
          <div
            ref={roomRef}
            style={{
              position: "relative",
              width: `${ROOM_WIDTH}px`,
              height: `${ROOM_HEIGHT}px`,
              transform: `scale(${zoomScale})`,
              transformOrigin: "top left",
              backgroundImage: snapToGrid
                ? `linear-gradient(to right, rgba(55,53,47,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(55,53,47,0.06) 1px, transparent 1px)`
                : "none",
              backgroundSize: snapToGrid ? `${GRID_SIZE}px ${GRID_SIZE}px` : "auto",
            }}
          >
          {tables.length === 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: N_MUTED, fontSize: "13px" }}>
              No tables yet. Click "Add table" to start your room layout.
            </div>
          )}

          {tables.map((table) => {
            const assignedCount = table.guestIds.length;
            const selected = selectedTableId === table.id;
            return (
              <div
                key={table.id}
                onMouseDown={(e) => {
                  const target = e.target as HTMLElement;
                  const tag = target.tagName.toLowerCase();
                  if (["input", "button", "select", "textarea", "label"].includes(tag)) return;
                  const room = roomRef.current;
                  if (!room) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const roomRect = room.getBoundingClientRect();
                  const currentZoom = zoom / 100;
                  dragStateRef.current = {
                    tableId: table.id,
                    offsetX: (e.clientX - rect.left) / currentZoom,
                    offsetY: (e.clientY - rect.top) / currentZoom,
                  };
                  if (e.clientX < roomRect.left || e.clientY < roomRect.top) {
                    dragStateRef.current = null;
                  }
                }}
                onClick={() => setSelectedTableId(table.id)}
                style={{
                  position: "absolute",
                  left: `${table.x}px`,
                  top: `${table.y}px`,
                  width: "170px",
                  padding: "8px",
                  borderRadius: table.shape === "round" ? "999px" : "8px",
                  border: `1px solid ${selected ? N_BLUE : N_BORDER_MED}`,
                  background: "white",
                  boxShadow: selected ? "0 8px 24px rgba(35,131,226,0.18)" : "0 4px 14px rgba(0,0,0,0.07)",
                  cursor: "grab",
                  userSelect: "none",
                  height: table.shape === "round" ? "110px" : "auto",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "12px", color: N_FG }}>#{table.number}</strong>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTable(table.id);
                    }}
                    style={{
                      border: "none",
                      background: "none",
                      color: N_SUBTLE,
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                    title="Delete table"
                  >
                    Delete
                  </button>
                </div>

                <input
                  value={table.name}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateTable(table.id, (t) => ({ ...t, name: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "4px 6px",
                    borderRadius: "4px",
                    border: `1px solid ${N_BORDER}`,
                    fontSize: "12px",
                    marginBottom: "6px",
                    boxSizing: "border-box",
                    fontFamily: N_FONT,
                  }}
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "6px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "10px", color: N_SUBTLE }}>
                    Number
                    <input
                      type="number"
                      min={1}
                      value={table.number}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        updateTable(table.id, (t) => ({ ...t, number: Number.isFinite(next) ? Math.max(1, Math.round(next)) : t.number }));
                      }}
                      style={{ border: `1px solid ${N_BORDER}`, borderRadius: "4px", padding: "3px 4px", fontSize: "12px", fontFamily: N_FONT }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "10px", color: N_SUBTLE }}>
                    Seats
                    <input
                      type="number"
                      min={1}
                      value={table.seats}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        updateTable(table.id, (t) => ({ ...t, seats: Number.isFinite(next) ? Math.max(1, Math.round(next)) : t.seats }));
                      }}
                      style={{ border: `1px solid ${N_BORDER}`, borderRadius: "4px", padding: "3px 4px", fontSize: "12px", fontFamily: N_FONT }}
                    />
                  </label>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: N_SUBTLE, marginBottom: "6px" }}>
                  Shape
                  <select
                    value={table.shape}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      updateTable(table.id, (t) => ({
                        ...t,
                        shape: e.target.value === "rectangle" ? "rectangle" : "round",
                      }))
                    }
                    style={{ border: `1px solid ${N_BORDER}`, borderRadius: "4px", padding: "2px 4px", fontSize: "10px", fontFamily: N_FONT }}
                  >
                    <option value="round">Round</option>
                    <option value="rectangle">Rectangle</option>
                  </select>
                </label>

                <div style={{ fontSize: "11px", color: N_MUTED }}>
                  {assignedCount}/{table.seats} seated
                </div>
              </div>
            );
          })}
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${N_BORDER}`,
            borderRadius: "6px",
            background: "white",
            padding: "10px",
            maxHeight: "520px",
            overflowY: "auto",
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 600, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Guest Assignments
          </p>

          {!selectedTable && (
            <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
              Select a table on the canvas to assign guests.
            </p>
          )}

          {selectedTable && (
            <>
              <p style={{ margin: "0 0 8px", fontSize: "13px", color: N_FG, fontWeight: 600 }}>
                {selectedTable.name || `Table ${selectedTable.number}`}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {guests.map((guest) => {
                  const assigned = selectedTable.guestIds.includes(guest.id);
                  const ownerTable = tableForGuest(guest.id);
                  const assignedElsewhere = ownerTable !== null && ownerTable.id !== selectedTable.id;
                  return (
                    <label key={guest.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: N_FG }}>
                      <input
                        type="checkbox"
                        checked={assigned}
                        onChange={(e) => toggleGuestOnSelectedTable(guest.id, e.target.checked)}
                      />
                      <span style={{ flex: 1 }}>{guest.name}</span>
                      {assignedElsewhere && (
                        <span style={{ fontSize: "10px", color: N_SUBTLE }}>
                          @ {ownerTable?.name || `Table ${ownerTable?.number}`}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function WeddingDraftStudio({
  db,
  onRowAdded,
  mode = "inline",
  onClose,
  onOpenFull,
}: {
  db: WorkspaceDatabase;
  onRowAdded: (row: WorkspaceRow) => void;
  mode?: "inline" | "modal";
  onClose?: () => void;
  onOpenFull?: () => void;
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
        ...(mode === "modal"
          ? {
              position: "fixed",
              inset: 0,
              zIndex: 60,
              background: "rgba(55,53,47,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }
          : {
              border: `1px solid ${N_BORDER}`,
              borderRadius: "6px",
              background: "#FBFBFA",
              padding: "14px",
              marginBottom: "14px",
            }),
      }}
    >
      <div style={{
        width: "100%",
        maxWidth: mode === "modal" ? "1100px" : "100%",
        background: "#FBFBFA",
        borderRadius: mode === "modal" ? "14px" : "6px",
        border: mode === "modal" ? `1px solid ${N_BORDER}` : "none",
        boxShadow: mode === "modal" ? "0 24px 80px rgba(0,0,0,0.24)" : "none",
        padding: "16px",
        maxHeight: mode === "modal" ? "90vh" : "none",
        overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <WandSparkles size={16} color={N_BLUE} />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: N_FG }}>
              AI Email Draft Studio
            </h3>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {mode === "inline" && onOpenFull && (
              <button
                onClick={onOpenFull}
                style={{
                  padding: "6px 10px",
                  borderRadius: "4px",
                  border: `1px solid ${N_BORDER_MED}`,
                  background: "white",
                  color: N_FG,
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: N_FONT,
                }}
              >
                Open full editor
              </button>
            )}
            {mode === "modal" && onClose && (
              <button
                onClick={onClose}
                style={{
                  padding: "6px 10px",
                  borderRadius: "4px",
                  border: `1px solid ${N_BORDER_MED}`,
                  background: "white",
                  color: N_FG,
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: N_FONT,
                }}
              >
                Close
              </button>
            )}
          </div>
        </div>
        <p style={{ margin: "0 0 12px", fontSize: "13px", color: N_MUTED, lineHeight: 1.5 }}>
          Create reusable wedding outreach emails, edit them, then save to this Documents database for future reuse.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: mode === "modal" ? "1fr 1fr" : "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
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
            background: generating ? "rgba(55,53,47,0.2)" : N_FG,
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
            rows={mode === "modal" ? 18 : 10}
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
                color: N_FG,
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
    </div>
  );
}

// ─── Main workspace page component ────────────────────────────────────────────
export default function WorkspacePage() {
  const searchParams = useSearchParams();
  const nicheIdParam = searchParams.get("nicheId");
  const dbIdParam = searchParams.get("dbId");
  const openEditorParam = searchParams.get("editor") === "1";
  const [databases, setDatabases] = useState<WorkspaceDatabase[]>([]);
  const [backend, setBackend] = useState<"app" | "notion">("notion");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedNiches, setExpandedNiches] = useState<Set<string>>(new Set());
  const [draftEditorOpen, setDraftEditorOpen] = useState(false);

  function applyRequestedSelection(nextDatabases: WorkspaceDatabase[]) {
    const requestedDb = nextDatabases.find((d) =>
      (nicheIdParam ? d.nicheId === nicheIdParam : true) &&
      (dbIdParam ? d.dbId === dbIdParam : true),
    );

    if (requestedDb) {
      setActiveTab(requestedDb.notionId);
      setDraftEditorOpen(
        openEditorParam &&
          requestedDb.nicheId === "wedding-planner" &&
          requestedDb.dbId === "documents",
      );
      return;
    }

    if (nextDatabases.length > 0) {
      setActiveTab((prev) => prev || nextDatabases[0]!.notionId);
    }
    setDraftEditorOpen(false);
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

      // Auto-expand all niches and select first tab
      const nicheIds = [...new Set(data.databases.map((d) => d.nicheId))];
      setExpandedNiches(new Set(nicheIds));
      applyRequestedSelection(data.databases);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
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
    applyRequestedSelection(databases);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nicheIdParam, dbIdParam, openEditorParam, databases]);

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
          background: "#EAF4FF",
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
          <span style={{ fontSize: "13px", fontWeight: 600, color: N_FG }}>My Databases</span>
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
                  padding: "6px 10px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: N_SUBTLE,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: N_FONT,
                  textAlign: "left",
                }}
              >
                {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                {group.nicheName}
              </button>

              {expanded &&
                group.dbs.map((db) => {
                  const active = activeTab === db.notionId;
                  return (
                    <button
                      key={db.notionId}
                      onClick={() => setActiveTab(db.notionId)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                        width: "100%",
                        padding: "5px 10px 5px 20px",
                        background: active ? N_ACTIVE : "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: N_FG,
                        fontFamily: N_FONT,
                        textAlign: "left",
                        borderRadius: "3px",
                      }}
                      className="hover:bg-[rgba(55,53,47,0.06)]"
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
              {backend === "app" &&
                activeDbDisplay.nicheId === "wedding-planner" &&
                activeDbDisplay.dbId === "documents" && (
                  <WeddingDraftStudio
                    db={activeDbDisplay}
                    onRowAdded={(row) => handleRowAdded(activeDbDisplay.notionId, row)}
                    onOpenFull={() => setDraftEditorOpen(true)}
                  />
                )}
              {backend === "app" &&
                activeDbDisplay.nicheId === "wedding-planner" &&
                activeDbDisplay.dbId === "guests" && (
                  <WeddingSeatingPlanner
                    db={activeDbDisplay}
                    onRowUpdated={(pageId, name, val) =>
                      handleRowUpdated(activeDbDisplay.notionId, pageId, name, val)
                    }
                  />
                )}
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
        {draftEditorOpen && activeDbDisplay && backend === "app" && activeDbDisplay.nicheId === "wedding-planner" && activeDbDisplay.dbId === "documents" && (
          <WeddingDraftStudio
            db={activeDbDisplay}
            onRowAdded={(row) => handleRowAdded(activeDbDisplay.notionId, row)}
            mode="modal"
            onClose={() => setDraftEditorOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
