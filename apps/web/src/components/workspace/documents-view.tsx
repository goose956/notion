"use client";
import { useState } from "react";
import { Loader2, Plus, Trash2, FileText, Lock, Eye, PenLine } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { ConfirmModal, type PendingConfirm } from "@/components/confirm-modal";

// ─── Document type config ─────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  "Venue Enquiry":       { label: "Venue Enquiry",       color: "#7c3aed", bg: "#ede9fe" },
  "Vendor Enquiry":      { label: "Vendor Enquiry",      color: "#be185d", bg: "#fce7f3" },
  "Contract Note":       { label: "Contract Note",       color: "#c2410c", bg: "#ffedd5" },
  "AI Research":         { label: "AI Research",         color: "#0369a1", bg: "#e0f2fe" },
  "Guest Communication": { label: "Guest Letters",       color: "#065f46", bg: "#d1fae5" },
  "Speech Draft":        { label: "Speech Draft",        color: "#92400e", bg: "#fef3c7" },
  "Other":               { label: "Other",               color: "#374151", bg: "#f3f4f6" },
};

function getTypeConfig(type: string | null | undefined) {
  return TYPE_CONFIG[type ?? ""] ?? { label: type ?? "Uncategorised", color: "#374151", bg: "#f3f4f6" };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prop(row: WorkspaceRow, ...names: string[]): string {
  for (const n of names) {
    const v = row.properties[n];
    if (v !== null && v !== undefined && v !== "") return String(v);
  }
  return "";
}

function groupByType(rows: WorkspaceRow[]): Array<{ type: string; rows: WorkspaceRow[] }> {
  const order = Object.keys(TYPE_CONFIG);
  const map = new Map<string, WorkspaceRow[]>();
  for (const row of rows) {
    const t = prop(row, "Type") || "Other";
    if (!map.has(t)) map.set(t, []);
    map.get(t)!.push(row);
  }
  const result: Array<{ type: string; rows: WorkspaceRow[] }> = [];
  // Ordered types first
  for (const t of order) {
    if (map.has(t)) result.push({ type: t, rows: map.get(t)! });
  }
  // Any unknown types
  for (const [t, r] of map) {
    if (!order.includes(t)) result.push({ type: t, rows: r });
  }
  return result;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function DocCard({
  row,
  selected,
  onSelect,
  onDelete,
}: {
  row: WorkspaceRow;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const title = prop(row, "Title") || "Untitled";
  const summary = prop(row, "Summary");
  const body = prop(row, "Body", "Content", "Draft", "Notes");
  const type = prop(row, "Type");
  const cfg = getTypeConfig(type);
  const { textOnly, svgs } = extractSvgs(body);
  const hasSvg = svgs.length > 0;
  const isDocLocked = isRowLocked(row);
  const textPreview = summary || textOnly.replace(/SVG asset\s*\d*:\s*\n?/gi, "").trim().slice(0, 80);
  const svgDataUri = hasSvg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgs[0]!)}` : null;

  return (
    <div
      onClick={onSelect}
      style={{
        borderRadius: "6px",
        border: `1px solid ${selected ? cfg.color : N_BORDER}`,
        background: selected ? cfg.bg : "white",
        cursor: "pointer",
        overflow: "hidden",
        transition: "border-color 0.1s",
      }}
    >
      {/* SVG thumbnail */}
      {svgDataUri && (
        <div style={{ width: "100%", aspectRatio: "2/1", overflow: "hidden", background: "#f5f5f4", borderBottom: `1px solid ${N_BORDER}` }}>
          <img src={svgDataUri} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
        </div>
      )}
      <div style={{ padding: "8px 10px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px", marginBottom: hasSvg || !textPreview ? 0 : "3px" }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: N_FG, lineHeight: 1.3, flex: 1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {title}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "1px", color: "rgba(55,53,47,0.3)", flexShrink: 0, lineHeight: 1 }}
          >
            <Trash2 size={11} />
          </button>
        </div>
        {!hasSvg && isDocLocked && (
          <p style={{ margin: 0, fontSize: "11px", color: N_MUTED, display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Lock size={10} /> Password protected
          </p>
        )}
        {!hasSvg && !isDocLocked && textPreview && (
          <p style={{ margin: 0, fontSize: "11px", color: N_MUTED, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {textPreview}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Password helpers ─────────────────────────────────────────────────────────

function isRowLocked(row: WorkspaceRow): boolean {
  const locked = row.properties["Locked"];
  const hash = String(row.properties["PasswordHash"] ?? "").trim();
  return (locked === true || locked === "true" || locked === 1) && hash.length > 0;
}

async function hashPassword(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function PasswordGate({ storedHash, onUnlock }: { storedHash: string; onUnlock: () => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setChecking(true);
    setError(null);
    const hash = await hashPassword(input.trim());
    if (hash === storedHash) {
      onUnlock();
    } else {
      setError("Incorrect password.");
    }
    setChecking(false);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", background: "#fafafa", padding: "32px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", color: N_MUTED }}>
        <Lock size={28} strokeWidth={1.5} />
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: N_FG }}>This speech is password protected</p>
        <p style={{ margin: 0, fontSize: "12px", color: N_MUTED, textAlign: "center" }}>Enter the password set by the author to view the content.</p>
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", maxWidth: "280px" }}>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter password"
          autoFocus
          style={{ padding: "9px 12px", borderRadius: "6px", border: `1px solid ${error ? "rgb(220,38,38)" : N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, outline: "none" }}
        />
        {error && <p style={{ margin: 0, fontSize: "12px", color: "rgb(220,38,38)" }}>{error}</p>}
        <button
          type="submit"
          disabled={checking || !input.trim()}
          style={{ padding: "9px", borderRadius: "6px", border: "none", background: checking ? "rgba(55,53,47,0.15)" : N_FG, color: "white", fontSize: "13px", fontWeight: 600, fontFamily: N_FONT, cursor: checking ? "default" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
        >
          {checking ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Eye size={13} />}
          {checking ? "Checking…" : "View speech"}
        </button>
      </form>
    </div>
  );
}

// ─── Lightweight markdown renderer ───────────────────────────────────────────

function inlineFormat(line: string): React.ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} style={{ background: "rgba(55,53,47,0.08)", borderRadius: 3, padding: "1px 5px", fontSize: "0.9em", fontFamily: "monospace" }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let key = 0;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (/^### /.test(line)) {
      nodes.push(<p key={key++} style={{ fontSize: "13px", fontWeight: 700, color: "#37352f", margin: "16px 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{inlineFormat(line.slice(4))}</p>);
    } else if (/^## /.test(line)) {
      nodes.push(<p key={key++} style={{ fontSize: "16px", fontWeight: 700, color: "#37352f", margin: "20px 0 6px" }}>{inlineFormat(line.slice(3))}</p>);
    } else if (/^# /.test(line)) {
      nodes.push(<p key={key++} style={{ fontSize: "18px", fontWeight: 700, color: "#37352f", margin: "24px 0 8px" }}>{inlineFormat(line.slice(2))}</p>);
    } else if (/^[-*] /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i]!)) {
        items.push(<li key={i} style={{ marginBottom: "4px" }}>{inlineFormat(lines[i]!.slice(2))}</li>);
        i++;
      }
      nodes.push(<ul key={key++} style={{ margin: "8px 0", paddingLeft: "22px", fontSize: "14px", lineHeight: 1.7 }}>{items}</ul>);
      continue;
    } else if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i]!)) {
        items.push(<li key={i} style={{ marginBottom: "4px" }}>{inlineFormat(lines[i]!.replace(/^\d+\. /, ""))}</li>);
        i++;
      }
      nodes.push(<ol key={key++} style={{ margin: "8px 0", paddingLeft: "22px", fontSize: "14px", lineHeight: 1.7 }}>{items}</ol>);
      continue;
    } else if (/^> /.test(line)) {
      nodes.push(<blockquote key={key++} style={{ borderLeft: "3px solid #d0cec9", margin: "8px 0", paddingLeft: "14px", color: "#6b6b6b", fontSize: "14px", lineHeight: 1.7 }}>{inlineFormat(line.slice(2))}</blockquote>);
    } else if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={key++} style={{ border: "none", borderTop: "1px solid #e0ddd8", margin: "16px 0" }} />);
    } else if (line.trim() === "") {
      nodes.push(<div key={key++} style={{ height: "8px" }} />);
    } else {
      nodes.push(<p key={key++} style={{ fontSize: "14px", color: "#37352f", margin: "0 0 6px", lineHeight: 1.75 }}>{inlineFormat(line)}</p>);
    }
    i++;
  }
  return nodes;
}

