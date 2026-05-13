"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowUp,
  Globe,
  Link2,
  Loader2,
  DatabaseZap,
  Bot,
  Check,
  PlusCircle,
  Sparkles,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// SSE event shapes from the API
type SseEvent =
  | { type: "tool_start"; name: string; args: Record<string, unknown> }
  | { type: "tool_end"; name: string }
  | { type: "text"; content: string }
  | { type: "done"; tokenUsage: { input: number; output: number } }
  | { type: "error"; message: string };

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
  notion_create: "Adding to Notion",
  notion_write: "Updating Notion",
  notion_archive: "Removing from Notion",
};

const TOOL_ICON: Record<string, React.ReactNode> = {
  web_search: <Globe className="h-3.5 w-3.5" />,
  fetch_url: <Link2 className="h-3.5 w-3.5" />,
  notion_query: <DatabaseZap className="h-3.5 w-3.5" />,
  notion_create: <DatabaseZap className="h-3.5 w-3.5" />,
  notion_write: <DatabaseZap className="h-3.5 w-3.5" />,
  notion_archive: <DatabaseZap className="h-3.5 w-3.5" />,
};

function resolveToolLabel(name: string, args: Record<string, unknown>): string {
  if (name === "web_search" && typeof args["query"] === "string") {
    return `Searching: "${args["query"]}"`;
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
    <div className="flex flex-col gap-1.5 px-4 py-3 border-b">
      {items.map((a, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border w-fit",
            a.done
              ? "bg-muted text-muted-foreground border-border"
              : "bg-primary/5 text-primary border-primary/20 animate-pulse",
          )}
        >
          {TOOL_ICON[a.name] ?? <Globe className="h-3.5 w-3.5" />}
          {resolveToolLabel(a.name, a.args)}
          {!a.done && <Loader2 className="h-3 w-3 animate-spin ml-0.5" />}
        </span>
      ))}
    </div>
  );
}

