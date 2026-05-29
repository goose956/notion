"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUp,
  Globe,
  Link2,
  Loader2,
  DatabaseZap,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─── Notion design tokens ─────────────────────────────────────────────────────

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_BORDER_MED = "rgba(55,53,47,0.16)";
const N_ACTIVE = "rgba(55,53,47,0.08)";
const N_BLUE = "rgb(35,131,226)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolActivity {
  name: string;
  args: Record<string, unknown>;
  done: boolean;
}

interface DeployedDatabase {
  nicheId: string;
  nicheName: string;
  dbId: string;
  dbName: string;
  notionId: string;
}

type ResultItem = Record<string, unknown>;

type SseEvent =
  | { type: "tool_start"; name: string; args: Record<string, unknown> }
  | { type: "tool_end"; name: string }
  | { type: "text"; content: string }
  | { type: "done"; tokenUsage: { input: number; output: number } }
  | { type: "error"; message: string }
  | { type: "credits_updated"; credits: number };

// ─── Markdown renderer (lightweight, no deps) ─────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let key = 0;

  function inlineFormat(line: string): React.ReactNode {
    // Bold **text** and *italic*
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={i}>{part.slice(1, -1)}</em>;
      }
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
      // Collect consecutive bullet lines into a list
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseResultItems(text: string): ResultItem[] | null {
  const match = /```json\s*([\s\S]*?)```/.exec(text);
  if (!match?.[1]) return null;
  try {
    const parsed: unknown = JSON.parse(match[1]);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
      return parsed as ResultItem[];
    }
  } catch { /* not valid JSON */ }
  return null;
}

function getSummaryText(text: string): string {
  const idx = text.indexOf("```json");
  return idx === -1 ? text : text.slice(0, idx).trim();
}

function getItemTitle(item: ResultItem): string {
  for (const [key, val] of Object.entries(item)) {
    if (typeof val === "string" && val.trim() && /name|title|vendor|business|company|venue/i.test(key)) {
      return val;
    }
  }
  const first = Object.values(item).find((v) => typeof v === "string" && (v as string).trim());
  return typeof first === "string" ? first : "Unnamed";
}

const TOOL_LABELS: Record<string, string> = {
  web_search: "Searching the web",
  fetch_url: "Reading URL",
  notion_query: "Querying Notion",
  notion_create: "Saving to Notion",
  notion_write: "Updating Notion",
  notion_archive: "Removing from Notion",
};

const TOOL_ICON: Record<string, React.ReactNode> = {
  web_search: <Globe style={{ width: "12px", height: "12px" }} />,
  fetch_url: <Link2 style={{ width: "12px", height: "12px" }} />,
  notion_query: <DatabaseZap style={{ width: "12px", height: "12px" }} />,
  notion_create: <DatabaseZap style={{ width: "12px", height: "12px" }} />,
  notion_write: <DatabaseZap style={{ width: "12px", height: "12px" }} />,
  notion_archive: <DatabaseZap style={{ width: "12px", height: "12px" }} />,
};

