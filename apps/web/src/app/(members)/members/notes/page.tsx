"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, FileText, Search, ChevronDown, ChevronUp } from "lucide-react";
import type { ResearchNote } from "@/app/api/members/notes/route";

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_BORDER_MED = "rgba(55,53,47,0.16)";
const N_ACTIVE = "rgba(55,53,47,0.06)";
const N_FONT = 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

// ─── Markdown renderer (mirrors the one in chat page) ────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let key = 0;

  function inlineFormat(line: string): React.ReactNode {
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
      return part;
    });
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (/^### /.test(line)) {
      nodes.push(<p key={key++} style={{ fontSize: "13px", fontWeight: 700, color: N_FG, margin: "14px 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{line.slice(4)}</p>);
    } else if (/^## /.test(line)) {
      nodes.push(<p key={key++} style={{ fontSize: "15px", fontWeight: 700, color: N_FG, margin: "18px 0 6px" }}>{line.slice(3)}</p>);
    } else if (/^# /.test(line)) {
      nodes.push(<p key={key++} style={{ fontSize: "17px", fontWeight: 700, color: N_FG, margin: "20px 0 8px" }}>{line.slice(2)}</p>);
    } else if (/^[-*] /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i]!)) {
        items.push(<li key={i} style={{ marginBottom: "3px" }}>{inlineFormat(lines[i]!.slice(2))}</li>);
        i++;
      }
      nodes.push(<ul key={key++} style={{ margin: "6px 0", paddingLeft: "20px", fontSize: "14px", color: N_FG, lineHeight: 1.6 }}>{items}</ul>);
      continue;
    } else if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i]!)) {
        items.push(<li key={i} style={{ marginBottom: "3px" }}>{inlineFormat(lines[i]!.replace(/^\d+\. /, ""))}</li>);
        i++;
      }
      nodes.push(<ol key={key++} style={{ margin: "6px 0", paddingLeft: "20px", fontSize: "14px", color: N_FG, lineHeight: 1.6 }}>{items}</ol>);
      continue;
    } else if (line.trim() === "") {
      nodes.push(<div key={key++} style={{ height: "8px" }} />);
    } else {
      nodes.push(<p key={key++} style={{ fontSize: "14px", color: N_FG, margin: "0 0 6px", lineHeight: 1.7 }}>{inlineFormat(line)}</p>);
    }
    i++;
  }
  return nodes;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ─── Note card ────────────────────────────────────────────────────────────────

function NoteCard({ note, onDelete }: { note: ResearchNote; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/members/notes?id=${encodeURIComponent(note.id)}`, { method: "DELETE" });
      onDelete(note.id);
    } finally {
      setDeleting(false);
    }
  }

  function handleCopy() {
    void navigator.clipboard.writeText(note.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{
      border: `1px solid ${N_BORDER_MED}`,
      borderRadius: "4px",
      background: "white",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div
        style={{ padding: "14px 16px 12px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "10px" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <FileText style={{ width: "15px", height: "15px", color: N_SUBTLE, flexShrink: 0, marginTop: "2px" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "14px", fontWeight: 600, color: N_FG, margin: "0 0 3px", lineHeight: 1.4 }}>
            {note.title}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", color: N_SUBTLE }}>{formatDate(note.savedAt)}</span>
            {note.nicheName && (
              <span style={{
                fontSize: "11px",
                padding: "1px 6px",
                borderRadius: "3px",
                background: N_ACTIVE,
                color: N_MUTED,
                fontWeight: 500,
              }}>
                {note.nicheName}
              </span>
            )}
          </div>
        </div>
        <span style={{ color: N_SUBTLE, flexShrink: 0, marginTop: "2px" }}>
          {expanded
            ? <ChevronUp style={{ width: "14px", height: "14px" }} />
            : <ChevronDown style={{ width: "14px", height: "14px" }} />
          }
        </span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${N_BORDER}` }}>
          <div style={{ padding: "16px 20px" }}>
            {renderMarkdown(note.content)}
          </div>
          <div style={{ borderTop: `1px solid ${N_BORDER}`, padding: "8px 16px", display: "flex", gap: "8px" }}>
            <button
              onClick={handleCopy}
              style={{
                fontSize: "12px", color: N_MUTED, background: "transparent",
                border: `1px solid ${N_BORDER_MED}`, borderRadius: "3px",
                padding: "3px 10px", cursor: "pointer", fontFamily: N_FONT,
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={() => void handleDelete()}
              disabled={deleting}
              style={{
                fontSize: "12px", color: "#ef4444", background: "transparent",
                border: "1px solid rgba(239,68,68,0.2)", borderRadius: "3px",
                padding: "3px 10px", cursor: deleting ? "default" : "pointer",
                display: "flex", alignItems: "center", gap: "4px", fontFamily: N_FONT,
              }}
            >
              <Trash2 style={{ width: "11px", height: "11px" }} />
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotesPage() {
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void fetch("/api/members/notes")
      .then((r) => r.json() as Promise<{ notes: ResearchNote[] }>)
      .then(({ notes: n }) => setNotes(n ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const filtered = search.trim()
    ? notes.filter((n) =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase()) ||
        n.nicheName?.toLowerCase().includes(search.toLowerCase())
      )
    : notes;

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "40px 24px", fontFamily: N_FONT }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: N_FG, margin: "0 0 6px" }}>
          Saved Research
        </h1>
        <p style={{ fontSize: "14px", color: N_MUTED, margin: 0 }}>
          Notes saved from the research assistant. Click any note to expand and read it.
        </p>
      </div>

      {/* Search */}
      {notes.length > 3 && (
        <div style={{ position: "relative", marginBottom: "20px" }}>
          <Search style={{
            position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)",
            width: "14px", height: "14px", color: N_SUBTLE,
          }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            style={{
              width: "100%", padding: "8px 12px 8px 32px", fontSize: "14px",
              border: `1px solid ${N_BORDER_MED}`, borderRadius: "4px",
              color: N_FG, fontFamily: N_FONT, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* Notes list */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ border: `1px solid ${N_BORDER_MED}`, borderRadius: "4px", padding: "16px" }} className="animate-pulse">
              <div style={{ height: "14px", background: "rgba(55,53,47,0.07)", borderRadius: "2px", width: "45%", marginBottom: "8px" }} />
              <div style={{ height: "11px", background: "rgba(55,53,47,0.05)", borderRadius: "2px", width: "25%" }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: N_SUBTLE }}>
          <FileText style={{ width: "36px", height: "36px", margin: "0 auto 12px", display: "block" }} />
          <p style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 6px" }}>
            {search ? "No notes match your search" : "No saved notes yet"}
          </p>
          <p style={{ fontSize: "13px", margin: 0 }}>
            {search ? "Try a different keyword" : "Go to the Research Assistant and save an informational answer as a note"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((note) => (
            <NoteCard key={note.id} note={note} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
