"use client";
import { useState, useEffect } from "react";
import { CAKE_TABS } from "@/lib/niche-registry";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { CakeBusinessDashboard } from "./dashboard";
import { CakePlanBuilder } from "./plan-builder";
import { CakePricingCalculator } from "./pricing-calculator";
import { CakeComplianceChecklist } from "./compliance-checklist";

export function CakeBusinessNicheShell({
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
  const nicheId = "cake-business";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);
  useEffect(() => { setCriteria(apiCriteria); }, [apiCriteria]);

  const documentsDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents")   ?? null;
  const financialsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "financials")  ?? null;
  const complianceDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "compliance")  ?? null;

  if (activeTab === CAKE_TABS.DASHBOARD) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <CakeBusinessDashboard databases={databases} criteria={criteria} nicheId={nicheId} />
    </div>
  );

  if (activeTab === CAKE_TABS.PLAN) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <CakePlanBuilder criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === CAKE_TABS.PRICING) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <CakePricingCalculator criteria={criteria} financialsDb={financialsDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === CAKE_TABS.COMPLIANCE) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <CakeComplianceChecklist criteria={criteria} complianceDb={complianceDb} onRowAdded={onRowAdded} />
    </div>
  );

  return null;
}