function ResultCard({
  item, index, added, adding, onAdd, disabled,
}: {
  item: ResultItem; index: number; added: boolean; adding: boolean;
  onAdd: (index: number, item: ResultItem) => void; disabled: boolean;
}) {
  const title = getItemTitle(item);
  const titleKey = Object.keys(item).find((k) => item[k] === title);
  const bodyEntries = Object.entries(item)
    .filter(([k, v]) => k !== titleKey && v !== null && v !== undefined && v !== "")
    .slice(0, 6);

  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 flex flex-col gap-3 transition-colors",
      added && "border-green-300 bg-green-50/50",
    )}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm leading-snug flex-1">{title}</p>
        <Button
          size="sm"
          variant={added ? "secondary" : "default"}
          className={cn(
            "shrink-0 h-7 px-3 text-xs gap-1.5",
            added && "text-green-700 bg-green-100 border-green-200 hover:bg-green-100",
          )}
          disabled={added || adding || disabled}
          onClick={() => onAdd(index, item)}
        >
          {adding ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : added ? (
            <><Check className="h-3 w-3" /> Added</>
          ) : (
            <><PlusCircle className="h-3 w-3" /> Add</>
          )}
        </Button>
      </div>
      {bodyEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {bodyEntries.map(([key, val]) => (
            <div key={key} className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium truncate">{key}</p>
              <p className="text-xs text-foreground truncate">
                {typeof val === "number" ? val.toString()
                  : Array.isArray(val) ? (val as unknown[]).join(", ")
                  : String(val)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SUGGESTED_PROMPTS = [
  "Find wedding venues in Manchester with a capacity of 100+",
  "Search for florists in London specialising in romantic weddings",
  "What are the top photographers in Edinburgh under £2000?",
  "Find catering companies in Bristol for wedding receptions",
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toolActivity, setToolActivity] = useState<ToolActivity[]>([]);
  const [summaryText, setSummaryText] = useState<string>("");
  const [resultItems, setResultItems] = useState<ResultItem[] | null>(null);
  const [deployedDbs, setDeployedDbs] = useState<DeployedDatabase[]>([]);
  const [selectedNotionId, setSelectedNotionId] = useState<string>("");
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());
  const [addingIndex, setAddingIndex] = useState<number | null>(null);
  const [addAllInProgress, setAddAllInProgress] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [hasResult, setHasResult] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load deployed databases on mount
  useEffect(() => {
    void fetch("/api/members/databases")
      .then((r) => r.json() as Promise<{ databases: DeployedDatabase[] }>)
      .then(({ databases }) => {
        setDeployedDbs(databases ?? []);
        if (databases?.[0]) setSelectedNotionId(databases[0].notionId);
      })
      .catch(() => undefined);
  }, []);

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

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const res = await fetch("/api/members/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: trimmed }] }),
          signal: abort.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
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
            } else if (event.type === "error") {
              setSummaryText(`Error: ${event.message}`);
              setHasResult(true);
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
    [isLoading],
  );

  async function addToNotion(index: number, item: ResultItem) {
    if (!selectedNotionId) return;
    setAddingIndex(index);
    setAddError(null);
    try {
      const res = await fetch("/api/members/notion-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notionDatabaseId: selectedNotionId, properties: item }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Failed to add");
      setAddedIndices((prev) => new Set([...prev, index]));
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add to Notion");
    } finally {
      setAddingIndex(null);
    }
  }

  async function addAllToNotion() {
    if (!resultItems || !selectedNotionId) return;
    setAddAllInProgress(true);
    for (let i = 0; i < resultItems.length; i++) {
      if (!addedIndices.has(i) && resultItems[i]) {
        await addToNotion(i, resultItems[i]);
      }
    }
    setAddAllInProgress(false);
  }

  const pendingCount = resultItems ? resultItems.filter((_, i) => !addedIndices.has(i)).length : 0;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Left panel ────────────────────────────────────────── */}
      <div className="w-[340px] shrink-0 border-r flex flex-col bg-card/30">
        {/* Header */}
        <div className="px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Bot className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Research Assistant</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Search the web · save results to Notion
          </p>
        </div>

        {/* Live tool activity */}
        <ActivityFeed items={toolActivity} isLoading={isLoading} />

        {/* Suggested prompts (idle state only) */}
        {!isLoading && !hasResult && (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">
              Try asking…
            </p>
            <div className="space-y-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => void sendMessage(p)}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-lg border bg-background hover:bg-muted/50 hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {(isLoading || hasResult) && <div className="flex-1" />}

        {/* Input */}
        <div className="shrink-0 p-4 border-t bg-background">
          <form
            onSubmit={(e: FormEvent) => { e.preventDefault(); void sendMessage(input); }}
            className="flex flex-col gap-2"
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(input); }
              }}
              placeholder="Ask anything… (Enter to send)"
              disabled={isLoading}
              rows={3}
              className="resize-none text-sm"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} className="w-full gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              {isLoading ? "Researching…" : "Send"}
            </Button>
          </form>
        </div>
      </div>

      {/* ── Right panel ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Results toolbar */}
        {hasResult && resultItems !== null && (
          <div className="shrink-0 px-6 py-3 border-b bg-background flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {resultItems.length} result{resultItems.length !== 1 ? "s" : ""}
              </span>
              {addedIndices.size > 0 && (
                <span className="text-xs text-green-600 font-medium">
                  · {addedIndices.size} added to Notion
                </span>
              )}
            </div>
            {deployedDbs.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedNotionId}
                  onChange={(e) => setSelectedNotionId(e.target.value)}
                  className="text-xs border rounded-md px-2 py-1.5 bg-background text-foreground max-w-[220px]"
                >
                  {deployedDbs.map((db) => (
                    <option key={db.notionId} value={db.notionId}>
                      {db.nicheName} · {db.dbName}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5 h-8"
                  disabled={pendingCount === 0 || addAllInProgress || !selectedNotionId}
                  onClick={() => void addAllToNotion()}
                >
                  {addAllInProgress ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlusCircle className="h-3 w-3" />}
                  Add all{pendingCount > 0 ? ` (${pendingCount})` : ""}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Error banner */}
        {addError && (
          <div className="shrink-0 px-6 py-2 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive">
            {addError}
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Idle state */}
          {!isLoading && !hasResult && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Results appear here</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Ask the assistant to find venues, vendors, or businesses — then add them directly to your Notion workspace.
              </p>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-4 max-w-2xl">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rounded-xl border bg-card p-4 animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-3 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {hasResult && !isLoading && (
            <div className="max-w-3xl space-y-4">
              {summaryText && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {summaryText}
                </p>
              )}
              {resultItems !== null && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {resultItems.map((item, i) => (
                    <ResultCard
                      key={i}
                      item={item}
                      index={i}
                      added={addedIndices.has(i)}
                      adding={addingIndex === i}
                      onAdd={(idx, it) => void addToNotion(idx, it)}
                      disabled={addAllInProgress || !selectedNotionId}
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
