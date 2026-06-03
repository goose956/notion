"use client";
import { useState, useEffect, type ReactNode } from "react";
import { PT_TABS } from "@/lib/niche-registry";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { PTDashboard }        from "./dashboard";
import { PTProgrammeBuilder } from "./programme-builder";
import { PTCheckinWriter }    from "./checkin-writer";
import { PTNutritionGuide }   from "./nutrition-guide";
import { PTLibrary }          from "./library";

export function PTNicheShell({
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
  const nicheId = "personal-trainer";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);
  useEffect(() => { setCriteria(apiCriteria); }, [apiCriteria]);

  const documentsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents") ?? null;

  const wrap = (children: ReactNode) => (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>{children}</div>
  );

  if (activeTab === PT_TABS.DASHBOARD)   return wrap(<PTDashboard databases={databases} criteria={criteria} />);
  if (activeTab === PT_TABS.PROGRAMME)   return wrap(<PTProgrammeBuilder criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === PT_TABS.CHECKIN)     return wrap(<PTCheckinWriter documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === PT_TABS.NUTRITION)   return wrap(<PTNutritionGuide documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === PT_TABS.LIBRARY)     return wrap(<PTLibrary databases={databases} />);

  return null;
}
