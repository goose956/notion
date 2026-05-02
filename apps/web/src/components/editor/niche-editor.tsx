"use client";

import { useCallback, useState } from "react";
import type { NichePack } from "@niche-factory/schema";
import { AiChatPane } from "./ai-chat-pane";
import { SchemaEditorPane } from "./schema-editor-pane";
import { NotionPane } from "./notion-pane";

interface NicheEditorProps {
  initialPack: NichePack;
}

/**
 * NicheEditor — the three-pane layout.
 *
 * State lives here so all three panes share the same `pack` and any pane
 * can update it (AI refine, manual JSON edit, or Notion pull).
 */
export function NicheEditor({ initialPack }: NicheEditorProps) {
  const [pack, setPack] = useState<NichePack>(initialPack);

  const handlePackUpdate = useCallback((updated: NichePack) => {
    setPack(updated);
    // Persist to DB in the background (fire and forget — errors are non-fatal)
    void fetch("/api/niche", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  }, []);

  return (
    <div className="h-[calc(100vh-49px)] flex overflow-hidden">
      {/* Left — AI chat */}
      <div className="w-80 border-r flex flex-col shrink-0">
        <AiChatPane pack={pack} onPackUpdate={handlePackUpdate} />
      </div>

      {/* Center — JSON editor */}
      <div className="flex-1 flex flex-col min-w-0">
        <SchemaEditorPane pack={pack} onPackUpdate={handlePackUpdate} />
      </div>

      {/* Right — Notion deploy/export */}
      <div className="w-80 border-l flex flex-col shrink-0">
        <NotionPane pack={pack} onPackUpdate={handlePackUpdate} />
      </div>
    </div>
  );
}