function resolveToolLabel(name: string, args: Record<string, unknown>): string {
  if (name === "web_search" && typeof args["query"] === "string") {
    return `Searching "${args["query"]}"`;
  }
  if (name === "fetch_url" && typeof args["url"] === "string") {
    try { return `Reading ${new URL(args["url"] as string).hostname}`; } catch { return "Reading URL"; }
  }
  return TOOL_LABELS[name] ?? `Running ${name}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActivityFeed({ items, isLoading }: { items: ToolActivity[]; isLoading: boolean }) {
  if (items.length === 0 && !isLoading) return null;
  return (
    <div style={{ padding: "10px 16px 12px", borderBottom: `1px solid ${N_BORDER}` }}>
      <p style={{ fontSize: "11px", fontWeight: 500, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
        Activity
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {items.map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: a.done ? N_MUTED : N_FG }}>
            <span style={{ color: a.done ? N_SUBTLE : N_BLUE, flexShrink: 0, display: "flex" }}>
              {a.done
                ? <Check style={{ width: "12px", height: "12px" }} />
                : (TOOL_ICON[a.name] ?? <Globe style={{ width: "12px", height: "12px" }} />)
              }
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {resolveToolLabel(a.name, a.args)}
            </span>
            {!a.done && <Loader2 style={{ width: "11px", height: "11px", color: N_SUBTLE, flexShrink: 0 }} className="animate-spin" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultCard({
  item, index, added, adding, onAdd, disabled, saveLabel,
}: {
  item: ResultItem; index: number; added: boolean; adding: boolean;
  onAdd: (index: number, item: ResultItem) => void; disabled: boolean; saveLabel: string;
}) {
  const title = getItemTitle(item);
  const titleKey = Object.keys(item).find((k) => item[k] === title);
  const bodyEntries = Object.entries(item)
    .filter(([k, v]) => k !== titleKey && v !== null && v !== undefined && v !== "")
    .slice(0, 6);
  const urlVal = Object.entries(item).find(
    ([k, v]) => typeof v === "string" && /^https?:\/\//.test(v as string) && /url|website|link/i.test(k)
  )?.[1] as string | undefined;

  return (
    <div
      style={{
        background: added ? "rgba(15,123,108,0.04)" : "white",
        border: `1px solid ${added ? "rgba(15,123,108,0.3)" : N_BORDER_MED}`,
        borderRadius: "3px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
      className="hover:shadow-sm transition-shadow"
    >
      {/* Title row */}
      <div style={{ padding: "10px 12px 6px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
        <p style={{ fontSize: "14px", fontWeight: 500, color: N_FG, lineHeight: 1.4, flex: 1 }}>
          {title}
        </p>
        {urlVal && (
          <a href={urlVal} target="_blank" rel="noopener noreferrer"
            style={{ color: N_SUBTLE, flexShrink: 0, marginTop: "2px", display: "flex" }}
            title="Open website"
          >
            <ExternalLink style={{ width: "13px", height: "13px" }} />
          </a>
        )}
      </div>

      {/* Properties */}
      {bodyEntries.length > 0 && (
        <div style={{ padding: "0 12px 10px", display: "flex", flexDirection: "column", gap: "3px", flex: 1 }}>
          {bodyEntries.map(([key, val]) => (
            <div key={key} style={{ display: "flex", alignItems: "baseline", gap: "6px", minWidth: 0 }}>
              <span style={{ fontSize: "11px", color: N_SUBTLE, fontWeight: 500, whiteSpace: "nowrap", width: "88px", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                {key}
              </span>
              <span style={{ fontSize: "12px", color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {typeof val === "number" ? val.toString()
                  : Array.isArray(val) ? (val as unknown[]).join(", ")
                  : String(val)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${N_BORDER}`, padding: "6px 12px", display: "flex", justifyContent: "flex-end" }}>
        <button
          disabled={added || adding || disabled}
          onClick={() => onAdd(index, item)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "3px 10px",
            borderRadius: "3px",
            fontSize: "13px",
            fontWeight: 500,
            border: "none",
            cursor: added || adding || disabled ? "default" : "pointer",
            background: added ? "rgba(15,123,108,0.1)" : N_ACTIVE,
            color: added ? "rgb(15,123,108)" : N_FG,
            fontFamily: N_FONT,
          }}
        >
          {adding ? (
            <Loader2 style={{ width: "12px", height: "12px" }} className="animate-spin" />
          ) : added ? (
            <><Check style={{ width: "12px", height: "12px" }} /> Saved</>
          ) : (
            saveLabel
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Location helpers ─────────────────────────────────────────────────────────

const LOCATION_KEYS = ["location", "city", "area", "region", "town", "county", "market",
  "target-markets", "target_markets", "markets", "postcode", "zip", "place"];

function extractLocation(criteria: Record<string, unknown>): string | null {
  for (const key of LOCATION_KEYS) {
    const val = criteria[key];
    if (typeof val === "string" && val.trim()) {
      return val.split(",")[0]!.trim();
    }
  }
  return null;
}

interface NicheCriteriaEntry {
  nicheId: string;
  criteria: Record<string, unknown>;
}

interface SuggestedPrompt {
  text: string;
  type: "list" | "research";
}

function buildSuggestedPrompts(
  databases: DeployedDatabase[],
  criteria: NicheCriteriaEntry[],
): SuggestedPrompt[] {
  if (databases.length === 0) {
    return [
      { text: "Find wedding venues with a capacity of 100+", type: "list" },
      { text: "Search for photographers specialising in weddings", type: "list" },
      { text: "What's the average cost of a wedding photographer in London?", type: "research" },
      { text: "What should I look for when hiring a wedding caterer?", type: "research" },
    ];
  }

  const prompts: SuggestedPrompt[] = [];
  const seenNiches = new Set<string>();

  for (const db of databases) {
    if (seenNiches.has(db.nicheId)) continue;
    seenNiches.add(db.nicheId);

    const crit = criteria.find((c) => c.nicheId === db.nicheId);
    const location = crit ? extractLocation(crit.criteria) : null;
    const locSuffix = location ? ` in ${location}` : "";
    const nicheLower = db.nicheName.toLowerCase();
    const dbLower = db.dbName.toLowerCase();

    prompts.push({ text: `Find ${nicheLower} vendors${locSuffix}`, type: "list" });
    prompts.push({ text: `Search for ${dbLower}${locSuffix}`, type: "list" });
    prompts.push({ text: `What's the typical cost of ${dbLower}${locSuffix}?`, type: "research" });
    prompts.push({ text: `What should I ask when hiring ${dbLower}?`, type: "research" });
  }

  return prompts.slice(0, 8);
}

// ─── Main component ────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const nicheIdFromUrl = searchParams.get("nicheId");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toolActivity, setToolActivity] = useState<ToolActivity[]>([]);
  const [summaryText, setSummaryText] = useState<string>("");
  const [resultItems, setResultItems] = useState<ResultItem[] | null>(null);
  const [deployedDbs, setDeployedDbs] = useState<DeployedDatabase[]>([]);
  const [nicheCriteria, setNicheCriteria] = useState<NicheCriteriaEntry[]>([]);
  const [selectedNotionId, setSelectedNotionId] = useState<string>("");
  // activeNicheId tracks which niche the user is working in — sent to the API
  const [activeNicheId, setActiveNicheId] = useState<string>("");
  const [activeNicheName, setActiveNicheName] = useState<string>("");
  // Note saving
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [showNoteTitleInput, setShowNoteTitleInput] = useState(false);
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [addAllInProgress, setAddAllInProgress] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [backend, setBackend] = useState<"notion" | "app">("notion");
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  // Conversation history — persisted across sends so the model has memory
  const [history, setHistory] = useState<ChatMessage[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load deployed databases on mount
  useEffect(() => {
    void fetch("/api/members/databases")
      .then((r) => r.json() as Promise<{ databases: DeployedDatabase[]; criteria: NicheCriteriaEntry[]; backend?: "notion" | "app" }>)
      .then(({ databases, criteria, backend: b }) => {
        setDeployedDbs(databases ?? []);
        setNicheCriteria(criteria ?? []);
        if (b) setBackend(b);
        // Pre-select niche from URL param if present, otherwise pick first
        if (databases && databases.length > 0) {
          const match = nicheIdFromUrl
            ? databases.find((d) => d.nicheId === nicheIdFromUrl)
            : undefined;
          const selected = match ?? databases[0]!;
          setSelectedNotionId(selected.notionId);
          setActiveNicheId(selected.nicheId);
          setActiveNicheName(selected.nicheName);
        }
      })
      .catch(() => undefined);
  }, [nicheIdFromUrl]);

  // When the user switches the save-target database, sync activeNicheId too
  const handleDatabaseChange = useCallback((notionId: string) => {
    setSelectedNotionId(notionId);
    const db = deployedDbs.find((d) => d.notionId === notionId);
    if (db) { setActiveNicheId(db.nicheId); setActiveNicheName(db.nicheName); }
  }, [deployedDbs]);

  // Reset note state when a new search starts
  const resetNoteState = useCallback(() => {
    setNoteSaved(false);
    setSavingNote(false);
    setShowNoteTitleInput(false);
    setNoteTitle("");
  }, []);

  async function saveNote(title: string) {
    if (!title.trim() || !summaryText) return;
    setSavingNote(true);
    try {
      await fetch("/api/members/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: summaryText,
          nicheId: activeNicheId || undefined,
          nicheName: activeNicheName || undefined,
        }),
      });
      setNoteSaved(true);
      setShowNoteTitleInput(false);
    } finally {
      setSavingNote(false);
    }
  }

  const sendMessage = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || isLoading) return;

      setInput("");
      setIsLoading(true);
      setToolActivity([]);
      setSummaryText("");
      setResultItems(null);
      setAddedIndices(new Set());
      setAddError(null);
      setHasResult(false);
      resetNoteState();

      const abort = new AbortController();
      abortRef.current = abort;

      // Append user turn to history
      const updatedHistory: ChatMessage[] = [...history, { role: "user", content: trimmed }];
      setHistory(updatedHistory);

      try {
        const res = await fetch("/api/members/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedHistory,
            nicheId: activeNicheId || undefined,
          }),
          signal: abort.signal,
        });

        if (!res.ok) {
          if (res.status === 402) {
            setSummaryText("You have no credits left. Top up to continue.");
            setCredits(0);
            setHasResult(true);
            return;
          }
          throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            let event: SseEvent;
            try { event = JSON.parse(jsonStr) as SseEvent; } catch { continue; }

            if (event.type === "tool_start") {
              setToolActivity((prev) => [...prev, { name: event.name, args: event.args, done: false }]);
            } else if (event.type === "tool_end") {
              setToolActivity((prev) =>
                prev.map((a) => a.name === event.name && !a.done ? { ...a, done: true } : a),
              );
            } else if (event.type === "text") {
              fullText = event.content;
            } else if (event.type === "done") {
              const items = parseResultItems(fullText);
              setResultItems(items);
              setSummaryText(getSummaryText(fullText));
              setHasResult(true);
              // Append assistant reply to history so next turn has context
              if (fullText) {
                setHistory((prev) => [...prev, { role: "assistant", content: fullText }]);
              }
            } else if (event.type === "error") {
              setSummaryText(`Error: ${event.message}`);
              setHasResult(true);
            } else if (event.type === "credits_updated") {
              setCredits(event.credits);
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setSummaryText(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
        setHasResult(true);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
        textareaRef.current?.focus();
      }
    },
    [isLoading, history, activeNicheId, resetNoteState],
  );

  async function addToNotion(index: number, item: ResultItem) {
    if (!selectedNotionId) return;
    setAddingIndex(index);
    setAddError(null);
    try {
      const isApp = backend === "app";
      const res = await fetch(isApp ? "/api/members/workspace-save" : "/api/members/notion-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isApp
            ? { databaseId: selectedNotionId, properties: item }
            : { notionDatabaseId: selectedNotionId, properties: item },
        ),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Failed to save");
      setAddedIndices((prev) => new Set([...prev, index]));
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setAddingIndex(null);
    }
  }

  async function addAllToNotion() {
    if (!resultItems || !selectedNotionId) return;
    setAddAllInProgress(true);
    for (let i = 0; i < resultItems.length; i++) {
      if (!addedIndices.has(i) && resultItems[i]) {
        await addToNotion(i, resultItems[i]!);
      }
    }
    setAddAllInProgress(false);
  }

  const pendingCount = resultItems ? resultItems.filter((_, i) => !addedIndices.has(i)).length : 0;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: N_FONT, color: N_FG }}>

      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div
        style={{
          width: leftPanelCollapsed ? "44px" : "300px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "#EAF4FF",
          borderRight: `1px solid ${N_BORDER}`,
          transition: "width 0.18s ease",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "10px 8px 6px", borderBottom: `1px solid ${N_BORDER}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: leftPanelCollapsed ? "center" : "space-between", gap: "8px" }}>
          {!leftPanelCollapsed && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px", flexWrap: "wrap" }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: N_FG, margin: 0 }}>Research Assistant</p>
                {activeNicheName && (
                  <span style={{
                    fontSize: "11px", fontWeight: 500, padding: "1px 7px",
                    borderRadius: "10px", background: "rgba(35,131,226,0.1)",
                    color: "rgb(35,131,226)", whiteSpace: "nowrap",
                  }}>
                    {activeNicheName}
                  </span>
                )}
              </div>
              <p style={{ fontSize: "12px", color: N_MUTED, margin: 0 }}>Search the web · save to {backend === "app" ? "workspace" : "Notion"}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setLeftPanelCollapsed((prev) => !prev)}
            aria-label={leftPanelCollapsed ? "Expand research panel" : "Collapse research panel"}
            title={leftPanelCollapsed ? "Expand panel" : "Collapse panel"}
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "4px",
              border: `1px solid ${N_BORDER_MED}`,
              background: "white",
              color: N_FG,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
            className="hover:bg-[rgba(55,53,47,0.06)]"
          >
            {leftPanelCollapsed ? (
              <ChevronRight style={{ width: "14px", height: "14px" }} />
            ) : (
              <ChevronLeft style={{ width: "14px", height: "14px" }} />
            )}
          </button>
        </div>

        {!leftPanelCollapsed && (
          <>
            {credits !== null && (
              <div style={{
                margin: "0 10px 4px",
                padding: "4px 8px",
                borderRadius: "4px",
                background: credits === 0 ? "rgba(239,68,68,0.08)" : credits <= 5 ? "rgba(245,158,11,0.08)" : "rgba(55,53,47,0.04)",
                border: `1px solid ${credits === 0 ? "rgba(239,68,68,0.18)" : credits <= 5 ? "rgba(245,158,11,0.18)" : "rgba(55,53,47,0.08)"}`,
                fontSize: "11px",
                color: credits === 0 ? "#ef4444" : credits <= 5 ? "#d97706" : N_MUTED,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}>
                <span style={{ fontWeight: 600 }}>{credits}</span>
                <span>credit{credits !== 1 ? "s" : ""} remaining</span>
              </div>
            )}

            <ActivityFeed items={toolActivity} isLoading={isLoading} />

            {!isLoading && !hasResult && (
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
                <p style={{ fontSize: "11px", fontWeight: 500, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.05em", padding: "0 8px 6px" }}>
                  Try asking
                </p>
                {buildSuggestedPrompts(deployedDbs, nicheCriteria).map((p) => (
                  <button
                    key={p.text}
                    onClick={() => void sendMessage(p.text)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "6px",
                      width: "100%",
                      textAlign: "left",
                      fontSize: "13px",
                      color: N_FG,
                      background: "transparent",
                      border: "none",
                      padding: "4px 8px",
                      borderRadius: "3px",
                      cursor: "pointer",
                      lineHeight: 1.5,
                      fontFamily: N_FONT,
                    }}
                    className="hover:bg-[rgba(55,53,47,0.06)]"
                  >
                    <span style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "1px 5px",
                      borderRadius: "3px",
                      flexShrink: 0,
                      marginTop: "2px",
                      background: p.type === "list" ? "rgba(35,131,226,0.1)" : "rgba(55,53,47,0.07)",
                      color: p.type === "list" ? N_BLUE : N_SUBTLE,
                    }}>
                      {p.type === "list" ? "list" : "research"}
                    </span>
                    {p.text}
                  </button>
                ))}
              </div>
            )}
            {(isLoading || hasResult) && <div style={{ flex: 1 }} />}

            <div style={{ padding: "10px 12px 14px", borderTop: `1px solid ${N_BORDER}`, flexShrink: 0 }}>
              <form onSubmit={(e: FormEvent) => { e.preventDefault(); void sendMessage(input); }}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(input); }
                  }}
                  placeholder="Ask anything… (⏎ to send)"
                  disabled={isLoading}
                  rows={3}
                  style={{
                    width: "100%",
                    resize: "none",
                    border: `1px solid ${N_BORDER_MED}`,
                    borderRadius: "3px",
                    padding: "8px 10px",
                    fontSize: "14px",
                    color: N_FG,
                    background: "white",
                    outline: "none",
                    fontFamily: N_FONT,
                    boxSizing: "border-box",
                    marginBottom: "6px",
                    lineHeight: 1.5,
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  style={{
                    width: "100%",
                    padding: "6px",
                    borderRadius: "3px",
                    border: "none",
                    cursor: isLoading || !input.trim() ? "default" : "pointer",
                    background: isLoading || !input.trim() ? N_ACTIVE : N_BLUE,
                    color: isLoading || !input.trim() ? N_MUTED : "white",
                    fontSize: "14px",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontFamily: N_FONT,
                    transition: "background 0.1s ease",
                  }}
                >
                  {isLoading
                    ? <><Loader2 style={{ width: "14px", height: "14px" }} className="animate-spin" /> Researching…</>
                    : <><ArrowUp style={{ width: "14px", height: "14px" }} /> Send</>
                  }
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "white" }}>

        {/* Toolbar */}
        {hasResult && resultItems !== null && (
          <div style={{ padding: "8px 32px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexShrink: 0 }}>
            <span style={{ fontSize: "13px", color: N_MUTED }}>
              {resultItems.length} result{resultItems.length !== 1 ? "s" : ""}
              {addedIndices.size > 0 && ` · ${addedIndices.size} saved to ${backend === "app" ? "Workspace" : "Notion"}`}
            </span>
            {deployedDbs.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <select
                  value={selectedNotionId}
                  onChange={(e) => handleDatabaseChange(e.target.value)}
                  style={{
                    fontSize: "13px",
                    border: `1px solid ${N_BORDER_MED}`,
                    borderRadius: "3px",
                    padding: "3px 6px",
                    color: N_FG,
                    background: "white",
                    fontFamily: N_FONT,
                    maxWidth: "220px",
                  }}
                >
                  {deployedDbs.map((db) => (
                    <option key={db.notionId} value={db.notionId}>
                      {db.nicheName} · {db.dbName}
                    </option>
                  ))}
                </select>
                <button
                  disabled={pendingCount === 0 || addAllInProgress || !selectedNotionId}
                  onClick={() => void addAllToNotion()}
                  style={{
                    padding: "3px 10px",
                    borderRadius: "3px",
                    border: `1px solid ${N_BORDER_MED}`,
                    background: "white",
                    fontSize: "13px",
                    color: pendingCount === 0 ? N_SUBTLE : N_FG,
                    cursor: pendingCount === 0 || addAllInProgress ? "default" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontFamily: N_FONT,
                  }}
                >
                  {addAllInProgress && <Loader2 style={{ width: "12px", height: "12px" }} className="animate-spin" />}
                  Save all{pendingCount > 0 ? ` (${pendingCount})` : ""}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error banner */}
        {addError && (
          <div style={{ padding: "6px 32px", background: "rgba(235,87,87,0.08)", borderBottom: "1px solid rgba(235,87,87,0.2)", fontSize: "13px", color: "rgb(235,87,87)", flexShrink: 0 }}>
            {addError}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "40px 48px" }}>

          {/* Idle state */}
          {!isLoading && !hasResult && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", gap: "12px" }}>
              <span style={{ fontSize: "56px", lineHeight: 1 }}>🔍</span>
              <p style={{ fontSize: "20px", fontWeight: 600, color: N_FG, margin: 0 }}>Start researching</p>
              <p style={{ fontSize: "14px", color: N_MUTED, maxWidth: "340px", lineHeight: 1.6, margin: 0 }}>
                Ask the assistant to find venues, vendors, or businesses — results appear here and can be saved directly to your {backend === "app" ? "workspace" : "Notion workspace"}.
              </p>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "700px" }}>
              {[1, 2, 3].map((n) => (
                <div key={n} style={{ border: `1px solid ${N_BORDER_MED}`, borderRadius: "3px", padding: "12px" }} className="animate-pulse">
                  <div style={{ height: "14px", background: "rgba(55,53,47,0.07)", borderRadius: "2px", width: "55%", marginBottom: "12px" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{ display: "flex", gap: "8px" }}>
                        <div style={{ height: "11px", background: "rgba(55,53,47,0.05)", borderRadius: "2px", width: "80px", flexShrink: 0 }} />
                        <div style={{ height: "11px", background: "rgba(55,53,47,0.05)", borderRadius: "2px", flex: 1 }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {hasResult && !isLoading && (
            <div style={{ maxWidth: "900px" }}>
              {summaryText && (
                <div style={{ marginBottom: "20px" }}>
                  {/* Research answer (no card list) — render as formatted markdown */}
                  {resultItems === null ? (
                    <div style={{ background: "rgba(55,53,47,0.03)", border: `1px solid ${N_BORDER}`, borderRadius: "4px", padding: "20px 24px", marginBottom: "12px" }}>
                      {renderMarkdown(summaryText)}
                      <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: `1px solid ${N_BORDER}`, display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                        <button
                          onClick={() => void navigator.clipboard.writeText(summaryText)}
                          style={{ fontSize: "12px", color: N_MUTED, background: "transparent", border: `1px solid ${N_BORDER_MED}`, borderRadius: "3px", padding: "3px 10px", cursor: "pointer", fontFamily: N_FONT }}
                        >
                          Copy
                        </button>
                        {noteSaved ? (
                          <span style={{ fontSize: "12px", color: "rgb(15,123,108)", fontWeight: 500 }}>
                            ✓ Saved to notes
                          </span>
                        ) : showNoteTitleInput ? (
                          <div style={{ display: "flex", gap: "6px", alignItems: "center", flex: 1 }}>
                            <input
                              autoFocus
                              type="text"
                              value={noteTitle}
                              onChange={(e) => setNoteTitle(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") void saveNote(noteTitle); if (e.key === "Escape") setShowNoteTitleInput(false); }}
                              placeholder="Note title…"
                              style={{
                                flex: 1, fontSize: "12px", padding: "3px 8px",
                                border: `1px solid ${N_BORDER_MED}`, borderRadius: "3px",
                                fontFamily: N_FONT, outline: "none", color: N_FG,
                              }}
                            />
                            <button
                              onClick={() => void saveNote(noteTitle)}
                              disabled={savingNote || !noteTitle.trim()}
                              style={{
                                fontSize: "12px", padding: "3px 10px", borderRadius: "3px",
                                border: "none", background: N_FG, color: "white",
                                cursor: savingNote || !noteTitle.trim() ? "default" : "pointer",
                                fontFamily: N_FONT,
                              }}
                            >
                              {savingNote ? "Saving…" : "Save"}
                            </button>
                            <button
                              onClick={() => setShowNoteTitleInput(false)}
                              style={{ fontSize: "12px", color: N_MUTED, background: "transparent", border: "none", cursor: "pointer", fontFamily: N_FONT }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowNoteTitleInput(true)}
                            style={{ fontSize: "12px", color: N_MUTED, background: "transparent", border: `1px solid ${N_BORDER_MED}`, borderRadius: "3px", padding: "3px 10px", cursor: "pointer", fontFamily: N_FONT }}
                          >
                            Save as note
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: "14px", color: N_MUTED, margin: "0 0 10px", lineHeight: 1.6 }}>
                      {summaryText}
                    </p>
                  )}
                  {credits === 0 && (
                    <Link
                      href={"/members/credits" as never}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "6px",
                        padding: "8px 12px",
                        border: "1px solid rgba(37,99,235,0.35)",
                        background: "rgba(59,130,246,0.12)",
                        color: "#1e3a8a",
                        fontSize: "13px",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      Open credit plans
                    </Link>
                  )}
                </div>
              )}
              {resultItems !== null && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
                  {resultItems.map((item, i) => (
                    <ResultCard
                      key={i}
                      item={item}
                      index={i}
                      added={addedIndices.has(i)}
                      adding={addingIndex === i}
                      onAdd={(idx, it) => void addToNotion(idx, it)}
                      disabled={addAllInProgress || !selectedNotionId}
                      saveLabel={backend === "app" ? "Save to Workspace" : "Save to Notion"}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  );
}
