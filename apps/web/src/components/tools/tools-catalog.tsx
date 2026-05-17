"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AiToolBuilder } from "./ai-tool-builder";

// ─── Types ───────────────────────────────────────────────────────────────────

type InputProp = {
  type: string;
  description?: string;
};

type InputSchema = {
  type: "object";
  properties?: Record<string, InputProp>;
  required?: string[];
};

type BuiltinTool = {
  name: string;
  description: string;
  inputSchema: InputSchema;
};

type CustomToolRow = {
  id: string;
  name: string;
  description: string;
  toolType: string;
  config: Record<string, unknown>;
  inputSchema: InputSchema;
  enabled: boolean;
  createdAt: string;
};

type SettingsState = {
  serperApiKeyConfigured: boolean;
  resendApiKeyConfigured: boolean;
  apifyTokenConfigured: boolean;
};

type ParamDef = {
  name: string;
  type: "string" | "number" | "boolean" | "object";
  description: string;
  required: boolean;
};

// ─── Built-in tool API key requirements ────────────────────────────────────────

const TOOL_API_KEY: Record<string, { label: string; settingsKey: keyof SettingsState }> = {
  web_search: { label: "SERPER_API_KEY", settingsKey: "serperApiKeyConfigured" },
  send_email: { label: "RESEND_API_KEY", settingsKey: "resendApiKeyConfigured" },
  run_apify: { label: "APIFY_TOKEN", settingsKey: "apifyTokenConfigured" },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function InputSchemaTable({ schema }: { schema: InputSchema }) {
  const props = Object.entries(schema.properties ?? {});
  const required = new Set(schema.required ?? []);
  if (props.length === 0) return <p className="text-xs text-muted-foreground">No parameters.</p>;

  return (
    <table className="w-full text-xs border-collapse mt-2">
      <thead>
        <tr className="text-left text-muted-foreground border-b">
          <th className="pb-1 pr-3 font-medium">Parameter</th>
          <th className="pb-1 pr-3 font-medium">Type</th>
          <th className="pb-1 font-medium">Description</th>
        </tr>
      </thead>
      <tbody>
        {props.map(([name, prop]) => (
          <tr key={name} className="border-b border-border/40">
            <td className="py-1 pr-3 font-mono">
              {name}
              {required.has(name) && <span className="ml-1 text-red-500">*</span>}
            </td>
            <td className="py-1 pr-3 text-muted-foreground">{prop.type}</td>
            <td className="py-1 text-muted-foreground">{prop.description ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BuiltinToolCard({ tool, settings }: { tool: BuiltinTool; settings: SettingsState | null }) {
  const keyInfo = TOOL_API_KEY[tool.name];
  const configured = keyInfo && settings ? settings[keyInfo.settingsKey] : null;

  return (
    <div className="surface-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-sm font-semibold">{tool.name}</span>
          <span className="ml-2 text-xs bg-blue-100 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">built-in</span>
          <p className="text-sm text-muted-foreground mt-0.5">{tool.description}</p>
        </div>
        {keyInfo && (
          configured === true ? (
            <span className="shrink-0 inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">✓ {keyInfo.label}</span>
          ) : configured === false ? (
            <Link href="/admin/settings" className="shrink-0 inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 hover:bg-amber-100">
              ⚠ {keyInfo.label} – configure
            </Link>
          ) : null
        )}
      </div>
      <InputSchemaTable schema={tool.inputSchema} />
    </div>
  );
}

const TOOL_TYPE_BADGE: Record<string, string> = {
  webhook: "bg-blue-100 text-blue-700 border-blue-200",
  python: "bg-yellow-100 text-yellow-700 border-yellow-200",
  sql: "bg-green-100 text-green-700 border-green-200",
  http_scraper: "bg-orange-100 text-orange-700 border-orange-200",
  llm_chain: "bg-purple-100 text-purple-700 border-purple-200",
};

function toolTypeLabel(t: string) {
  return { webhook: "webhook", python: "python", sql: "sql", http_scraper: "http scraper", llm_chain: "llm chain" }[t] ?? t;
}

function CustomToolCard({
  tool,
  onToggle,
  onDelete,
}: {
  tool: CustomToolRow;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = tool.config as { url?: string; method?: string; code?: string; query?: string; prompt_template?: string; url_template?: string };
  const badgeCls = TOOL_TYPE_BADGE[tool.toolType] ?? "bg-muted text-muted-foreground border";

  return (
    <div className="surface-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-sm font-semibold">{tool.name}</span>
          <span className={`ml-2 text-xs border rounded-full px-2 py-0.5 ${badgeCls}`}>custom · {toolTypeLabel(tool.toolType)}</span>
          {!tool.enabled && (
            <span className="ml-1 text-xs bg-muted text-muted-foreground border rounded-full px-2 py-0.5">disabled</span>
          )}
          <p className="text-sm text-muted-foreground mt-0.5">{tool.description}</p>
          {cfg.url && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-sm">
              {cfg.method ?? "POST"} {cfg.url}
            </p>
          )}
          {cfg.url_template && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-sm">
              GET {cfg.url_template}
            </p>
          )}
          {cfg.query && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-sm">
              SQL: {String(cfg.query).slice(0, 80)}{String(cfg.query).length > 80 ? "…" : ""}
            </p>
          )}
          {cfg.prompt_template && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm italic">
              Prompt: {String(cfg.prompt_template).slice(0, 80)}…
            </p>
          )}
          {cfg.code && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Python · {String(cfg.code).split("\n").length} lines
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-3">
          <button
            onClick={() => onToggle(tool.id, !tool.enabled)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            {tool.enabled ? "Disable" : "Enable"}
          </button>
          <button
            onClick={() => onDelete(tool.id)}
            className="text-xs text-red-600 hover:text-red-800 underline"
          >
            Delete
          </button>
        </div>
      </div>
      <InputSchemaTable schema={tool.inputSchema} />
    </div>
  );
}

// ─── Create form ─────────────────────────────────────────────────────────────

function CreateToolForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [id, setId] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "PATCH">("POST");
  const [authHeader, setAuthHeader] = useState("");
  const [params, setParams] = useState<ParamDef[]>([]);

  function addParam() {
    setParams((p) => [...p, { name: "", type: "string", description: "", required: false }]);
  }

  function updateParam(idx: number, field: keyof ParamDef, value: string | boolean) {
    setParams((p) => p.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  function removeParam(idx: number) {
    setParams((p) => p.filter((_, i) => i !== idx));
  }

  function reset() {
    setId(""); setDescription(""); setUrl(""); setMethod("POST"); setAuthHeader(""); setParams([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/tools/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: id, description, toolType: "webhook", url, method, authHeader, params }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; issues?: { message: string }[] };
        throw new Error(body.issues?.[0]?.message ?? body.error ?? "Failed to create tool");
      }

      reset();
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tool");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-lg border bg-background/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 hover:bg-primary/90"
      >
        + New Custom Tool
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card p-5 space-y-4 border-2 border-primary/20">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Create Custom Tool</h3>
        <button type="button" onClick={() => { setOpen(false); reset(); }} className="text-muted-foreground hover:text-foreground text-sm">
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block text-sm space-y-1">
          <span className="font-medium">Tool ID / Name <span className="text-red-500">*</span></span>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
            className={inputCls}
            placeholder="my_tool_name"
            required
          />
          <span className="text-xs text-muted-foreground">
            Lowercase + underscores. This is the tool name Claude sees.
          </span>
        </label>

        <label className="block text-sm space-y-1">
          <span className="font-medium">Type</span>
          <select value="webhook" disabled className={inputCls + " opacity-60"}>
            <option value="webhook">Webhook (HTTP request)</option>
          </select>
          <span className="text-xs text-muted-foreground">More types coming soon.</span>
        </label>
      </div>

      <label className="block text-sm space-y-1">
        <span className="font-medium">Description <span className="text-red-500">*</span></span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
          rows={2}
          placeholder="Describe what this tool does and when Claude should use it. Be specific – this text is how Claude decides to call it."
          required
        />
      </label>

      <div className="border-t pt-3 space-y-3">
        <h4 className="text-sm font-medium">Webhook Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm space-y-1">
              <span className="font-medium">Webhook URL <span className="text-red-500">*</span></span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={inputCls}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                required
              />
            </label>
          </div>
          <label className="block text-sm space-y-1">
            <span className="font-medium">Method</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
              className={inputCls}
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </select>
          </label>
        </div>

        <label className="block text-sm space-y-1">
          <span className="font-medium">Authorization Header <span className="text-xs text-muted-foreground">(optional)</span></span>
          <input
            type="text"
            value={authHeader}
            onChange={(e) => setAuthHeader(e.target.value)}
            className={inputCls}
            placeholder="Bearer sk-... or Basic ..."
            autoComplete="off"
          />
          <span className="text-xs text-muted-foreground">
            Sent as the Authorization header with every request.
          </span>
        </label>
      </div>

      <div className="border-t pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Input Parameters</h4>
          <button type="button" onClick={addParam} className="text-xs text-primary underline">
            + Add parameter
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Define what data Claude can pass to this tool. The full set of args is sent as a JSON body to your webhook.
        </p>

        {params.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No parameters – webhook will receive an empty JSON object.
          </p>
        )}

        {params.map((p, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 bg-muted/30 rounded-lg">
            <div className="col-span-3">
              <label className="text-xs text-muted-foreground block mb-1">Name</label>
              <input
                type="text"
                value={p.name}
                onChange={(e) => updateParam(i, "name", e.target.value)}
                className={inputCls}
                placeholder="param_name"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Type</label>
              <select value={p.type} onChange={(e) => updateParam(i, "type", e.target.value)} className={inputCls}>
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="object">object</option>
              </select>
            </div>
            <div className="col-span-5">
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <input
                type="text"
                value={p.description}
                onChange={(e) => updateParam(i, "description", e.target.value)}
                className={inputCls}
                placeholder="What is this parameter for?"
              />
            </div>
            <div className="col-span-1 flex flex-col items-center gap-1">
              <label className="text-xs text-muted-foreground">Req.</label>
              <input
                type="checkbox"
                checked={p.required}
                onChange={(e) => updateParam(i, "required", e.target.checked)}
              />
            </div>
            <div className="col-span-1 flex items-center justify-center">
              <button type="button" onClick={() => removeParam(i)} className="text-red-500 hover:text-red-700">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-9 px-4 hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Creating..." : "Create Tool"}
        </button>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    </form>
  );
}

// ─── Main catalog component ──────────────────────────────────────────────────

export function ToolsCatalog() {
  const [builtins, setBuiltins] = useState<BuiltinTool[]>([]);
  const [customs, setCustoms] = useState<CustomToolRow[]>([]);
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [toolsRes, customRes, settingsRes] = await Promise.all([
        fetch("/api/tools", { cache: "no-store" }),
        fetch("/api/tools/custom", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
      ]);

      if (!toolsRes.ok) throw new Error("Failed to load built-in tools");
      if (!customRes.ok) {
        const body = await customRes.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Custom tools API error ${customRes.status}`);
      }
      if (!settingsRes.ok) throw new Error("Failed to load settings");

      const [toolsData, customData, settingsData] = await Promise.all([
        toolsRes.json() as Promise<BuiltinTool[]>,
        customRes.json() as Promise<CustomToolRow[]>,
        settingsRes.json() as Promise<SettingsState>,
      ]);

      setBuiltins(toolsData);
      setCustoms(customData);
      setSettings(settingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function handleToggle(id: string, enabled: boolean) {
    await fetch(`/api/tools/custom/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setCustoms((prev) => prev.map((s) => (s.id === id ? { ...s, enabled } : s)));
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete custom tool "${id}"? This cannot be undone.`)) return;
    await fetch(`/api/tools/custom/${id}`, { method: "DELETE" });
    setCustoms((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading tools...</div>;
  if (error) return <div className="text-sm text-red-700">Error: {error}</div>;

  const needingKeys = builtins.filter((s) => TOOL_API_KEY[s.name] !== undefined);
  const configuredCount = needingKeys.filter((s) => {
    const k = TOOL_API_KEY[s.name];
    return k !== undefined && settings !== null && settings[k.settingsKey];
  }).length;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span>{builtins.length} built-in tools</span>
        <span>·</span>
        <span>{customs.length} custom tool{customs.length !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>{configuredCount}/{needingKeys.length} API keys configured</span>
        {configuredCount < needingKeys.length && (
          <>
            <span>·</span>
            <Link href="/admin/settings" className="underline text-primary">
              Configure missing keys →
            </Link>
          </>
        )}
      </div>

      {/* Custom tools */}
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-base">Custom Tools</h2>
          <div className="flex items-center gap-2">
            <AiToolBuilder onToolSaved={() => { load().catch(() => undefined); }} />
            <CreateToolForm onCreated={() => { load().catch(() => undefined); }} />
          </div>
        </div>

        {customs.length === 0 && (
          <div className="surface-card p-6 text-center space-y-1">
            <p className="text-sm font-medium">No custom tools yet.</p>
            <p className="text-sm text-muted-foreground">
              Use <strong>Build with AI</strong> to create any kind of tool through conversation, or use <strong>+ New Custom Tool</strong> to configure a webhook manually.
            </p>
          </div>
        )}

        {customs.map((tool) => (
          <CustomToolCard
            key={tool.id}
            tool={tool}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ))}
      </section>

      {/* Built-in tools */}
      <section className="space-y-3">
        <h2 className="font-semibold text-base">Built-in Tools</h2>
        {builtins.map((tool) => (
          <BuiltinToolCard key={tool.name} tool={tool} settings={settings} />
        ))}
      </section>
    </div>
  );
}