// ─── Body editor (handles text + embedded SVG assets) ────────────────────────

function extractSvgs(text: string): { textOnly: string; svgs: string[] } {
  const svgs: string[] = [];
  const textOnly = text.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
    svgs.push(match);
    return "";
  });
  return { textOnly, svgs };
}

function BodyEditor({ body, onChange, row }: { body: string; onChange: (v: string) => void; row: WorkspaceRow }) {
  const storedHash = String(row.properties["PasswordHash"] ?? "").trim();
  const isLocked = isRowLocked(row);
  const [unlocked, setUnlocked] = useState(!isLocked);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  if (!unlocked) {
    return <PasswordGate storedHash={storedHash} onUnlock={() => setUnlocked(true)} />;
  }

  const { textOnly, svgs } = extractSvgs(body);
  const hasSvgs = svgs.length > 0;
  const displayText = textOnly.replace(/SVG asset\s*\d*:\s*\n?/gi, "").trimEnd();

  function handleTextChange(newText: string) {
    if (!hasSvgs) { onChange(newText); return; }
    const rebuilt = newText.trimEnd() +
      (newText.trimEnd() ? "\n\n" : "") +
      svgs.map((s, i) => `SVG asset${svgs.length > 1 ? ` ${i + 1}` : ""}:\n${s}`).join("\n\n");
    onChange(rebuilt);
  }

  // SVG-only view
  if (hasSvgs) {
    return (
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#f5f5f4", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px", gap: "20px" }}>
        {svgs.map((svg, i) => {
          const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
          return (
            <div key={i} style={{ width: "100%", maxWidth: "500px", background: "white", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.10)" }}>
              <img src={dataUri} alt={`Asset ${i + 1}`} style={{ width: "100%", display: "block" }} />
              <div style={{ padding: "10px 14px", borderTop: `1px solid ${N_BORDER}`, display: "flex", justifyContent: "flex-end" }}>
                <a href={dataUri} download={`asset-${i + 1}.svg`} style={{ fontSize: "12px", color: N_MUTED, textDecoration: "none", fontFamily: N_FONT }}>
                  Download SVG
                </a>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      {/* Edit / Preview toggle */}
      <div style={{ display: "flex", gap: "2px", padding: "8px 20px", borderBottom: `1px solid ${N_BORDER}`, background: "white", flexShrink: 0 }}>
        <button
          onClick={() => setMode("edit")}
          style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "4px 12px", borderRadius: "5px", border: "none",
            background: mode === "edit" ? "rgba(55,53,47,0.08)" : "transparent",
            fontSize: "12px", fontWeight: mode === "edit" ? 600 : 400,
            color: mode === "edit" ? "#37352f" : "#9b9a97",
            cursor: "pointer", fontFamily: N_FONT,
          }}
        >
          <PenLine size={12} /> Edit
        </button>
        <button
          onClick={() => setMode("preview")}
          style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "4px 12px", borderRadius: "5px", border: "none",
            background: mode === "preview" ? "rgba(55,53,47,0.08)" : "transparent",
            fontSize: "12px", fontWeight: mode === "preview" ? 600 : 400,
            color: mode === "preview" ? "#37352f" : "#9b9a97",
            cursor: "pointer", fontFamily: N_FONT,
          }}
        >
          <Eye size={12} /> Preview
        </button>
        {displayText && (
          <span style={{ marginLeft: "auto", fontSize: "11px", color: "#b5b3af", alignSelf: "center" }}>
            {displayText.split(/\s+/).filter(Boolean).length} words
          </span>
        )}
      </div>

      {mode === "edit" ? (
        <textarea
          value={displayText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Start writing… Markdown is supported: **bold**, *italic*, ## headings, - bullets"
          style={{
            flex: 1,
            padding: "24px 28px",
            border: "none",
            outline: "none",
            resize: "none",
            fontSize: "14px",
            color: "#37352f",
            fontFamily: `"Georgia", "Times New Roman", serif`,
            lineHeight: 1.8,
            background: "#fafaf8",
            minWidth: 0,
          }}
        />
      ) : (
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 28px",
            background: "#fafaf8",
          }}
        >
          {displayText.trim() ? (
            <div style={{ maxWidth: "680px" }}>
              {renderMarkdown(displayText)}
            </div>
          ) : (
            <p style={{ color: "#b5b3af", fontSize: "14px", fontStyle: "italic" }}>Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Editor panel ─────────────────────────────────────────────────────────────

function DocEditor({
  row,
  db,
  onSaved,
  onDeleted,
}: {
  row: WorkspaceRow;
  db: WorkspaceDatabase;
  onSaved: (pageId: string, updates: Record<string, string | number | boolean | null>) => void;
  onDeleted: (pageId: string) => void;
}) {
  const [title, setTitle] = useState(prop(row, "Title"));
  const [subject, setSubject] = useState(prop(row, "Subject"));
  const [body, setBody] = useState(prop(row, "Body", "Content", "Draft", "Notes"));
  const [type, setType] = useState(prop(row, "Type") || "Other");
  const isImageDoc = extractSvgs(body).svgs.length > 0;
  const isLockedDoc = isRowLocked(row);
  const [recipient, setRecipient] = useState(prop(row, "Recipient"));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const hasTitleProp   = db.properties.some((p) => p.name === "Title")   || "Title"   in row.properties;
  const hasSubjectProp = db.properties.some((p) => p.name === "Subject") || "Subject" in row.properties;
  const hasRecipProp   = db.properties.some((p) => p.name === "Recipient") || "Recipient" in row.properties;
  const hasTypeProp    = db.properties.some((p) => p.name === "Type")    || "Type"    in row.properties;
  // Detect body field from schema OR from row properties directly
  const bodyProp       = db.properties.find((p) => ["Body","Content","Draft","Notes"].includes(p.name))
    ?? (["Body","Content","Draft","Notes"].find((k) => k in row.properties) ? { name: ["Body","Content","Draft","Notes"].find((k) => k in row.properties)! } : { name: "Body" });
  const typeOptions    = (db.properties.find((p) => p.name === "Type")?.options ?? Object.keys(TYPE_CONFIG)) as string[];

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const updates: Record<string, string | number | boolean | null> = {};
    const propertyTypes: Record<string, string> = {};
    if (hasTitleProp)   { updates["Title"]   = title;     propertyTypes["Title"]   = "title"; }
    if (hasSubjectProp) { updates["Subject"] = subject;   propertyTypes["Subject"] = "rich_text"; }
    if (hasRecipProp)   { updates["Recipient"] = recipient; propertyTypes["Recipient"] = "rich_text"; }
    if (hasTypeProp)    { updates["Type"]    = type;      propertyTypes["Type"]    = "select"; }
    if (bodyProp)       { updates[bodyProp.name] = body;  propertyTypes[bodyProp.name] = "rich_text"; }

    try {
      const res = await fetch(`/api/members/workspace/${row.pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ properties: updates, propertyTypes }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Save failed");
      }
      onSaved(row.pageId, updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    setPendingConfirm({
      title: "Delete document",
      message: "Permanently delete this document? This cannot be undone.",
      confirmLabel: "Delete",
      dangerous: true,
      onConfirm: async () => {
        setPendingConfirm(null);
        setDeleting(true);
        await fetch(`/api/members/workspace/${row.pageId}`, { method: "DELETE" });
        onDeleted(row.pageId);
      },
    });
  }

  const cfg = getTypeConfig(type);

  return (
    <>
      {pendingConfirm && <ConfirmModal {...pendingConfirm} onCancel={() => setPendingConfirm(null)} />}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, fontFamily: N_FONT }}>
        {/* Header */}
        <div style={{ padding: "14px 20px 12px", borderBottom: `1px solid ${N_BORDER}`, background: "white", flexShrink: 0 }}>
          {/* Type badge + actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            {hasTypeProp ? (
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  padding: "3px 8px",
                  borderRadius: "4px",
                  border: "none",
                  background: cfg.bg,
                  color: cfg.color,
                  fontSize: "11px",
                  fontWeight: 700,
                  fontFamily: N_FONT,
                  cursor: "pointer",
                  appearance: "none",
                }}
              >
                {typeOptions.map((o) => (
                  <option key={o} value={o}>{getTypeConfig(o).label}</option>
                ))}
              </select>
            ) : (
              <span style={{ padding: "3px 8px", borderRadius: "4px", background: cfg.bg, color: cfg.color, fontSize: "11px", fontWeight: 700 }}>
                {cfg.label}
              </span>
            )}
            <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
              {error && <span style={{ fontSize: "12px", color: "rgb(220,38,38)" }}>{error}</span>}
              {saved && <span style={{ fontSize: "12px", color: "rgb(15,123,108)" }}>Saved</span>}
              <button
                onClick={() => void handleDelete()}
                disabled={deleting}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(55,53,47,0.4)", padding: "4px", display: "flex", alignItems: "center" }}
              >
                {deleting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={13} />}
              </button>
              {!isImageDoc && !isLockedDoc && <button
                onClick={() => void handleSave()}
                disabled={saving}
                style={{
                  padding: "6px 14px",
                  borderRadius: "5px",
                  border: "none",
                  background: saving ? "rgba(55,53,47,0.15)" : N_FG,
                  color: "white",
                  fontSize: "12px",
                  fontWeight: 600,
                  fontFamily: N_FONT,
                  cursor: saving ? "default" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                {saving && <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />}
                {saving ? "Saving…" : "Save"}
              </button>}
            </div>
          </div>

          {/* Title */}
          {hasTitleProp && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              style={{ width: "100%", border: "none", outline: "none", fontSize: "20px", fontWeight: 700, color: N_FG, fontFamily: N_FONT, background: "transparent", padding: 0, boxSizing: "border-box" }}
            />
          )}

          {/* Subject / Recipient row */}
          {(hasSubjectProp || hasRecipProp) && (
            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              {hasSubjectProp && (
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  style={{ flex: 1, border: "none", borderBottom: `1px solid ${N_BORDER}`, outline: "none", fontSize: "13px", color: N_MUTED, fontFamily: N_FONT, background: "transparent", padding: "3px 0" }}
                />
              )}
              {hasRecipProp && (
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Recipient"
                  style={{ flex: 1, border: "none", borderBottom: `1px solid ${N_BORDER}`, outline: "none", fontSize: "13px", color: N_MUTED, fontFamily: N_FONT, background: "transparent", padding: "3px 0" }}
                />
              )}
            </div>
          )}
        </div>

        {/* Body — split into text + SVG preview if SVG is present; password-gated if locked */}
        <BodyEditor body={body} onChange={setBody} row={row} />
      </div>
    </>
  );
}

// ─── Main DocumentsView ───────────────────────────────────────────────────────

export function DocumentsView({
  db,
  onRowAdded,
  onRowUpdated,
  onRowDeleted,
}: {
  db: WorkspaceDatabase;
  onRowAdded: (row: WorkspaceRow) => void;
  onRowUpdated: (pageId: string, name: string, val: string | number | boolean | null) => void;
  onRowDeleted: (pageId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    db.rows.length > 0 ? db.rows[0]!.pageId : null,
  );
  const [addingRow, setAddingRow] = useState(false);

  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  // Speech Drafts live in the Speech Writer tab — exclude from Documents view
  const visibleRows = db.rows.filter((r) => prop(r, "Type") !== "Speech Draft");
  const groups = groupByType(visibleRows);
  // Fall back to first visible row if selection is gone
  const selectedExists = visibleRows.some((r) => r.pageId === selectedId);
  const effectiveSelectedId = selectedExists ? selectedId : (visibleRows[0]?.pageId ?? null);
  const selectedRow = visibleRows.find((r) => r.pageId === effectiveSelectedId) ?? null;

  async function handleAddRow() {
    setAddingRow(true);
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: db.notionId,
          properties: { Title: "New document", Type: "Other" },
          propertyTypes: { Title: "title", Type: "select" },
        }),
      });
      if (!res.ok) throw new Error("Failed to create document");
      const data = (await res.json()) as { pageId: string };
      const newRow: WorkspaceRow = { pageId: data.pageId, properties: { Title: "New document", Type: "Other" } };
      onRowAdded(newRow);
      setSelectedId(data.pageId);
    } catch {
      // ignore
    } finally {
      setAddingRow(false);
    }
  }

  function handleSaved(pageId: string, updates: Record<string, string | number | boolean | null>) {
    for (const [name, val] of Object.entries(updates)) {
      onRowUpdated(pageId, name, val);
    }
  }

  function handleDeleted(pageId: string) {
    onRowDeleted(pageId);
    // Select another row
    const remaining = db.rows.filter((r) => r.pageId !== pageId);
    setSelectedId(remaining.length > 0 ? remaining[0]!.pageId : null);
  }

  function handleDeleteCard(pageId: string) {
    setPendingConfirm({
      title: "Delete document",
      message: "Permanently delete this document? This cannot be undone.",
      confirmLabel: "Delete",
      dangerous: true,
      onConfirm: async () => {
        setPendingConfirm(null);
        await fetch(`/api/members/workspace/${pageId}`, { method: "DELETE" });
        handleDeleted(pageId);
      },
    });
  }

  return (
    <>
      {pendingConfirm && <ConfirmModal {...pendingConfirm} onCancel={() => setPendingConfirm(null)} />}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden", fontFamily: N_FONT }}>

        {/* ── Left: document list ──────────────────────────────────────── */}
        <div
          style={{
            width: "260px",
            flexShrink: 0,
            minHeight: 0,
            borderRight: `1px solid ${N_BORDER}`,
            display: "flex",
            flexDirection: "column",
            background: "white",
            overflow: "hidden",
          }}
        >
          {/* Add button */}
          <div style={{ padding: "10px 10px 8px", borderBottom: `1px solid ${N_BORDER}`, flexShrink: 0 }}>
            <button
              onClick={() => void handleAddRow()}
              disabled={addingRow}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: "5px",
                border: `1px dashed ${N_BORDER_MED}`,
                background: "none",
                color: N_MUTED,
                fontSize: "12px",
                fontFamily: N_FONT,
                cursor: addingRow ? "default" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
              }}
            >
              {addingRow ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={12} />}
              New document
            </button>
          </div>

          {/* Grouped list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {db.rows.length === 0 ? (
              <p style={{ fontSize: "12px", color: N_SUBTLE, padding: "8px 4px", margin: 0 }}>
                No documents yet. Click &ldquo;New document&rdquo; to create one, or generate a draft letter.
              </p>
            ) : (
              groups.map(({ type, rows }) => {
                const cfg = getTypeConfig(type);
                return (
                  <div key={type} style={{ marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px", padding: "0 2px" }}>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: cfg.color,
                        background: cfg.bg,
                        padding: "2px 7px",
                        borderRadius: "20px",
                      }}>
                        {cfg.label}
                      </span>
                      <span style={{ fontSize: "10px", color: N_SUBTLE }}>{rows.length}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {rows.map((row) => (
                        <DocCard
                          key={row.pageId}
                          row={row}
                          selected={effectiveSelectedId === row.pageId}
                          onSelect={() => setSelectedId(row.pageId)}
                          onDelete={() => handleDeleteCard(row.pageId)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: editor ────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {selectedRow ? (
            // Key forces remount (and state reset) when switching documents
            <DocEditor
              key={effectiveSelectedId}
              row={selectedRow}
              db={db}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
            />
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", color: N_SUBTLE }}>
              <FileText size={32} strokeWidth={1} />
              <p style={{ margin: 0, fontSize: "14px" }}>Select a document to edit</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
