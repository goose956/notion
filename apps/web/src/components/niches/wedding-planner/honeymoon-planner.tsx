"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { ArrowUp, Loader2, Check, Globe, Link2, DatabaseZap } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_ACTIVE, N_BLUE, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow, WorkspaceProperty } from "@/app/api/members/workspace/route";
import { findPropertyName } from "./utils";
import { DatabaseTable } from "@/components/workspace/database-table";
interface HoneymoonResultItem {
  title: string;
  category: string;
  status: string;
  location: string;
  website: string;
  phone: string;
  email: string;
  price: string;
  notes: string;
  source: string;
}

interface ToolActivity {
  name: string;
  args: Record<string, unknown>;
  done: boolean;
}

interface HoneymoonChatMessage {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}

type ChatSseEvent =
  | { type: "tool_start"; name: string; args: Record<string, unknown> }
  | { type: "tool_end"; name: string }
  | { type: "text"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

const HONEYMOON_TOOL_LABELS: Record<string, string> = {
  web_search: "Searching the web",
  fetch_url: "Reading URL",
  notion_query: "Querying Notion",
  notion_create: "Saving to Notion",
  notion_write: "Updating Notion",
  notion_archive: "Removing from Notion",
};

const HONEYMOON_TOOL_ICON: Record<string, React.ReactNode> = {
  web_search: <Globe style={{ width: "12px", height: "12px" }} />,
  fetch_url: <Link2 style={{ width: "12px", height: "12px" }} />,
  notion_query: <DatabaseZap style={{ width: "12px", height: "12px" }} />,
  notion_create: <DatabaseZap style={{ width: "12px", height: "12px" }} />,
  notion_write: <DatabaseZap style={{ width: "12px", height: "12px" }} />,
  notion_archive: <DatabaseZap style={{ width: "12px", height: "12px" }} />,
};

function resolveHoneymoonToolLabel(name: string, args: Record<string, unknown>): string {
  if (name === "web_search" && typeof args["query"] === "string") {
    return `Searching "${args["query"]}"`;
  }
  if (name === "fetch_url" && typeof args["url"] === "string") {
    try {
      return `Reading ${new URL(args["url"] as string).hostname}`;
    } catch {
      return "Reading URL";
    }
  }
  return HONEYMOON_TOOL_LABELS[name] ?? `Running ${name}`;
}

function HoneymoonActivityFeed({ items, isLoading }: { items: ToolActivity[]; isLoading: boolean }) {
  if (items.length === 0 && !isLoading) return null;
  return (
    <div style={{ padding: "10px 12px 12px", border: `1px solid ${N_BORDER}`, borderRadius: "10px", background: "#fff" }}>
      <p style={{ fontSize: "11px", fontWeight: 500, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
        Activity
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {items.map((activity, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: activity.done ? N_MUTED : N_FG }}>
            <span style={{ color: activity.done ? N_SUBTLE : N_BLUE, flexShrink: 0, display: "flex" }}>
              {activity.done
                ? <Check style={{ width: "12px", height: "12px" }} />
                : (HONEYMOON_TOOL_ICON[activity.name] ?? <Globe style={{ width: "12px", height: "12px" }} />)}
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {resolveHoneymoonToolLabel(activity.name, activity.args)}
            </span>
            {!activity.done && <Loader2 style={{ width: "11px", height: "11px", color: N_SUBTLE, flexShrink: 0 }} className="animate-spin" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function buildHoneymoonSuggestions(destination: string): string[] {
  const area = destination.trim();
  return [
    area ? `Find the best honeymoon hotels in ${area}` : "Find the best honeymoon hotels for a tropical trip",
    area ? `Research romantic restaurants in ${area}` : "Research romantic restaurants for a honeymoon itinerary",
    area ? `Compare reliable airport transfers in ${area}` : "Compare airport transfer options for honeymoon travel",
    area ? `Find activities for a honeymoon in ${area}` : "Find unforgettable honeymoon activities and day trips",
  ];
}

function parseResultItems(text: string): Record<string, unknown>[] | null {
  const match = /```json\s*([\s\S]*?)```/.exec(text);
  if (!match?.[1]) return null;
  try {
    const parsed: unknown = JSON.parse(match[1]);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
      return parsed as Record<string, unknown>[];
    }
  } catch {
    return null;
  }
  return null;
}

function getSummaryText(text: string): string {
  const idx = text.indexOf("```json");
  return idx === -1 ? text : text.slice(0, idx).trim();
}

function renderMarkdown(text: string): React.ReactNode[] {
  // Strip JSON code blocks entirely (results are shown as cards)
  const clean = text.replace(/```json[\s\S]*?```/g, "").replace(/```[\s\S]*?```/g, "").trim();
  const lines = clean.split("\n");
  const nodes: React.ReactNode[] = [];
  let key = 0;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) { nodes.push(<br key={key++} />); continue; }

    // Bullet point
    const isBullet = /^[-*•]\s+/.test(line);
    const content = isBullet ? line.replace(/^[-*•]\s+/, "") : line;

    // Inline bold: **text**
    const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isBullet) {
      nodes.push(
        <div key={key++} style={{ display: "flex", gap: "6px", alignItems: "flex-start", marginBottom: "2px" }}>
          <span style={{ marginTop: "6px", width: "4px", height: "4px", borderRadius: "50%", background: "currentColor", flexShrink: 0, opacity: 0.5 }} />
          <span style={{ lineHeight: 1.6 }}>{parts}</span>
        </div>
      );
    } else {
      nodes.push(<p key={key++} style={{ margin: "0 0 4px", lineHeight: 1.6 }}>{parts}</p>);
    }
  }
  return nodes;
}

function getItemTitle(item: Record<string, unknown>): string {
  for (const [key, value] of Object.entries(item)) {
    if (typeof value === "string" && value.trim() && /name|title|place|hotel|restaurant|transfer|business|venue/i.test(key)) {
      return value;
    }
  }
  const first = Object.values(item).find((value) => typeof value === "string" && value.trim());
  return typeof first === "string" ? first : "Unnamed";
}

function normalizeHoneymoonResult(item: Record<string, unknown>, defaultCategory: string): HoneymoonResultItem {
  const asString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
  return {
    title: getItemTitle(item),
    category: asString(item["Category"]) || asString(item["category"]) || defaultCategory,
    status: asString(item["Status"]) || asString(item["status"]) || "Researching",
    location: asString(item["Location"]) || asString(item["location"]) || "",
    website: asString(item["Website"]) || asString(item["website"]) || asString(item["url"]) || "",
    phone: asString(item["Phone"]) || asString(item["phone"]) || "",
    email: asString(item["Email"]) || asString(item["email"]) || "",
    price: asString(item["Price"]) || asString(item["price"]) || "",
    notes: asString(item["Notes"]) || asString(item["notes"]) || asString(item["summary"]) || "",
    source: asString(item["Source"]) || asString(item["source"]) || "",
  };
}


export function WeddingHoneymoonPlanner({
  honeymoonDb,
  onRowAdded,
  onRowUpdated,
  onRowDeleted,
}: {
  honeymoonDb: WorkspaceDatabase | null;
  onRowAdded: (row: WorkspaceRow) => void;
  onRowUpdated: (pageId: string, name: string, val: string | number | boolean | null) => void;
  onRowDeleted: (pageId: string) => void;
}) {
  const [destination, setDestination] = useState("");
  const [category, setCategory] = useState("Hotel");
  const [travelStyle, setTravelStyle] = useState("Luxury but practical");
  const [budget, setBudget] = useState("");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [input, setInput] = useState("Find the best honeymoon options with detailed web research.");
  const [messages, setMessages] = useState<HoneymoonChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toolActivity, setToolActivity] = useState<ToolActivity[]>([]);
  const [summaryText, setSummaryText] = useState("");
  const [results, setResults] = useState<HoneymoonResultItem[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const categoryOptions = ["Hotel", "Taxi Transfer", "Restaurant", "Activity", "Tour", "Other"];
  const statusOptions = ["Not Contacted", "Contacted", "Booked", "Cancelled"];

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
  }, [messages, toolActivity, results, summaryText, isLoading]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const sendMessage = useCallback(async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || isLoading) return;

    const assistantIndex = messages.length + 1;
    const nextMessages = [...messages, { role: "user", content: trimmed } as HoneymoonChatMessage];

    setInput("");
    setMessages([...nextMessages, { role: "assistant", content: "", pending: true }]);
    setIsLoading(true);
    setToolActivity([]);
    setSummaryText("");
    setResults([]);
    setError(null);
    setSuccess(null);

    const abort = new AbortController();
    abortRef.current = abort;

    const contextLines = [
      "You are the Honeymoon Planner assistant inside a wedding workspace.",
      `Destination or area: ${destination.trim() || "Not specified"}`,
      `Default category: ${category}`,
      `Travel style: ${travelStyle}`,
      `Budget guidance: ${budget.trim() || "Not specified"}`,
      `Extra instructions: ${extraInstructions.trim() || "None"}`,
      "Help the user research and compare honeymoon options in a conversational way.",
      "When the reply includes saveable recommendations, finish with a concise summary and a JSON code block containing an array of items.",
      "Use these JSON keys when possible: Place, Category, Status, Location, Website, Phone, Email, Price, Notes, Source.",
      "",
      `User message: ${trimmed}`,
    ];

    try {
      const res = await fetch("/api/members/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...nextMessages, { role: "user", content: contextLines.join("\n") }], upfrontCredits: 3 }),
        signal: abort.signal,
      });

      if (!res.ok) {
        if (res.status === 402) {
          throw new Error("You have no credits left. Top up to continue.");
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

          let event: ChatSseEvent;
          try {
            event = JSON.parse(jsonStr) as ChatSseEvent;
          } catch {
            continue;
          }

          if (event.type === "tool_start") {
            setToolActivity((prev) => [...prev, { name: event.name, args: event.args, done: false }]);
          } else if (event.type === "tool_end") {
            setToolActivity((prev) => prev.map((activity) => (activity.name === event.name && !activity.done ? { ...activity, done: true } : activity)));
          } else if (event.type === "text") {
            fullText = event.content;
            setMessages((prev) => prev.map((message, index) => index === assistantIndex ? { ...message, content: event.content, pending: true } : message));
          } else if (event.type === "done") {
            const parsed = parseResultItems(fullText);
            setSummaryText(getSummaryText(fullText));
            setResults((parsed ?? []).map((item) => normalizeHoneymoonResult(item, category)));
            setMessages((prev) => prev.map((message, index) => index === assistantIndex ? { ...message, pending: false } : message));
            setSuccess(parsed && parsed.length > 0 ? "Research complete. Review the results and save the ones you want." : "Conversation updated.");
          } else if (event.type === "error") {
            throw new Error(event.message ?? "Research failed");
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Research failed";
      setError(message);
      setMessages((prev) => prev.map((entry, index) => index === assistantIndex ? { ...entry, content: `Error: ${message}`, pending: false } : entry));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      textareaRef.current?.focus();
    }
  }, [messages, isLoading, destination, category, travelStyle, budget, extraInstructions]);

  async function runResearch() {
    const prompt = input.trim();
    if (!prompt) return;
    void sendMessage(prompt);
  }

  async function saveResult(index: number, result: HoneymoonResultItem) {
    if (!honeymoonDb) return;
    setSavingIndex(index);
    setError(null);

    const properties: Record<string, string | number | boolean | null> = {};
    const propertyTypes: Record<string, string> = {};
    const titleName = findPropertyName(honeymoonDb.properties, ["Place", "Title", "Name"]);
    const categoryName = findPropertyName(honeymoonDb.properties, ["Category"]);
    const statusName = findPropertyName(honeymoonDb.properties, ["Status"]);
    const locationName = findPropertyName(honeymoonDb.properties, ["Location"]);
    const websiteName = findPropertyName(honeymoonDb.properties, ["Website", "URL", "Link"]);
    const phoneName = findPropertyName(honeymoonDb.properties, ["Phone"]);
    const emailName = findPropertyName(honeymoonDb.properties, ["Email"]);
    const priceName = findPropertyName(honeymoonDb.properties, ["Price", "Cost", "Quote"]);
    const notesName = findPropertyName(honeymoonDb.properties, ["Notes", "Summary", "Details"]);
    const sourceName = findPropertyName(honeymoonDb.properties, ["Source"]);
    const addedName = findPropertyName(honeymoonDb.properties, ["Added"]);

    if (titleName) {
      properties[titleName] = result.title.trim() || "Honeymoon Place";
      propertyTypes[titleName] = "title";
    }
    if (categoryName) {
      properties[categoryName] = result.category || category;
      propertyTypes[categoryName] = "select";
    }
    if (statusName) {
      properties[statusName] = result.status || "Researching";
      propertyTypes[statusName] = "select";
    }
    if (locationName) {
      properties[locationName] = result.location || destination;
      propertyTypes[locationName] = "rich_text";
    }
    if (websiteName && result.website) {
      properties[websiteName] = result.website;
      propertyTypes[websiteName] = "url";
    }
    if (phoneName && result.phone) {
      properties[phoneName] = result.phone;
      propertyTypes[phoneName] = "phone_number";
    }
    if (emailName && result.email) {
      properties[emailName] = result.email;
      propertyTypes[emailName] = "email";
    }
    if (priceName) {
      properties[priceName] = result.price || budget;
      propertyTypes[priceName] = "rich_text";
    }
    if (notesName) {
      properties[notesName] = result.notes;
      propertyTypes[notesName] = "rich_text";
    }
    if (sourceName) {
      properties[sourceName] = result.source || summaryText;
      propertyTypes[sourceName] = "rich_text";
    }
    if (addedName) {
      properties[addedName] = new Date().toISOString().slice(0, 10);
      propertyTypes[addedName] = "date";
    }

    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId: honeymoonDb.notionId,
          properties,
          propertyTypes,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { pageId?: string; error?: string };
      if (!res.ok || !body.pageId) {
        throw new Error(body.error ?? "Failed to save honeymoon item");
      }
      onRowAdded({ pageId: body.pageId, properties });
      setSuccess(`Saved ${result.title} to the honeymoon planner.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save honeymoon item");
    } finally {
      setSavingIndex(null);
    }
  }

  return (
    <div
      style={{
        marginTop: "14px",
        border: `1px solid ${N_BORDER}`,
        borderRadius: "12px",
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${N_BORDER}`, background: "#f0fff7" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#166534" }}>Honeymoon Planner</h3>
        <p style={{ margin: "4px 0 0", fontSize: "12px", color: N_MUTED }}>
          Use web research to collect hotels, transfers, restaurants, and activities, then save everything into one searchable planner. Cost: 3 credits per search.
        </p>
      </div>

      <div style={{ padding: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "12px" }}>
        <section style={{ border: `1px solid ${N_BORDER}`, borderRadius: "10px", background: "#f8fff9", padding: "12px", display: "grid", gap: "10px", alignContent: "start" }}>
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Planner Context
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Destination or region"
              style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, background: "white" }}
            >
              {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <input
              value={travelStyle}
              onChange={(e) => setTravelStyle(e.target.value)}
              placeholder="Travel style"
              style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
            />
            <input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Budget guidance"
              style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
            />
          </div>
          <textarea
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
            rows={2}
            placeholder="Extra instructions"
            style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, resize: "vertical" }}
          />
        </section>

        <section style={{ display: "grid", gap: "10px", alignContent: "start" }}>
          <HoneymoonActivityFeed items={toolActivity} isLoading={isLoading} />

          <div style={{ border: `1px solid ${N_BORDER}`, borderRadius: "10px", background: "white", overflow: "hidden", display: "grid" }}>
            <div style={{ padding: "12px 12px 10px", borderBottom: `1px solid ${N_BORDER}`, background: "#fff7fb" }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#9d174d", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Honeymoon Chat
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: N_MUTED }}>
                Ask naturally. The assistant can research, compare, and return saveable items.
              </p>
            </div>

            <div ref={transcriptRef} style={{ padding: "12px", maxHeight: "380px", overflowY: "auto", display: "grid", gap: "10px", background: "#fff" }}>
              {messages.length === 0 && !isLoading ? (
                <div style={{ padding: "18px 14px", border: `1px dashed ${N_BORDER_MED}`, borderRadius: "8px", background: "rgba(255,255,255,0.65)", display: "grid", gap: "10px" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: N_FG }}>Start a honeymoon search</p>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: N_MUTED, lineHeight: 1.5 }}>
                      Ask for places, transfers, restaurants, activities, or a full trip plan. The assistant will research and return items you can save.
                    </p>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {buildHoneymoonSuggestions(destination).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setInput(suggestion)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "999px",
                          border: `1px solid ${N_BORDER_MED}`,
                          background: "white",
                          fontSize: "12px",
                          color: N_FG,
                          fontFamily: N_FONT,
                          cursor: "pointer",
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} style={{ display: "flex", justifyContent: message.role === "user" ? "flex-end" : "flex-start" }}>
                    <div
                      style={{
                        maxWidth: "88%",
                        padding: "10px 12px",
                        borderRadius: message.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        background: message.role === "user" ? "linear-gradient(135deg, #166534, #22c55e)" : "#ffffff",
                        color: message.role === "user" ? "white" : N_FG,
                        border: message.role === "user" ? "none" : `1px solid ${N_BORDER}`,
                        boxShadow: message.role === "assistant" ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                      }}
                    >
                      {message.pending && !message.content ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: message.role === "user" ? "rgba(255,255,255,0.9)" : N_MUTED, fontSize: "13px" }}>
                          <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                          Thinking...
                        </div>
                      ) : (
                        <div style={{ margin: 0, fontSize: "13px", lineHeight: 1.6 }}>{renderMarkdown(message.content)}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ borderTop: `1px solid ${N_BORDER}`, padding: "12px" }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void runResearch();
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void runResearch();
                    }
                  }}
                  placeholder="Ask about hotels, transfers, restaurants, activities..."
                  disabled={isLoading}
                  rows={3}
                  style={{
                    width: "100%",
                    resize: "none",
                    border: `1px solid ${N_BORDER_MED}`,
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "14px",
                    color: N_FG,
                    background: "white",
                    outline: "none",
                    fontFamily: N_FONT,
                    boxSizing: "border-box",
                    marginBottom: "8px",
                    lineHeight: 1.5,
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {buildHoneymoonSuggestions(destination).slice(0, 3).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setInput(suggestion)}
                        style={{
                          padding: "5px 9px",
                          borderRadius: "999px",
                          border: `1px solid ${N_BORDER_MED}`,
                          background: "white",
                          fontSize: "12px",
                          color: N_FG,
                          fontFamily: N_FONT,
                          cursor: "pointer",
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "none",
                      cursor: isLoading || !input.trim() ? "default" : "pointer",
                      background: isLoading || !input.trim() ? N_ACTIVE : "linear-gradient(135deg, #166534, #22c55e)",
                      color: isLoading || !input.trim() ? N_MUTED : "white",
                      fontSize: "13px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontFamily: N_FONT,
                    }}
                  >
                    {isLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowUp size={14} />}
                    {isLoading ? "Researching…" : "Send"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {(summaryText || results.length > 0 || error || success) && (
            <section style={{ border: `1px solid ${N_BORDER}`, borderRadius: "10px", background: "#fff", padding: "12px", display: "grid", gap: "10px" }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Research Results
              </p>
              {summaryText && <div style={{ fontSize: "13px", color: N_FG }}>{renderMarkdown(summaryText)}</div>}
              {error && <p style={{ margin: 0, color: "rgb(220,38,38)", fontSize: "12px" }}>{error}</p>}
              {success && <p style={{ margin: 0, color: "rgb(21,128,61)", fontSize: "12px" }}>{success}</p>}

              {results.length > 0 && (
                <div style={{ display: "grid", gap: "8px" }}>
                  {results.map((item, index) => (
                    <div key={`${item.title}-${index}`} style={{ border: `1px solid ${N_BORDER}`, borderRadius: "8px", background: "white", padding: "10px", display: "grid", gap: "8px" }}>
                      <input
                        value={item.title}
                        onChange={(e) => setResults((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: e.target.value } : entry))}
                        style={{ padding: "7px 9px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, fontWeight: 600 }}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <select
                          value={item.category}
                          onChange={(e) => setResults((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, category: e.target.value } : entry))}
                          style={{ padding: "7px 9px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, background: "white" }}
                        >
                          {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                        <select
                          value={item.status}
                          onChange={(e) => setResults((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, status: e.target.value } : entry))}
                          style={{ padding: "7px 9px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, background: "white" }}
                        >
                          {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                      <input
                        value={item.location}
                        onChange={(e) => setResults((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, location: e.target.value } : entry))}
                        placeholder="Location"
                        style={{ padding: "7px 9px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
                      />
                      <input
                        value={item.website}
                        onChange={(e) => setResults((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, website: e.target.value } : entry))}
                        placeholder="Website"
                        style={{ padding: "7px 9px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
                      />
                      <textarea
                        value={item.notes}
                        onChange={(e) => setResults((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, notes: e.target.value } : entry))}
                        placeholder="Notes"
                        rows={3}
                        style={{ padding: "7px 9px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, resize: "vertical" }}
                      />
                      <button
                        type="button"
                        onClick={() => void saveResult(index, item)}
                        disabled={savingIndex === index || !honeymoonDb}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          padding: "8px 12px",
                          borderRadius: "7px",
                          border: `1px solid ${N_BORDER_MED}`,
                          background: "white",
                          color: "#166534",
                          fontSize: "12px",
                          fontWeight: 700,
                          fontFamily: N_FONT,
                          cursor: savingIndex === index || !honeymoonDb ? "default" : "pointer",
                          opacity: honeymoonDb ? 1 : 0.6,
                        }}
                      >
                        {savingIndex === index ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />}
                        {savingIndex === index ? "Saving..." : "Save to Honeymoon Planner"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </section>

        <section style={{ border: `1px solid ${N_BORDER}`, borderRadius: "10px", background: "#ffffff", padding: "12px", display: "grid", gap: "8px", alignContent: "start" }}>
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Saved Planner
          </p>
          {honeymoonDb ? (
            <DatabaseTable
              db={honeymoonDb}
              isAppBackend={true}
              onRowUpdated={onRowUpdated}
              onRowDeleted={onRowDeleted}
              onRowAdded={onRowAdded}
            />
          ) : (
            <p style={{ margin: 0, color: N_MUTED, fontSize: "13px" }}>No honeymoon database is available yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Main workspace page component ────────────────────────────────────────────
