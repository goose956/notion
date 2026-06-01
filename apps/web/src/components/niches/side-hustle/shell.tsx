"use client";
import { useState, useEffect } from "react";
import { SH_TABS } from "@/lib/niche-registry";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { SideHustleDashboard } from "./dashboard";
import { SHPlanBuilder } from "./plan-builder";
import { SHFinancialProjector } from "./financial-projector";
import { SHMarketAnalyser } from "./market-analyser";

export function SideHustleNicheShell({
  activeTab,
  databases,
  apiCriteria,
  onRowAdded,
  onRowUpdated,
  onRowDeleted,
}: {
  activeTab:    string;
  databases:    WorkspaceDatabase[];
  apiCriteria:  Record<string, unknown> | null;
  onRowAdded:   (dbNotionId: string, row: WorkspaceRow) => void;
  onRowUpdated: (dbNotionId: string, pageId: string, name: string, val: string | number | boolean | null) => void;
  onRowDeleted: (dbNotionId: string, pageId: string) => void;
}) {
  const _ = [onRowUpdated, onRowDeleted]; // consumed by DB table rows rendered in workspace page
  const nicheId = "side-hustle";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);

  useEffect(() => { setCriteria(apiCriteria); }, [apiCriteria]);

  const documentsDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents")     ?? null;
  const financialsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "financials")    ?? null;
  const marketDb     = databases.find((d) => d.nicheId === nicheId && d.dbId === "market-research") ?? null;

  if (activeTab === SH_TABS.DASHBOARD) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <SideHustleDashboard databases={databases} criteria={criteria} nicheId={nicheId} />
    </div>
  );

  if (activeTab === SH_TABS.PLAN) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <SHPlanBuilder criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === SH_TABS.FINANCIALS) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <SHFinancialProjector criteria={criteria} financialsDb={financialsDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === SH_TABS.MARKET) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <SHMarketAnalyser criteria={criteria} marketDb={marketDb} onRowAdded={onRowAdded} />
    </div>
  );

  return null;
}
