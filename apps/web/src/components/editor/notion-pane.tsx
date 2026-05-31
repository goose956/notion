"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  Settings2,
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

function parseCriteriaList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v).trim())
      .filter((v) => v.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
  return [];
}

function getMissingApifySettings(criteria: Record<string, unknown>): string[] {
  const missing: string[] = [];
  if (parseCriteriaList(criteria["lead-keywords"]).length === 0) {
    missing.push("lead-keywords");
  }
  if (parseCriteriaList(criteria["target-locations"]).length === 0) {
    missing.push("target-locations");
  }
  return missing;
}

export function NotionPane({ pack, onPackUpdate }: NotionPaneProps) {
  const router = useRouter();
  const [parentPageId, setParentPageId] = useState("");
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [lastDeploy, setLastDeploy] = useState<DeployResult | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<string, unknown>>({});
  const [criteriaLoaded, setCriteriaLoaded] = useState(false);
  const [importInProgress, setImportInProgress] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    label: string;
  } | null>(null);

  const onboardingQuestions = (pack.onboardingQuestions ?? []) as OnboardingQuestion[];

  // Load any previously saved criteria for this niche on mount
  useEffect(() => {
    if (onboardingQuestions.length === 0) return;
    void fetch(`/api/criteria/${pack.id}`)
      .then((r) => r.json() as Promise<{ criteria: Record<string, unknown> | null }>)
      .then(({ criteria }) => {
        if (criteria !== null && Object.keys(criteria).length > 0) {
          setOnboardingAnswers(criteria);
          setCriteriaLoaded(true);
        }
      })
      .catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.id]);

  function handleDeployClick() {
    if (!parentPageId.trim()) return;
    // Show onboarding if first deploy AND no saved criteria yet
    if (onboardingQuestions.length > 0 && lastDeploy === null && !criteriaLoaded) {
      setShowOnboarding(true);
    } else {
      void handleDeploy(onboardingAnswers);
    }
  }

  function handleOnboardingComplete(answers: Record<string, unknown>) {
    setOnboardingAnswers(answers);
    setCriteriaLoaded(true);
    setShowOnboarding(false);
    // Persist immediately so syncs always use up-to-date criteria
    void fetch(`/api/criteria/${pack.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criteria: answers }),
    });
    void handleDeploy(answers);
  }

  function handleSettingsComplete(answers: Record<string, unknown>) {
    setOnboardingAnswers(answers);
    setShowOnboarding(false);
    void fetch(`/api/criteria/${pack.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criteria: answers }),
    });
    setStatusMsg("Settings saved — next sync will use updated criteria.");
    setPanelState("success");
  }

  async function handleDeploy(answers: Record<string, unknown> = {}) {
    if (!parentPageId.trim()) return;
    const isInitialDeploy = lastDeploy === null;
    setPanelState("deploying");
    setStatusMsg(null);

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack, parentPageId: parentPageId.trim(), onboardingAnswers: answers }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error("Not authenticated — please sign in with Notion first");
      }
      const body = await res.json() as { result?: DeployResult; error?: string };

      if (!res.ok) throw new Error(body.error ?? "Deploy failed");

      setLastDeploy(body.result!);

      const deployedDatabaseCount = Object.keys(body.result!.databaseIds).length;
      const deployedMessage =
        `Deployed ${deployedDatabaseCount} databases in ${body.result!.durationMs}ms`;

      // Auto-import on first deploy so users get value immediately.
      // Skip sources with schedule: "manual" — they require explicit user action.
      const autoImportSources = (pack.dataSources ?? []).filter(
        (src) => src.schedule !== "manual",
      );
      if (isInitialDeploy && autoImportSources.length > 0) {
        setImportInProgress(true);
        let totalProcessed = 0;
        let totalSkipped = 0;

        try {
          for (let i = 0; i < autoImportSources.length; i++) {
            const src = autoImportSources[i]!;
            const effectiveCriteria =
              Object.keys(answers).length > 0 ? answers : onboardingAnswers;

            if (src.id === "apify-google-places") {
              const missing = getMissingApifySettings(effectiveCriteria);
              if (missing.length > 0) {
                throw new Error(
                  `Import failed for ${src.label}: missing required settings (${missing.join(", ")}). Open Edit Settings and complete them first.`,
                );
              }
            }

            setImportProgress({
              current: i + 1,
              total: autoImportSources.length,
              label: src.label,
            });

            const syncRes = await fetch("/api/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nicheId: pack.id,
                adapterId: src.id,
                databaseIds: body.result!.databaseIds,
                targetDatabaseId: src.targetDatabaseId,
                criteria: effectiveCriteria,
                credentials: {},
              }),
            });

            const syncBody = await syncRes.json().catch(() => ({ error: "Empty response from sync" })) as {
              result?: { rowsProcessed: number; rowsSkipped: number; error?: string };
              error?: string;
            };

            const result = syncBody.result;
            if (!syncRes.ok || result?.error !== undefined) {
              const msg = result?.error ?? syncBody.error ?? "Sync failed";
              throw new Error(`Import failed for ${src.label}: ${msg}`);
            }

            totalProcessed += result?.rowsProcessed ?? 0;
            totalSkipped += result?.rowsSkipped ?? 0;
          }

          setPanelState("success");
          setStatusMsg(`${deployedMessage}. Imported ${totalProcessed} leads (${totalSkipped} skipped). Redirecting…`);
          setTimeout(() => {
            router.push(`/admin/niches/${pack.id}`);
            router.refresh();
          }, 1200);
        } finally {
          setImportInProgress(false);
          setImportProgress(null);
        }
      } else {
        setPanelState("success");
        setStatusMsg(deployedMessage);
      }
    } catch (err) {
      setImportInProgress(false);
      setImportProgress(null);
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

      const exportContentType = res.headers.get("content-type") ?? "";
      if (!exportContentType.includes("application/json")) {
        throw new Error("Not authenticated — please sign in with Notion first");
      }
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
            {onboardingQuestions.length > 0 && criteriaLoaded && (
              <Button
                variant="outline"
                className="w-full gap-2 text-sm"
                onClick={() => setShowOnboarding(true)}
              >
                <Settings2 className="h-4 w-4" />
                Edit Settings
              </Button>
            )}
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

          {/* Active settings summary */}
          {criteriaLoaded && Object.keys(onboardingAnswers).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Active settings
              </p>
              <div className="rounded-md border px-3 py-2 space-y-1">
                {Object.entries(onboardingAnswers).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-medium truncate max-w-[60%] text-right">
                      {Array.isArray(value) ? value.join(", ") : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
          {(pack.dataSources ?? []).length > 0 && lastDeploy !== null && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Data sources
              </p>
              <div className="space-y-1.5">
                {(pack.dataSources ?? []).map((src) => (
                  <SyncRow
                    key={src.id}
                    nicheId={pack.id}
                    adapterId={src.id}
                    label={src.label}
                    schedule={src.schedule ?? "daily"}
                    databaseIds={lastDeploy!.databaseIds}
                    targetDatabaseId={src.targetDatabaseId}
                    criteria={onboardingAnswers}
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
          initialAnswers={onboardingAnswers}
          onComplete={lastDeploy !== null ? handleSettingsComplete : handleOnboardingComplete}
          onCancel={() => setShowOnboarding(false)}
        />
      )}

      {importInProgress && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="w-full max-w-md rounded-lg border bg-background shadow-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <h3 className="text-sm font-semibold">Importing Leads</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Please wait while we import leads from your connected data sources.
            </p>
            {importProgress !== null && (
              <div className="space-y-1">
                <p className="text-xs font-medium">
                  {importProgress.current}/{importProgress.total}: {importProgress.label}
                </p>
                <div className="h-1.5 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
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
  criteria: Record<string, unknown>;
}

function SyncRow({
  nicheId,
  adapterId,
  label,
  schedule,
  databaseIds,
  targetDatabaseId,
  criteria,
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
      if (adapterId === "apify-google-places") {
        const missing = getMissingApifySettings(criteria);
        if (missing.length > 0) {
          setLastResult({
            rowsProcessed: 0,
            rowsSkipped: 0,
            error: `Missing settings (${missing.join(", ")}). Click Edit Settings and fill them in before running this source.`,
          });
          return;
        }
      }

      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nicheId,
          adapterId,
          databaseIds,
          targetDatabaseId,
          criteria,
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
