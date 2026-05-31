"use client";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { PINTEREST_TABS } from "@/lib/niche-registry";
import { PinterestDashboard } from "./dashboard";
import { PinterestCreatePin } from "./create-pin";

export function PinterestShell({
  activeTab,
  databases,
  apiCriteria,
  onRowAdded,
}: {
  activeTab: string;
  databases: WorkspaceDatabase[];
  apiCriteria: Record<string, unknown> | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
  onRowUpdated: (dbNotionId: string, pageId: string, name: string, val: string | number | boolean | null) => void;
  onRowDeleted: (dbNotionId: string, pageId: string) => void;
}) {
  const pinHistoryDb = databases.find((d) => d.nicheId === "pinterest-poster" && d.dbId === "pin-history") ?? null;

  if (activeTab === PINTEREST_TABS.DASHBOARD) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <PinterestDashboard pinHistoryDb={pinHistoryDb} criteria={apiCriteria} />
    </div>
  );

  if (activeTab === PINTEREST_TABS.CREATE_PIN) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <PinterestCreatePin
        pinHistoryDb={pinHistoryDb}
        criteria={apiCriteria}
        onRowAdded={onRowAdded}
      />
    </div>
  );

  return null;
}
