"use client";
import { useState, useEffect } from "react";
import { NAIL_TABS } from "@/lib/niche-registry";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { NailTechDashboard } from "./dashboard";
import { NailPlanBuilder } from "./plan-builder";
import { NailPricingCalculator } from "./pricing-calculator";
import { NailComplianceChecklist } from "./compliance-checklist";

export function NailTechNicheShell({
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
  const nicheId = "nail-tech";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);
  useEffect(() => { setCriteria(apiCriteria); }, [apiCriteria]);

  const documentsDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents")   ?? null;
  const financialsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "financials")  ?? null;
  const complianceDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "compliance")  ?? null;
  if (activeTab === NAIL_TABS.DASHBOARD) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <NailTechDashboard databases={databases} criteria={criteria} nicheId={nicheId} />
    </div>
  );

  if (activeTab === NAIL_TABS.PLAN) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <NailPlanBuilder criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === NAIL_TABS.PRICING) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <NailPricingCalculator criteria={criteria} financialsDb={financialsDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === NAIL_TABS.COMPLIANCE) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <NailComplianceChecklist criteria={criteria} complianceDb={complianceDb} onRowAdded={onRowAdded} />
    </div>
  );

  return null;
}
