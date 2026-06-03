"use client";
import { useState, useEffect, type ReactNode } from "react";
import { FREELANCER_TABS } from "@/lib/niche-registry";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { FreelancerDashboard }      from "./dashboard";
import { FreelancerProposalWriter } from "./proposal-writer";
import { FreelancerInvoiceBuilder } from "./invoice-builder";
import { FreelancerOutreachWriter } from "./outreach-writer";
import { FreelancerLibrary }        from "./library";

export function FreelancerNicheShell({
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
  const nicheId = "freelancer";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);
  useEffect(() => { setCriteria(apiCriteria); }, [apiCriteria]);

  const documentsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents") ?? null;

  const wrap = (children: ReactNode) => (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>{children}</div>
  );

  if (activeTab === FREELANCER_TABS.DASHBOARD) return wrap(<FreelancerDashboard databases={databases} criteria={criteria} />);
  if (activeTab === FREELANCER_TABS.PROPOSAL)  return wrap(<FreelancerProposalWriter criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === FREELANCER_TABS.INVOICE)   return wrap(<FreelancerInvoiceBuilder criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === FREELANCER_TABS.OUTREACH)  return wrap(<FreelancerOutreachWriter criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === FREELANCER_TABS.LIBRARY)   return wrap(<FreelancerLibrary databases={databases} />);

  return null;
}
