"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Bot, Send, Sparkles, X, CheckCircle2, Loader2, ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  role: "user" | "assistant";
  content: string;
};

type BuiltTool = {
  id: string;
  name: string;
  description: string;
  toolType: string;
  config: Record<string, unknown>;
  inputSchema: {
    type: "object";
    properties?: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
};

const TOOL_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  webhook: { label: "Webhook", color: "bg-blue-100 text-blue-700 border-blue-200" },
  python: { label: "Python script", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  sql: { label: "SQL query", color: "bg-green-100 text-green-700 border-green-200" },
  http_scraper: { label: "HTTP scraper", color: "bg-orange-100 text-orange-700 border-orange-200" },
  llm_chain: { label: "LLM chain", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

// ─── Parse [TOOL_READY] block from assistant message ─────────────────────────

function extractToolReady(text: string): { prose: string; tool: BuiltTool | null } {
  const match = text.match(/\[TOOL_READY\]\s*([\s\S]*?)\s*\[\/TOOL_READY\]/);
  if (!match) return { prose: text, tool: null };
  try {
    const tool = JSON.parse(match[1]!) as BuiltTool;
    const prose = text.slice(0, text.indexOf("[TOOL_READY]")).trim();
    return { prose, tool };
  } catch {
    return { prose: text, tool: null };
  }
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const { prose, tool } = extractToolReady(msg.content);

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold
          ${isUser ? "bg-primary text-primary-foreground" : "bg-muted border"}`}
      >
        {isUser ? "You" : <Bot className="h-3.5 w-3.5" />}
      </div>

      <div className={`max-w-[85%] space-y-2 ${isUser ? "items-end flex flex-col" : ""}`}>
        {prose && (
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
              ${isUser
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-muted/60 border rounded-tl-sm"
              }`}
          >
            {prose}
          </div>
        )}
        {tool && <ToolPreview tool={tool} />}
      </div>
    </div>
  );
}

// ─── Tool preview card (shown after AI finishes) ──────────────────────────────

function ToolPreview({
  tool,
  onSave,
  saving,
  saved,
}: {
  tool: BuiltTool;
  onSave?: (tool: BuiltTool) => void;
  saving?: boolean;
  saved?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = TOOL_TYPE_LABELS[tool.toolType] ?? { label: tool.toolType, color: "bg-muted text-muted-foreground border" };
  const props = Object.entries(tool.inputSchema.properties ?? {});
  const required = new Set(tool.inputSchema.required ?? []);

  return (
    <div className="rounded-xl border-2 border-primary/20 bg-card p-4 space-y-3 w-full max-w-md">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold">{tool.id}</span>
            <span className={`text-xs border rounded-full px-2 py-0.5 ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{tool.description}</p>
        </div>
        {onSave && (
          saved ? (
            <span className="shrink-0 inline-flex items-center gap-1 text-xs text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved
            </span>
          ) : (
            <button
              onClick={() => onSave(tool)}
              disabled={saving}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-md px-3 py-1.5 hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {saving ? "Saving…" : "Save tool"}
            </button>
          )
        )}
      </div>

      {props.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {props.length} input parameter{props.length !== 1 ? "s" : ""}
          </button>

          {expanded && (
            <table className="w-full text-xs mt-2 border-collapse">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-1 pr-3 font-medium">Name</th>
                  <th className="pb-1 pr-3 font-medium">Type</th>
                  <th className="pb-1 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {props.map(([name, prop]) => (
                  <tr key={name} className="border-b border-border/30">
                    <td className="py-1 pr-3 font-mono">
                      {name}
                      {required.has(name) && <span className="ml-0.5 text-red-500">*</span>}
                    </td>
                    <td className="py-1 pr-3 text-muted-foreground">{prop.type}</td>
                    <td className="py-1 text-muted-foreground">{prop.description ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main chat panel ──────────────────────────────────────────────────────────

export function AiToolBuilder({ onToolSaved }: { onToolSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedToolIds, setSavedToolIds] = useState<Set<string>>(new Set());
  const [savingToolId, setSavingToolId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      // Greet on first open
      if (messages.length === 0) {
        setMessages([{
          role: "assistant",
          content: "Hi! I'll help you build a custom tool. Just describe what you want the tool to do — what task should it perform, and when would an AI agent use it?",
        }]);
      }
    }
  }, [open, messages.length]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    setError(null);

    const userMsg: Message = { role: "user", content: text.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setStreaming(true);

    // Placeholder for streaming assistant response
    const assistantIdx = nextMessages.length;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/tools/ai-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `API error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m, i) => (i === assistantIdx ? { ...m, content: accumulated } : m)),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((prev) => prev.filter((_, i) => i !== assistantIdx));
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming]);

  async function handleSaveTool(tool: BuiltTool) {
    setSavingToolId(tool.id);
    try {
      const res = await fetch("/api/tools/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tool.id,
          name: tool.name,
          description: tool.description,
          toolType: tool.toolType,
          config: tool.config,
          inputSchema: tool.inputSchema,
          enabled: true,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; issues?: { message: string }[] };
        throw new Error(body.issues?.[0]?.message ?? body.error ?? "Failed to save");
      }
      setSavedToolIds((prev) => new Set([...prev, tool.id]));
      onToolSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tool");
    } finally {
      setSavingToolId(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input).catch(() => undefined);
    }
  }

  function handleReset() {
    setMessages([]);
    setInput("");
    setError(null);
    setSavedToolIds(new Set());
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 hover:bg-primary/90"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Build with AI
      </button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-primary/20 bg-card flex flex-col" style={{ height: "560px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="icon-badge"><Sparkles className="h-3.5 w-3.5" /></span>
          <span className="text-sm font-semibold">AI Tool Builder</span>
          <span className="text-xs text-muted-foreground">· describe what you want to build</span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 1 && (
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Start over
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => {
          const { tool } = extractToolReady(msg.content);
          // For assistant messages with a tool, show save button on the last such message
          const isLastAssistant = msg.role === "assistant" && i === messages.length - 1 && !streaming;
          return (
            <div key={i}>
              <MessageBubble msg={msg} />
              {/* Render save button attached to the tool preview in the last assistant message */}
              {isLastAssistant && tool && (
                <div className="mt-2 ml-10">
                  <ToolPreview
                    tool={tool}
                    onSave={handleSaveTool}
                    saving={savingToolId === tool.id}
                    saved={savedToolIds.has(tool.id)}
                  />
                </div>
              )}
            </div>
          );
        })}

        {streaming && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-muted border flex items-center justify-center shrink-0">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 bg-muted/60 border text-sm text-muted-foreground animate-pulse">
              Thinking…
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-muted/10 rounded-b-xl">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={streaming}
            className="flex-1 resize-none rounded-xl border bg-background/80 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
            placeholder="Describe the tool… (Enter to send, Shift+Enter for newline)"
          />
          <button
            onClick={() => sendMessage(input).catch(() => undefined)}
            disabled={streaming || !input.trim()}
            className="shrink-0 h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
