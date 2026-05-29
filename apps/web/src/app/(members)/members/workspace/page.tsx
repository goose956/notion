"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, ExternalLink, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import type {
  WorkspaceDatabase,
  WorkspaceRow,
  WorkspaceResponse,
} from "@/app/api/members/workspace/route";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_ACTIVE, N_FONT } from "@/lib/workspace-tokens";
import { NICHE_REGISTRY, isVirtualTab, getDefaultTabId, getHiddenDbIds, getNicheEntry, showsSavedResearch, type NicheAccent, type NicheSidebarTab } from "@/lib/niche-registry";
import type { ResearchNote } from "@/app/api/members/notes/route";
import { DatabaseTable } from "@/components/workspace/database-table";
import { DocumentsView } from "@/components/workspace/documents-view";
import { WeddingNicheShell } from "@/components/niches/wedding-planner/shell";

// ─── Reusable sidebar tab button ─────────────────────────────────────────────
// Driven by registry data — no per-niche JSX needed.
function NicheSidebarTabBtn({
  tab,
  accent,
  activeTab,
  databases,
  onSelect,
}: {
  tab: NicheSidebarTab;
  accent: NicheAccent;
  activeTab: string;
  databases: WorkspaceDatabase[];
  onSelect: (tabId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const active = activeTab === tab.tabId;
  const disabled = tab.requiresDbId !== undefined &&
    !databases.some((d) => d.dbId === tab.requiresDbId);
  const bg = active ? accent.bgActive : hovered && !disabled ? accent.bgHover : "none";
  return (
    <button
      onClick={() => !disabled && onSelect(tab.tabId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "7px",
        width: "100%",
        padding: "5px 10px 5px 20px",
        borderRadius: "0 4px 4px 0",
        border: "none",
        borderLeft: active ? `2px solid ${accent.hex}` : "2px solid transparent",
        fontSize: "13px",
        color: active ? accent.fgActive : N_FG,
        background: bg,
        fontFamily: N_FONT,
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{ fontSize: "14px", flexShrink: 0 }}>{tab.icon}</span>
      {tab.label}
    </button>
  );
}

// ─── Database row button in the sidebar ───────────────────────────────────────
function DbRowButton({
  db,
  active,
  accent,
  onSelect,
}: {
  db: WorkspaceDatabase;
  active: boolean;
  accent: import("@/lib/niche-registry").NicheAccent | null;
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const bg = active ? (accent?.bgActive ?? N_ACTIVE) : hovered ? (accent?.bgHover ?? "rgba(55,53,47,0.06)") : "none";
  return (
    <button
      onClick={() => onSelect(db.notionId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "7px",
        width: "100%",
        padding: "5px 10px 5px 20px",
        background: bg,
        border: "none",
        borderLeft: accent ? (active ? `2px solid ${accent.hex}` : "2px solid transparent") : "none",
        cursor: "pointer",
        fontSize: "13px",
        color: active && accent ? accent.fgActive : N_FG,
        fontFamily: N_FONT,
        textAlign: "left",
        borderRadius: "0 4px 4px 0",
      }}
    >
      <span style={{ fontSize: "14px", flexShrink: 0 }}>{db.icon ?? "📋"}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: active ? 500 : 400 }}>
        {db.dbName}
      </span>
      <span style={{ marginLeft: "auto", fontSize: "11px", color: N_SUBTLE, flexShrink: 0 }}>
        {db.rows.length}
      </span>
    </button>
  );
}

// ─── Saved research panel (rendered inside Documents DB) ──────────────────────

function SavedResearchPanel({
  notes,
  loaded,
  onDelete,
}: {
  notes: ResearchNote[];
  loaded: boolean;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: `1px solid ${N_BORDER}` }}>
      <h2 style={{ fontSize: "14px", fontWeight: 700, color: N_FG, margin: "0 0 12px", letterSpacing: "0.01em" }}>
        📄 Saved Research
      </h2>

      {!loaded ? (
        <p style={{ fontSize: "13px", color: N_MUTED }}>Loading…</p>
      ) : notes.length === 0 ? (
        <p style={{ fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          No saved research yet. Use the Research Assistant to find information, then save it as a note.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                border: `1px solid ${N_BORDER_MED}`,
                borderRadius: "4px",
                background: "white",
                overflow: "hidden",
              }}
            >
              {/* Header row */}
              <div
                style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                onClick={() => setExpanded((prev) => (prev === note.id ? null : note.id))}
              >
                <span style={{ fontSize: "14px", flexShrink: 0 }}>📄</span>
                <span style={{ flex: 1, fontSize: "13px", fontWeight: 500, color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {note.title}
                </span>
                <span style={{ fontSize: "11px", color: N_SUBTLE, flexShrink: 0 }}>{formatDate(note.savedAt)}</span>
                <span style={{ fontSize: "11px", color: N_SUBTLE, flexShrink: 0 }}>{expanded === note.id ? "▲" : "▼"}</span>
              </div>

              {/* Expanded content */}
              {expanded === note.id && (
                <div style={{ borderTop: `1px solid ${N_BORDER}`, padding: "14px 16px" }}>
                  <div style={{ fontSize: "13px", color: N_FG, lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: "12px" }}>
                    {note.content}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(note.content);
                        setCopied(note.id);
                        setTimeout(() => setCopied(null), 1500);
                      }}
                      style={{ fontSize: "12px", color: N_MUTED, background: "transparent", border: `1px solid ${N_BORDER_MED}`, borderRadius: "3px", padding: "3px 10px", cursor: "pointer", fontFamily: N_FONT }}
                    >
                      {copied === note.id ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={() => onDelete(note.id)}
                      style={{ fontSize: "12px", color: "#ef4444", background: "transparent", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "3px", padding: "3px 10px", cursor: "pointer", fontFamily: N_FONT }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

  const [apiWeddingCriteria, setApiWeddingCriteria] = useState<Record<string, unknown> | null>(null);
  const [seatedGuestIds, setSeatedGuestIds] = useState<Set<string>>(new Set());
  const lastUrlSelectionKeyRef = useRef<string>("");

  // ── Saved research notes ───────────────────────────────────────────────────
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);

  useEffect(() => {
    void fetch("/api/members/notes")
      .then((r) => r.json() as Promise<{ notes: ResearchNote[] }>)
      .then(({ notes: n }) => { setNotes(n ?? []); setNotesLoaded(true); })
      .catch(() => setNotesLoaded(true));
  }, []);

  function handleNoteDelete(id: string) {
    void fetch(`/api/members/notes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  // ── Notion sync state ──────────────────────────────────────────────────────
  const [syncingNiches, setSyncingNiches] = useState<Set<string>>(new Set());
  const [syncResults, setSyncResults] = useState<Record<string, string>>({});
  const [schedules, setSchedules] = useState<Record<string, string>>({});

  async function pushToNotion(nicheId: string) {
    setSyncingNiches((prev) => new Set([...prev, nicheId]));
    setSyncResults((prev) => ({ ...prev, [nicheId]: "" }));
    try {
      const res = await fetch("/api/members/sync-to-notion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicheId }),
      });
      const data = await res.json() as { ok?: boolean; created?: number; updated?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setSyncResults((prev) => ({
        ...prev,
        [nicheId]: `✓ ${data.created ?? 0} created, ${data.updated ?? 0} updated`,
      }));
    } catch (err) {
      setSyncResults((prev) => ({
        ...prev,
        [nicheId]: err instanceof Error ? err.message : "Sync failed",
      }));
    } finally {
      setSyncingNiches((prev) => { const s = new Set(prev); s.delete(nicheId); return s; });
    }
  }

  async function saveSchedule(nicheId: string, schedule: string) {
    setSchedules((prev) => ({ ...prev, [nicheId]: schedule }));
    await fetch("/api/members/sync-to-notion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nicheId, schedule }),
    }).catch(() => undefined);
  }

  // Load schedules when niches are known
  useEffect(() => {
    const nicheIds = [...new Set(databases.map((d) => d.nicheId))];
    for (const nicheId of nicheIds) {
      if (schedules[nicheId] !== undefined) continue;
      fetch(`/api/members/sync-to-notion?nicheId=${encodeURIComponent(nicheId)}`)
        .then((r) => r.json())
        .then((d: { schedule?: string }) => {
          if (d.schedule) setSchedules((prev) => ({ ...prev, [nicheId]: d.schedule! }));
        })
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [databases]);

  function applyRequestedSelection(
    nextDatabases: WorkspaceDatabase[],
    nextBackend: "app" | "notion" = backend,
  ) {
    // If a specific database was requested via URL params, jump straight to it
    if (nicheIdParam || dbIdParam) {
      const requestedDb = nextDatabases.find((d) =>
        (nicheIdParam ? d.nicheId === nicheIdParam : true) &&
        (dbIdParam ? d.dbId === dbIdParam : true),
      );
      if (requestedDb) {
        setActiveTab(requestedDb.notionId);
        return;
      }
    }

    // No specific URL request — use the niche registry default tab (e.g. dashboard)
    if (nextBackend === "app") {
      const defaultTab = getDefaultTabId(nextDatabases);
      if (defaultTab) {
        setActiveTab((prev) => (prev ? prev : defaultTab));
        return;
      }
    }

    // Final fallback — select first database
    if (nextDatabases.length > 0) {
      setActiveTab((prev) => {
        if (isVirtualTab(prev) && nextBackend === "app") return prev;
        if (prev && nextDatabases.some((d) => d.notionId === prev)) return prev;
        return nextDatabases[0]!.notionId;
      });
    }
  }

  function preserveCurrentSelection(
    nextDatabases: WorkspaceDatabase[],
    nextBackend: "app" | "notion",
  ) {
    setActiveTab((prev) => {
      if (isVirtualTab(prev) && nextBackend === "app") return prev;
      if (prev && nextDatabases.some((d) => d.notionId === prev)) return prev;
      const defaultTab = getDefaultTabId(nextDatabases);
      if (nextBackend === "app" && defaultTab) return defaultTab;
      return nextDatabases[0]?.notionId ?? "";
    });
  }

  async function loadDatabases(options?: { isRefresh?: boolean; selectionMode?: "initial" | "preserve" }) {
    const isRefresh = options?.isRefresh ?? false;
    const selectionMode = options?.selectionMode ?? "preserve";
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/members/workspace");
      if (!res.ok) throw new Error("Failed to load workspace data");
      const data = (await res.json()) as WorkspaceResponse;
      setDatabases(data.databases);
      setBackend(data.backend);
      setApiWeddingCriteria(data.weddingCriteria ?? null);

      // Auto-expand all niches and select first tab
      const nicheIds = [...new Set(data.databases.map((d) => d.nicheId))];
      setExpandedNiches(new Set(nicheIds));
      if (selectionMode === "initial") {
        applyRequestedSelection(data.databases, data.backend);
      } else {
        preserveCurrentSelection(data.databases, data.backend);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setApiWeddingCriteria(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDatabases({ selectionMode: "initial" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll every 30 s on the Notion backend only — Notion data can change
  // externally so we need to keep it fresh. For the app backend, all writes
  // go through this session, so polling would just race with optimistic state
  // and cause rows to appear to vanish.
  useEffect(() => {
    if (backend !== "notion") return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadDatabases({ isRefresh: true, selectionMode: "preserve" });
      }
    }, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend]);

  useEffect(() => {
    if (databases.length === 0) return;
    const key = `${nicheIdParam ?? ""}::${dbIdParam ?? ""}`;
    if (key === lastUrlSelectionKeyRef.current) return;
    lastUrlSelectionKeyRef.current = key;
    if (!nicheIdParam && !dbIdParam) return;
    applyRequestedSelection(databases, backend);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nicheIdParam, dbIdParam, databases, backend]);

  // No auto-reload on dashboard open – dashboard reads directly from `databases`
  // state which is kept up-to-date by handleRowUpdated / handleRowAdded.
  // A full reload would replace optimistic local state and make edits disappear.

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

  const visibleDatabases = databases.filter((db) => !getHiddenDbIds(db.nicheId).includes(db.dbId));

  // Group databases by niche
  const nicheGroups: Array<{ nicheId: string; nicheName: string; dbs: WorkspaceDatabase[] }> = [];
  for (const db of visibleDatabases) {
    const existing = nicheGroups.find((g) => g.nicheId === db.nicheId);
    if (existing) {
      existing.dbs.push(db);
    } else {
      nicheGroups.push({ nicheId: db.nicheId, nicheName: db.nicheName, dbs: [db] });
    }
  }

  const activeDb = databases.find((d) => d.notionId === activeTab) ?? null;

  // Inject virtual properties for specific DBs as declared in the niche registry
  const activeDbDisplay: WorkspaceDatabase | null = (() => {
    if (!activeDb || backend !== "app") return activeDb;
    const injections = getNicheEntry(activeDb.nicheId)?.dbPropertyInjections?.[activeDb.dbId] ?? [];
    if (injections.length === 0) return activeDb;
    return {
      ...activeDb,
      properties: injections.reduce(
        (props, inj) => props.some((p) => p.name === inj.name) ? props : [...props, inj],
        activeDb.properties,
      ),
    };
  })();

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
          background: "white",
          overflow: "hidden",
        }}
      >
        {/* Scrollable nav area */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div
          style={{
            padding: "14px 14px 10px",
            borderBottom: `1px solid ${N_BORDER}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 700, color: N_FG, letterSpacing: "0.01em" }}>🗂️ My Workspace</span>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              onClick={() => void loadDatabases({ isRefresh: true, selectionMode: "preserve" })}
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
          const nicheEntry = getNicheEntry(group.nicheId);
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
                  background: nicheEntry?.accent.bgGroupHeader ?? "none",
                  border: "none",
                  borderTop: nicheEntry?.accent.borderTop ?? "none",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: nicheEntry?.accent.fgActive ?? N_SUBTLE,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontFamily: N_FONT,
                  textAlign: "left",
                }}
              >
                {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                {nicheEntry?.sidebarEmoji ? `${nicheEntry.sidebarEmoji} ` : ""}{group.nicheName}
              </button>

              {expanded && backend === "app" && nicheEntry?.topTabs.map((tab) => (
                <NicheSidebarTabBtn
                  key={tab.tabId}
                  tab={tab}
                  accent={nicheEntry.accent}
                  activeTab={activeTab}
                  databases={databases}
                  onSelect={setActiveTab}
                />
              ))}
              {expanded &&
                group.dbs.map((db) => {
                  const active = activeTab === db.notionId;
                  const isAnchor = nicheEntry?.afterDbNamePattern?.test(db.dbName) ?? false;
                  return (
                    <div key={db.notionId}>
                      <DbRowButton
                        db={db}
                        active={active}
                        accent={nicheEntry?.accent ?? null}
                        onSelect={setActiveTab}
                      />
                      {backend === "app" && isAnchor && nicheEntry?.afterDbTabs?.map((tab) => (
                        <NicheSidebarTabBtn
                          key={tab.tabId}
                          tab={tab}
                          accent={nicheEntry.accent}
                          activeTab={activeTab}
                          databases={databases}
                          onSelect={setActiveTab}
                        />
                      ))}
                    </div>
                  );
                })}
            </div>
          );
        })}
        </div>{/* end scrollable nav area */}

        {/* ── Notion sync footer — quiet, out of the way ─────────────────── */}
        {backend === "app" && nicheGroups.length > 0 && (
          <div style={{ borderTop: `1px solid ${N_BORDER}`, padding: "8px 10px", flexShrink: 0 }}>
            {nicheGroups.map((group) => (
              <div key={group.nicheId} style={{ marginBottom: nicheGroups.length > 1 ? "6px" : 0 }}>
                {nicheGroups.length > 1 && (
                  <p style={{ fontSize: "10px", fontWeight: 600, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>
                    {group.nicheName}
                  </p>
                )}
                <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                  <button
                    onClick={() => void pushToNotion(group.nicheId)}
                    disabled={syncingNiches.has(group.nicheId)}
                    title="Copy workspace data to Notion"
                    style={{
                      flex: 1,
                      padding: "4px 6px",
                      borderRadius: "4px",
                      border: "1px solid rgba(35,131,226,0.4)",
                      background: "rgba(35,131,226,0.08)",
                      fontSize: "11px",
                      color: "rgb(35,131,226)",
                      cursor: syncingNiches.has(group.nicheId) ? "default" : "pointer",
                      fontFamily: N_FONT,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      opacity: syncingNiches.has(group.nicheId) ? 0.6 : 1,
                    }}
                  >
                    {syncingNiches.has(group.nicheId)
                      ? <><Loader2 size={9} style={{ animation: "spin 1s linear infinite" }} /> Syncing…</>
                      : <><RefreshCw size={9} /> Push to Notion</>
                    }
                  </button>
                  <select
                    value={schedules[group.nicheId] ?? "off"}
                    onChange={(e) => void saveSchedule(group.nicheId, e.target.value)}
                    title="Auto-sync schedule"
                    style={{
                      padding: "4px 4px",
                      borderRadius: "4px",
                      border: `1px solid ${N_BORDER_MED}`,
                      fontSize: "10px",
                      color: N_SUBTLE,
                      background: "transparent",
                      fontFamily: N_FONT,
                      cursor: "pointer",
                      maxWidth: "74px",
                    }}
                  >
                    <option value="off">Off</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                {syncResults[group.nicheId] && (
                  <p style={{ margin: "3px 0 0", fontSize: "10px", color: syncResults[group.nicheId]?.startsWith("✓") ? "rgb(15,123,108)" : "rgb(220,38,38)" }}>
                    {syncResults[group.nicheId]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
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
              onClick={() => void loadDatabases({ selectionMode: "preserve" })}
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
        ) : (
          <>
            {/* Always-mounted niche shells. Each shell returns null when its
                tabs are not active, but stays mounted to preserve state. */}
            {NICHE_REGISTRY.map((entry) => {
              if (!databases.some((d) => d.nicheId === entry.nicheId) || backend !== "app") return null;
              if (entry.nicheId === "wedding-planner") return (
                <WeddingNicheShell
                  key="wedding-planner"
                  activeTab={activeTab}
                  databases={databases}
                  apiWeddingCriteria={apiWeddingCriteria}
                  onRowAdded={handleRowAdded}
                  onRowUpdated={handleRowUpdated}
                  onRowDeleted={handleRowDeleted}
                  onSeatedIdsChanged={setSeatedGuestIds}
                />
              );
              return null; // placeholder for future niches
            })}
            {/* DB table view — only when active tab is a real database row */}
            {!isVirtualTab(activeTab) && activeDbDisplay && (
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
                    background: (() => {
                      const accent = getNicheEntry(activeDbDisplay.nicheId)?.accent;
                      return accent ? `linear-gradient(135deg, white 0%, ${accent.bgHover} 100%)` : "white";
                    })(),
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

                {/* Table / Documents view */}
                {backend === "app" && activeDbDisplay.dbId === "documents" ? (
                  <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <DocumentsView
                      db={activeDbDisplay}
                      onRowAdded={(row) => handleRowAdded(activeDbDisplay.notionId, row)}
                      onRowUpdated={(pageId, name, val) =>
                        handleRowUpdated(activeDbDisplay.notionId, pageId, name, val)
                      }
                      onRowDeleted={(pageId) => handleRowDeleted(activeDbDisplay.notionId, pageId)}
                    />
                  </div>
                ) : (
                  <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
                    <DatabaseTable
                      db={activeDbDisplay}
                      isAppBackend={backend === "app"}
                      {...(activeDbDisplay.dbId === "guests" ? { seatedGuestIds } : {})}
                      onRowUpdated={(pageId, name, val) =>
                        handleRowUpdated(activeDbDisplay.notionId, pageId, name, val)
                      }
                      onRowDeleted={(pageId) => handleRowDeleted(activeDbDisplay.notionId, pageId)}
                      onRowAdded={(row) => handleRowAdded(activeDbDisplay.notionId, row)}
                    />

                    {/* Saved research notes — shown inside the Documents DB */}
                    {showsSavedResearch(activeDbDisplay.nicheId, activeDbDisplay.dbId) && (
                      <SavedResearchPanel
                        notes={notes.filter((n) => n.nicheId === activeDbDisplay.nicheId)}
                        loaded={notesLoaded}
                        onDelete={handleNoteDelete}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}
