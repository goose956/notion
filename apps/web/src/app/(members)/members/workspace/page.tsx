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

function findPropertyName(props: WorkspaceProperty[], candidates: string[]): string | null {
  const map = new Map(props.map((p) => [p.name.toLowerCase(), p.name]));
  for (const c of candidates) {
    const match = map.get(c.toLowerCase());
    if (match) return match;
  }
  return null;
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
                  const isPlanningTimetable = /planning\s*timetable/i.test(db.dbName);
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

                      {backend === "app" && group.nicheId === "wedding-planner" && isPlanningTimetable && (
                        <Link
                          href="/members/seating"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "7px",
                            width: "100%",
                            padding: "5px 10px 5px 34px",
                            borderRadius: "3px",
                            fontSize: "13px",
                            color: N_FG,
                            textDecoration: "none",
                          }}
                          className="hover:bg-[rgba(55,53,47,0.06)]"
                        >
                          <span style={{ fontSize: "14px", flexShrink: 0 }}>🪑</span>
                          Seating Planner
                        </Link>
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
