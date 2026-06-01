"use client";
import { useState, useEffect } from "react";
import { FD_TABS } from "@/lib/niche-registry";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { FoodBusinessDashboard } from "./dashboard";
import { FDPlanBuilder } from "./plan-builder";
import { FDFinancialProjector } from "./financial-projector";
import { FDComplianceChecklist } from "./compliance-checklist";

export function FoodBusinessNicheShell({
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
  const _ = [onRowUpdated, onRowDeleted];
  const nicheId = "food-business";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);

  useEffect(() => { setCriteria(apiCriteria); }, [apiCriteria]);

  const documentsDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents")  ?? null;
  const financialsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "financials") ?? null;
  const licencesDb   = databases.find((d) => d.nicheId === nicheId && d.dbId === "licences")   ?? null;

  if (activeTab === FD_TABS.DASHBOARD) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <FoodBusinessDashboard databases={databases} criteria={criteria} nicheId={nicheId} />
    </div>
  );

  if (activeTab === FD_TABS.PLAN) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <FDPlanBuilder criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === FD_TABS.FINANCIALS) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <FDFinancialProjector criteria={criteria} financialsDb={financialsDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === FD_TABS.COMPLIANCE) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <FDComplianceChecklist criteria={criteria} licencesDb={licencesDb} onRowAdded={onRowAdded} />
    </div>
  );

  return null;
}
