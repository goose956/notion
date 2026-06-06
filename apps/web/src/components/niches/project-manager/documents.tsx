"use client";
import { useState, useMemo } from "react";
import { Plus, ExternalLink, Trash2, Pencil, Check, X } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const ACCENT = "#4f46e5";

const DOC_TYPES = ["Link", "Note", "Brief", "Spec", "Contract", "Reference", "Other"] as const;

const TYPE_COLORS: Record<string, string> = {
  "Link":       "rgba(59,130,246,0.12)",
  "Note":       "rgba(234,179,8,0.12)",
  "Brief":      "rgba(139,92,246,0.12)",
  "Spec":       "rgba(249,115,22,0.12)",
  "Contract":   "rgba(239,68,68,0.12)",
  "Reference":  "rgba(107,114,128,0.12)",
  "Other":      "rgba(107,114,128,0.08)",
};
const TYPE_TEXT: Record<string, string> = {
  "Link":       "#1d4ed8",
  "Note":       "#854d0e",
  "Brief":      "#6d28d9",
  "Spec":       "#c2410c",
  "Contract":   "#b91c1c",
  "Reference":  "#374151",
  "Other":      "#374151",
};

function asText(v: unknown): string { return v == null ? "" : String(v); }
function getRowProp(row: WorkspaceRow, name: string): string {
  return asText(row.properties?.[name] ?? "");
}

interface EditState {
  title: string;
  project: string;
  type: string;
  url: string;
  notes: string;
}

