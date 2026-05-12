"use client";

import { useEffect, useState, useCallback } from "react";
import { Bot, Play, Plus, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

const AVAILABLE_SKILLS = ["notion_write", "notion_query", "enrich_record"] as const;
const CLAUDE_MODELS = [
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  { value: "claude-opus-4-5", label: "Claude Opus 4.5" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (legacy)" },
] as const;

type AgentDef = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  skillList: unknown;
  defaultConfig: unknown;
  nicheId: string | null;
  createdAt: string;
  updatedAt: string;
};

type AgentRun = {
  id: string;
  customerId: string;
  agentDefId: string;
  trigger: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  tokenUsage: unknown;
  costUsd: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  output: unknown;
};

type RunResult = {
  runId: string;
  status: string;
  tokenUsage: { input: number; output: number; total: number };
  costUsd: string;
  durationMs: number;
  output: Record<string, unknown>;
  errorMessage?: string;
};

function statusBadge(status: string) {
  if (status === "success") return <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle className="h-3.5 w-3.5" />Success</span>;
  if (status === "failed") return <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium"><XCircle className="h-3.5 w-3.5" />Failed</span>;
  if (status === "running") return <span className="inline-flex items-center gap-1 text-xs text-blue-500 font-medium"><Loader2 className="h-3.5 w-3.5 animate-spin" />Running</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium"><Clock className="h-3.5 w-3.5" />{status}</span>;
}

function AgentCard({ agent, onRunComplete }: { agent: AgentDef; onRunComplete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [testInput, setTestInput] = useState("{}");

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}/runs`);
      const data = (await res.json()) as AgentRun[];
      setRuns(data);
    } catch {
      // ignore
    } finally {
      setLoadingRuns(false);
    }
  }, [agent.id]);

  useEffect(() => {
    if (expanded) loadRuns().catch(() => undefined);
  }, [expanded, loadRuns]);

  async function handleRun() {
    setRunning(true);
    setRunResult(null);
    setRunError(null);
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(testInput) as Record<string, unknown>;
    } catch {
      setRunError("Invalid JSON in test input");
      setRunning(false);
      return;
    }
    try {
      const res = await fetch(`/api/agents/${agent.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: "admin-test", input: parsed }),
      });
      const data = (await res.json()) as RunResult | { error: string };
      if (!res.ok) {
        setRunError((data as { error: string }).error ?? "Run failed");
      } else {
        setRunResult(data as RunResult);
        onRunComplete();
        if (expanded) await loadRuns();
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  }

  const skills = Array.isArray(agent.skillList) ? (agent.skillList as string[]) : [];

  return (
    <div className="border rounded-xl bg-card/80 overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="icon-badge mt-0.5 shrink-0"><Bot className="h-4 w-4" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-sm">{agent.name}</h2>
            <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{agent.id}</code>
            <span className="text-xs text-muted-foreground">{agent.model}</span>
          </div>
          {agent.description && <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {skills.map(s => (
                <span key={s} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
          aria-label="Toggle details"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {/* System prompt preview */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">System Prompt</p>
            <pre className="text-xs bg-muted/60 rounded-lg p-3 whitespace-pre-wrap max-h-32 overflow-y-auto">{agent.systemPrompt}</pre>
          </div>

          {/* Test runner */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Test Input (JSON)</p>
            <textarea
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              rows={3}
              className="w-full text-xs font-mono bg-muted/60 border rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder='{"pageId": "abc123", "prompt": "Summarize this record"}'
            />
            <button
              onClick={() => handleRun()}
              disabled={running}
              className="mt-2 inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {running ? "Running…" : "Run Now"}
            </button>
          </div>

          {/* Run result */}
          {runError && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {runError}
            </div>
          )}
          {runResult && (
            <div className={`text-xs rounded-lg px-3 py-2 border ${runResult.status === "success" ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"}`}>
              <div className="flex items-center gap-3 mb-2">
                {statusBadge(runResult.status)}
                <span className="text-muted-foreground">{runResult.durationMs}ms · {runResult.tokenUsage.total} tokens · ${runResult.costUsd}</span>
              </div>
              {runResult.errorMessage && <p className="text-red-600 mb-1">{runResult.errorMessage}</p>}
              <pre className="whitespace-pre-wrap max-h-40 overflow-y-auto">{JSON.stringify(runResult.output, null, 2)}</pre>
            </div>
          )}

          {/* Run history */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Recent Runs</p>
            {loadingRuns && <p className="text-xs text-muted-foreground">Loading…</p>}
            {!loadingRuns && runs.length === 0 && <p className="text-xs text-muted-foreground">No runs yet.</p>}
            {runs.length > 0 && (
              <div className="space-y-1.5">
                {runs.slice(0, 10).map(run => (
                  <div key={run.id} className="flex items-center gap-3 text-xs text-muted-foreground border rounded-lg px-3 py-2 bg-muted/40">
                    {statusBadge(run.status)}
                    <span>{run.trigger}</span>
                    <span>{new Date(run.startedAt).toLocaleString()}</span>
                    {run.durationMs !== null && <span>{run.durationMs}ms</span>}
                    {run.costUsd && <span>${run.costUsd}</span>}
                    {run.errorMessage && <span className="text-red-500 truncate max-w-xs">{run.errorMessage}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateAgentForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI agent. Use the provided tools to complete the task.");
  const [model, setModel] = useState("claude-sonnet-4-5");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  function toggleSkill(skill: string) {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, description, systemPrompt, model, skillList: selectedSkills }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to create agent");
        return;
      }
      setOpen(false);
      setId(""); setName(""); setDescription(""); setSelectedSkills([]);
      setSystemPrompt("You are a helpful AI agent. Use the provided tools to complete the task.");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        New Agent
      </button>
    );
  }

  return (
    <form onSubmit={e => { handleSubmit(e).catch(() => undefined); }} className="border rounded-xl bg-card/80 p-5 space-y-4">
      <h3 className="font-semibold text-sm flex items-center gap-2"><Plus className="h-4 w-4" />New Agent Definition</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">ID (kebab-case)</label>
          <input value={id} onChange={e => setId(e.target.value)} required placeholder="my-agent" className="w-full text-sm bg-muted/60 border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="My Agent" className="w-full text-sm bg-muted/60 border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this agent do?" className="w-full text-sm bg-muted/60 border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Model</label>
        <select value={model} onChange={e => setModel(e.target.value)} className="w-full text-sm bg-muted/60 border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary">
          {CLAUDE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Skills</label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_SKILLS.map(skill => (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${selectedSkills.includes(skill) ? "bg-primary text-primary-foreground border-primary" : "bg-muted/60 border-border hover:border-primary/50"}`}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          required
          rows={5}
          className="w-full text-sm bg-muted/60 border rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          {saving ? "Creating…" : "Create Agent"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function AgentsPanel() {
  const [agents, setAgents] = useState<AgentDef[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      const data = (await res.json()) as AgentDef[];
      setAgents(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents().catch(() => undefined);
  }, [loadAgents]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{agents.length} agent{agents.length !== 1 ? "s" : ""} defined</p>
        <CreateAgentForm onCreated={() => loadAgents().catch(() => undefined)} />
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading agents…</p>}

      {!loading && agents.length === 0 && (
        <div className="border rounded-xl bg-card/50 p-8 text-center">
          <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No agents yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first agent definition above.</p>
        </div>
      )}

      <div className="space-y-3">
        {agents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            onRunComplete={() => loadAgents().catch(() => undefined)}
          />
        ))}
      </div>
    </div>
  );
}
