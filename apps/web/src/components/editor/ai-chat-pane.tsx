"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NichePack } from "@niche-factory/schema";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiChatPaneProps {
  pack: NichePack;
  onPackUpdate: (updated: NichePack) => void;
}

export function AiChatPane({ pack, onPackUpdate }: AiChatPaneProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `I've generated the **${pack.name}** niche pack. You can ask me to:\n\n- Add or remove databases\n- Change property types\n- Add data sources\n- Refine onboarding questions\n- Anything else about the schema`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack, feedback: trimmed }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Refine failed");
      }

      const { pack: updated } = (await res.json()) as { pack: NichePack };

      const changes = describeChanges(pack, updated);
      const assistantMsg: Message = {
        role: "assistant",
        content: changes,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      onPackUpdate(updated);

      // Scroll to bottom
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((prev) => prev.slice(0, -1)); // remove the user message on error
      setInput(trimmed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">AI Assistant</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          Claude
        </Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Thinking…</span>
            </div>
          )}
          {error !== null && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-xs px-3 py-2">
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-4 py-3 border-t shrink-0 space-y-2">
        <Textarea
          placeholder="Ask me to change anything about the schema…"
          className="min-h-[72px] resize-none text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              void handleSend();
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">⌘↵ to send</span>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="gap-1.5"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {message.content.split("\n").map((line, i) => (
          <p key={i} className={line === "" ? "h-2" : undefined}>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Produce a human-readable summary of what changed between two packs. */
function describeChanges(before: NichePack, after: NichePack): string {
  const lines: string[] = ["Done! Here's what changed:"];

  const beforeDbs = new Set(before.databases.map((d) => d.id));
  const afterDbs = new Set(after.databases.map((d) => d.id));

  for (const db of after.databases) {
    if (!beforeDbs.has(db.id)) {
      lines.push(`- Added database: **${db.name}**`);
    } else {
      const prev = before.databases.find((d) => d.id === db.id);
      if (prev && prev.properties.length !== db.properties.length) {
        const diff = db.properties.length - prev.properties.length;
        lines.push(
          `- **${db.name}**: ${diff > 0 ? "+" : ""}${diff} properties`,
        );
      }
    }
  }
  for (const id of beforeDbs) {
    if (!afterDbs.has(id)) {
      const db = before.databases.find((d) => d.id === id);
      lines.push(`- Removed database: **${db?.name ?? id}**`);
    }
  }

  const beforeSources = new Set((before.dataSources ?? []).map((s) => s.id));
  const afterSources = new Set((after.dataSources ?? []).map((s) => s.id));
  for (const s of after.dataSources ?? []) {
    if (!beforeSources.has(s.id)) lines.push(`- Added data source: **${s.label}**`);
  }
  for (const id of beforeSources) {
    if (!afterSources.has(id)) {
      const s = (before.dataSources ?? []).find((x) => x.id === id);
      lines.push(`- Removed data source: **${s?.label ?? id}**`);
    }
  }

  if (lines.length === 1) lines.push("- Minor refinements applied.");
  return lines.join("\n");
}