export function PMDocuments({
  documentsDb,
  projectsDb,
  onRowAdded,
  onRowUpdated,
  onRowDeleted,
}: {
  documentsDb: WorkspaceDatabase | null;
  projectsDb: WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
  onRowUpdated: (dbNotionId: string, pageId: string, name: string, val: string | number | boolean | null) => void;
  onRowDeleted: (dbNotionId: string, pageId: string) => void;
}) {
  const projects = useMemo(
    () => (projectsDb?.rows ?? []).map((r) => getRowProp(r, "Name")).filter(Boolean),
    [projectsDb]
  );

  // If the DB hasn't been provisioned yet, prompt a reload — self-heal creates it on first workspace load
  if (!documentsDb) {
    return (
      <div style={{ fontFamily: N_FONT, textAlign: "center", padding: "60px 24px", color: N_MUTED }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📎</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: N_FG, marginBottom: 6 }}>Documents not loaded yet</div>
        <div style={{ fontSize: 13, marginBottom: 16 }}>This database is created on your first workspace visit. Please reload the page.</div>
        <button onClick={() => window.location.reload()} style={{ padding: "8px 20px", borderRadius: 8, background: ACCENT, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: N_FONT }}>
          Reload
        </button>
      </div>
    );
  }

  const docs = documentsDb.rows;

  const [filterProject, setFilterProject] = useState("All");
  const [filterType, setFilterType] = useState("All");

  // Add form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [type, setType] = useState<string>("Link");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit state — keyed by pageId
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ title: "", project: "", type: "", url: "", notes: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      const proj = getRowProp(d, "Project");
      const typ  = getRowProp(d, "Type");
      if (filterProject !== "All" && proj !== filterProject) return false;
      if (filterType !== "All" && typ !== filterType) return false;
      return true;
    });
  }, [docs, filterProject, filterType]);

  function startEdit(doc: WorkspaceRow) {
    setEditingId(doc.pageId);
    setEditState({
      title:   getRowProp(doc, "Title"),
      project: getRowProp(doc, "Project"),
      type:    getRowProp(doc, "Type") || "Note",
      url:     getRowProp(doc, "URL"),
      notes:   getRowProp(doc, "Notes"),
    });
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError(null);
  }

  async function handleAdd() {
    if (!title.trim()) return;
    if (!documentsDb) return;
    setSaving(true);
    setError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: documentsDb.notionId,
          properties: {
            Title:        title.trim(),
            Project:      project,
            Type:         type,
            URL:          url.trim(),
            Notes:        notes.trim(),
            "Date Added": today,
          },
          propertyTypes: {
            Title:        "title",
            Project:      "rich_text",
            Type:         "select",
            URL:          "rich_text",
            Notes:        "rich_text",
            "Date Added": "date",
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json() as { pageId?: string };
      if (data.pageId) {
        onRowAdded(documentsDb.notionId, {
          pageId: data.pageId,
          properties: {
            Title:        title.trim(),
            Project:      project,
            Type:         type,
            URL:          url.trim(),
            Notes:        notes.trim(),
            "Date Added": today,
          },
        });
      }
      setTitle(""); setProject(""); setType("Link"); setUrl(""); setNotes("");
      setShowForm(false);
    } catch {
      setError("Failed to save document. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(pageId: string) {
    if (!editState.title.trim() || !documentsDb) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const props = {
        Title:   editState.title.trim(),
        Project: editState.project,
        Type:    editState.type,
        URL:     editState.url.trim(),
        Notes:   editState.notes.trim(),
      };
      const res = await fetch(`/api/members/workspace/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: props,
          propertyTypes: {
            Title:   "title",
            Project: "rich_text",
            Type:    "select",
            URL:     "rich_text",
            Notes:   "rich_text",
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      // Propagate each field change to the parent state
      for (const [name, val] of Object.entries(props)) {
        onRowUpdated(documentsDb.notionId, pageId, name, val);
      }
      setEditingId(null);
    } catch {
      setEditError("Failed to save. Please try again.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(pageId: string) {
    if (!documentsDb) return;
    setDeletingId(pageId);
    try {
      await fetch(`/api/members/workspace/${pageId}`, { method: "DELETE" });
      onRowDeleted(documentsDb.notionId, pageId);
    } finally {
      setDeletingId(null);
    }
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: N_FONT, fontSize: 13, color: N_FG,
    background: "#fff", border: `1px solid ${N_BORDER}`,
    borderRadius: 8, padding: "8px 10px", width: "100%", outline: "none",
    boxSizing: "border-box",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

  return (
    <div style={{ fontFamily: N_FONT, color: N_FG, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Documents</div>
          <div style={{ fontSize: 13, color: N_MUTED, marginTop: 2 }}>
            Save links, notes, and reference files — attached to a project.
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8,
            background: showForm ? N_SUBTLE : ACCENT,
            color: showForm ? N_FG : "#fff",
            border: showForm ? `1px solid ${N_BORDER}` : "none",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: N_FONT,
          }}
        >
          <Plus size={14} />
          {showForm ? "Cancel" : "Add Document"}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{
          background: N_SUBTLE, border: `1px solid ${N_BORDER}`,
          borderRadius: 12, padding: "18px 20px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: N_MUTED }}>Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Competitor pricing page" style={inputStyle} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: N_MUTED }}>Project</label>
              <select value={project} onChange={(e) => setProject(e.target.value)} style={selectStyle}>
                <option value="">No project</option>
                {projects.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: N_MUTED }}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} style={selectStyle}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: N_MUTED }}>URL</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: N_MUTED }}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Key takeaways, context, or anything worth remembering..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
          {error && <div style={{ fontSize: 12, color: "#dc2626" }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleAdd} disabled={saving || !title.trim()} style={{ padding: "8px 20px", borderRadius: 8, background: ACCENT, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: saving || !title.trim() ? "not-allowed" : "pointer", opacity: saving || !title.trim() ? 0.6 : 1, fontFamily: N_FONT }}>
              {saving ? "Saving…" : "Save Document"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      {docs.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: N_MUTED, fontWeight: 600 }}>Filter:</span>
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} style={{ ...selectStyle, width: "auto", padding: "5px 10px", fontSize: 12 }}>
            <option value="All">All projects</option>
            {projects.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...selectStyle, width: "auto", padding: "5px 10px", fontSize: 12 }}>
            <option value="All">All types</option>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}

      {/* Document list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", background: N_SUBTLE, borderRadius: 12, border: `1px dashed ${N_BORDER}` }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No documents yet</div>
          <div style={{ fontSize: 13, color: N_MUTED }}>Save links, notes, briefs, and specs — keep everything linked to the right project.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((doc) => {
            const isEditing = editingId === doc.pageId;

            if (isEditing) {
              return (
                <div key={doc.pageId} style={{ background: "#fff", border: `2px solid ${ACCENT}`, borderRadius: 10, padding: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: N_MUTED }}>Title *</label>
                      <input value={editState.title} onChange={(e) => setEditState((s) => ({ ...s, title: e.target.value }))} style={inputStyle} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: N_MUTED }}>Project</label>
                      <select value={editState.project} onChange={(e) => setEditState((s) => ({ ...s, project: e.target.value }))} style={selectStyle}>
                        <option value="">No project</option>
                        {projects.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: N_MUTED }}>Type</label>
                      <select value={editState.type} onChange={(e) => setEditState((s) => ({ ...s, type: e.target.value }))} style={selectStyle}>
                        {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: N_MUTED }}>URL</label>
                      <input value={editState.url} onChange={(e) => setEditState((s) => ({ ...s, url: e.target.value }))} placeholder="https://..." style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: N_MUTED }}>Notes</label>
                    <textarea value={editState.notes} onChange={(e) => setEditState((s) => ({ ...s, notes: e.target.value }))} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
                  </div>
                  {editError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 8 }}>{editError}</div>}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={cancelEdit} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, background: "none", border: `1px solid ${N_BORDER}`, fontSize: 12, color: N_MUTED, cursor: "pointer", fontFamily: N_FONT }}>
                      <X size={12} /> Cancel
                    </button>
                    <button onClick={() => void handleSaveEdit(doc.pageId)} disabled={editSaving || !editState.title.trim()} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 6, background: ACCENT, border: "none", fontSize: 12, fontWeight: 600, color: "#fff", cursor: editSaving || !editState.title.trim() ? "not-allowed" : "pointer", opacity: editSaving || !editState.title.trim() ? 0.6 : 1, fontFamily: N_FONT }}>
                      <Check size={12} /> {editSaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              );
            }

            const docTitle   = getRowProp(doc, "Title");
            const docProject = getRowProp(doc, "Project");
            const docType    = getRowProp(doc, "Type");
            const docUrl     = getRowProp(doc, "URL");
            const docNotes   = getRowProp(doc, "Notes");
            const docDate    = getRowProp(doc, "Date Added");

            return (
              <div key={doc.pageId} style={{ background: "#fff", border: `1px solid ${N_BORDER}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{docTitle}</span>
                    {docType && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: TYPE_COLORS[docType] ?? TYPE_COLORS["Other"], color: TYPE_TEXT[docType] ?? TYPE_TEXT["Other"] }}>
                        {docType}
                      </span>
                    )}
                    {docProject && (
                      <span style={{ fontSize: 11, color: N_MUTED, background: N_SUBTLE, border: `1px solid ${N_BORDER}`, padding: "2px 8px", borderRadius: 99 }}>
                        {docProject}
                      </span>
                    )}
                  </div>
                  {docNotes && (
                    <div style={{ fontSize: 13, color: N_MUTED, marginTop: 5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {docNotes.length > 300 ? docNotes.slice(0, 300) + "…" : docNotes}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                    {docUrl && (
                      <a href={docUrl.startsWith("http") ? docUrl : `https://${docUrl}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: ACCENT, textDecoration: "none", fontWeight: 500 }}>
                        <ExternalLink size={12} /> Open link
                      </a>
                    )}
                    {docDate && <span style={{ fontSize: 12, color: N_MUTED }}>{docDate}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => startEdit(doc)} title="Edit" style={{ background: "none", border: "none", cursor: "pointer", color: N_MUTED, padding: 4, borderRadius: 6 }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(doc.pageId)} disabled={deletingId === doc.pageId} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: N_MUTED, padding: 4, borderRadius: 6, opacity: deletingId === doc.pageId ? 0.4 : 1 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
