"use client";
import { useState, useEffect } from "react";
import { ETSY_TABS } from "@/lib/niche-registry";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { EtsyDashboard } from "./dashboard";
import { EtsyListingWriter } from "./listing-writer";
import { EtsyFinanceTracker } from "./finance-tracker";
import { EtsyReviewManager } from "./review-manager";

export function EtsyShopNicheShell({
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
  const _ = onRowDeleted;
  const nicheId = "etsy-shop";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);

  useEffect(() => { setCriteria(apiCriteria); }, [apiCriteria]);

  const listingsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "listings") ?? null;
  const financeDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "finance")  ?? null;
  const reviewsDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "reviews")  ?? null;

  if (activeTab === ETSY_TABS.DASHBOARD) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <EtsyDashboard databases={databases} criteria={criteria} nicheId={nicheId} />
    </div>
  );

  if (activeTab === ETSY_TABS.LISTING_WRITER) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <EtsyListingWriter criteria={criteria} listingsDb={listingsDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === ETSY_TABS.FINANCIALS) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <EtsyFinanceTracker criteria={criteria} financeDb={financeDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === ETSY_TABS.REVIEWS) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <EtsyReviewManager criteria={criteria} reviewsDb={reviewsDb} onRowAdded={onRowAdded} onRowUpdated={onRowUpdated} />
    </div>
  );

  return null;
}
