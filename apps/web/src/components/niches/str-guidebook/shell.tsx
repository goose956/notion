"use client";
import { useState, useEffect } from "react";
import { STR_TABS } from "@/lib/niche-registry";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { STRDashboard } from "./dashboard";
import { STRGuidebookBuilder } from "./guidebook-builder";
import { STRWelcomePack } from "./welcome-pack";
import { STRGuestComms } from "./guest-comms";

export function STRGuidebookNicheShell({
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
  const nicheId = "str-guidebook";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);
  useEffect(() => { setCriteria(apiCriteria); }, [apiCriteria]);

  const guidebookDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "guidebook") ?? null;
  const welcomeDb   = databases.find((d) => d.nicheId === nicheId && d.dbId === "welcome-pack") ?? null;
  const messagesDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "guest-messages") ?? null;

  if (activeTab === STR_TABS.DASHBOARD) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <STRDashboard databases={databases} criteria={criteria} nicheId={nicheId} />
    </div>
  );

  if (activeTab === STR_TABS.GUIDEBOOK) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <STRGuidebookBuilder criteria={criteria} guidebookDb={guidebookDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === STR_TABS.WELCOME_PACK) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <STRWelcomePack criteria={criteria} welcomeDb={welcomeDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === STR_TABS.GUEST_COMMS) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <STRGuestComms criteria={criteria} messagesDb={messagesDb} onRowAdded={onRowAdded} />
    </div>
  );

  return null;
}
