import { AgentsPanel } from "@/components/agents/agents-panel";
import { Bot, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AdminAgentsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground bg-background/80 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          AI Agents
        </div>
        <h1 className="text-2xl font-bold tracking-tight inline-flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Agents
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create and run Claude-powered agents with Notion skills. Click an agent to expand, test with custom input, and view run history.
        </p>
      </div>

      <AgentsPanel />
    </div>
  );
}
