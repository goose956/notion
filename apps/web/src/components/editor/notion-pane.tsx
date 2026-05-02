"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Database,
  Loader2,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NichePack } from "@niche-factory/schema";

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

  async function handleDeploy() {
    if (!parentPageId.trim()) return;
    setPanelState("deploying");
    setStatusMsg(null);

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack, parentPageId: parentPageId.trim() }),
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
              onClick={handleDeploy}
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
          {pack.dataSources.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Data sources
              </p>
              <div className="space-y-1.5">
                {pack.dataSources.map((src) => (
                  <div
                    key={src.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <p className="text-xs font-medium truncate">{src.label}</p>
                    <Badge variant="outline" className="text-xs ml-2 shrink-0">
                      {src.schedule ?? "daily"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
