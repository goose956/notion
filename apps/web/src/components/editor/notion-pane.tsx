"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Database,
  Loader2,
  Play,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NichePack } from "@niche-factory/schema";
import { OnboardingModal, type OnboardingQuestion } from "./onboarding-modal";

interface NotionPaneProps {
  pack: NichePack;
  onPackUpdate: (updated: NichePack) => void;
}

type PanelState = "idle" | "deploying" | "success" | "error";

interface DeployResult {
  databaseIds: Record<string, string>;
  durationMs: number;
}

export function NotionPane({ pack, onPackUpdate }: NotionPaneProps) {
  const [parentPageId, setParentPageId] = useState("");
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [lastDeploy, setLastDeploy] = useState<DeployResult | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<string, unknown>>({});

  const onboardingQuestions = (pack.onboardingQuestions ?? []) as OnboardingQuestion[];

  function handleDeployClick() {
    if (!parentPageId.trim()) return;
    if (onboardingQuestions.length > 0 && lastDeploy === null) {
      setShowOnboarding(true);
    } else {
      void handleDeploy(onboardingAnswers);
    }
  }

  function handleOnboardingComplete(answers: Record<string, unknown>) {
    setOnboardingAnswers(answers);
    setShowOnboarding(false);
    void handleDeploy(answers);
  }

  async function handleDeploy(answers: Record<string, unknown> = {}) {
    if (!parentPageId.trim()) return;
    setPanelState("deploying");
    setStatusMsg(null);

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack, parentPageId: parentPageId.trim(), onboardingAnswers: answers }),
      });

      const body = await res.json() as { result?: DeployResult; error?: string };

      if (!res.ok) throw new Error(body.error ?? "Deploy failed");

      setLastDeploy(body.result!);
      setPanelState("success");
      setStatusMsg(
        `Deployed ${Object.keys(body.result!.databaseIds).length} databases in ${body.result!.durationMs}ms`,
      );
    } catch (err) {
      setPanelState("error");
      setStatusMsg(err instanceof Error ? err.message : "Deploy failed");
    }
  }

  async function handleExport() {
    if (!parentPageId.trim() || !lastDeploy) return;
    setPanelState("deploying");
    setStatusMsg("Pulling from Notion…");

    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPageId: parentPageId.trim(),
          databaseIds: lastDeploy.databaseIds,
          existingPack: pack,
        }),
      });

      const body = await res.json() as { pack?: NichePack; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Export failed");

      onPackUpdate(body.pack!);
      setPanelState("success");
      setStatusMsg("Schema pulled and updated from Notion");
    } catch (err) {
      setPanelState("error");
      setStatusMsg(err instanceof Error ? err.message : "Export failed");
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <Plug className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Notion</span>
        {lastDeploy !== null && (
          <Badge variant="secondary" className="ml-auto text-xs">
            deployed
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-5">
          {/* Parent page ID */}
          <div className="space-y-1.5">
            <Label htmlFor="parentPageId" className="text-xs">
              Parent page ID
            </Label>
            <Input
              id="parentPageId"
              placeholder="abc123..."
              className="text-xs font-mono h-8"
              value={parentPageId}
              onChange={(e) => setParentPageId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paste the 32-char Notion page ID where databases will be created.
            </p>
          </div>

          {/* Status */}
          {statusMsg !== null && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
                panelState === "success" &&
                  "border-green-200 bg-green-50 text-green-700",
                panelState === "error" &&
                  "border-destructive/30 bg-destructive/10 text-destructive",
              )}
            >
              {panelState === "success" && (
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              )}
              {statusMsg}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <Button
              className="w-full gap-2 text-sm"
              onClick={handleDeployClick}
              disabled={panelState === "deploying" || !parentPageId.trim()}
            >
              {panelState === "deploying" && statusMsg === null ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpFromLine className="h-4 w-4" />
              )}
              Push to Notion
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 text-sm"
              onClick={handleExport}
              disabled={
                panelState === "deploying" ||
                !parentPageId.trim() ||
                lastDeploy === null
              }
            >
              {panelState === "deploying" && statusMsg !== null ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-4 w-4" />
              )}
              Pull from Notion
            </Button>
          </div>

          {/* Schema summary */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Schema summary
            </p>
            <div className="space-y-1.5">
              {pack.databases.map((db) => (
                <div
                  key={db.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{db.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {db.properties.length} properties
                    </p>
                  </div>
                  {lastDeploy?.databaseIds[db.id] !== undefined && (
                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Data sources */}
          {pack.dataSources.length > 0 && lastDeploy !== null && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Data sources
              </p>
              <div className="space-y-1.5">
                {pack.dataSources.map((src) => (
                  <SyncRow
                    key={src.id}
                    nicheId={pack.id}
                    adapterId={src.id}
                    label={src.label}
                    schedule={src.schedule ?? "daily"}
                    databaseIds={lastDeploy!.databaseIds}
                    targetDatabaseId={src.targetDatabaseId}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {showOnboarding && (
        <OnboardingModal
          questions={onboardingQuestions}
          onComplete={handleOnboardingComplete}
          onCancel={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}

interface SyncRowProps {
  nicheId: string;
  adapterId: string;
  label: string;
  schedule: string;
  databaseIds: Record<string, string>;
  targetDatabaseId: string;
}

function SyncRow({
  nicheId,
  adapterId,
  label,
  schedule,
  databaseIds,
  targetDatabaseId,
}: SyncRowProps) {
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    rowsProcessed: number;
    rowsSkipped: number;
    error?: string;
  } | null>(null);

  async function handleRun() {
    setRunning(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nicheId,
          adapterId,
          databaseIds,
          targetDatabaseId,
          criteria: {},
          credentials: {},
        }),
      });
      const body = await res.json() as { result?: typeof lastResult; error?: string };
      setLastResult(body.result ?? {
        rowsProcessed: 0,
        rowsSkipped: 0,
        ...(body.error !== undefined ? { error: body.error } : {}),
      });
    } catch (err) {
      setLastResult({
        rowsProcessed: 0,
        rowsSkipped: 0,
        error: err instanceof Error ? err.message : "Sync failed",
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-md border px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium truncate">{label}</p>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <Badge variant="outline" className="text-xs">
            {schedule}
          </Badge>
          <button
            onClick={handleRun}
            disabled={running}
            className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-accent transition-colors disabled:opacity-50"
            title="Run now"
          >
            {running ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>
      {lastResult !== null && (
        <p
          className={cn(
            "text-xs",
            lastResult.error !== undefined ? "text-destructive" : "text-green-600",
          )}
        >
          {lastResult.error !== undefined
            ? lastResult.error
            : `+${lastResult.rowsProcessed} rows, ${lastResult.rowsSkipped} skipped`}
        </p>
      )}
    </div>
  );
}
