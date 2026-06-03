"use client";
import { useState, useEffect, type ReactNode } from "react";
import { FBA_TABS } from "@/lib/niche-registry";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { FBADashboard }      from "./dashboard";
import { FBAProductResearch } from "./product-research";
import { FBAListingWriter }  from "./listing-writer";
import { FBASupplierBrief }  from "./supplier-brief";
import { FBALibrary }        from "./library";

export function FBANicheShell({
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
  const nicheId = "amazon-fba";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);
  useEffect(() => { setCriteria(apiCriteria); }, [apiCriteria]);

  const documentsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents") ?? null;

  const wrap = (children: ReactNode) => (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>{children}</div>
  );

  if (activeTab === FBA_TABS.DASHBOARD) return wrap(<FBADashboard databases={databases} criteria={criteria} />);
  if (activeTab === FBA_TABS.RESEARCH)  return wrap(<FBAProductResearch criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === FBA_TABS.LISTING)   return wrap(<FBAListingWriter criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === FBA_TABS.SUPPLIER)  return wrap(<FBASupplierBrief criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === FBA_TABS.LIBRARY)   return wrap(<FBALibrary databases={databases} />);

  return null;
}
