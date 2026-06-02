"use client";
import { useState, useEffect } from "react";
import { CC_TABS } from "@/lib/niche-registry";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { ContentCreatorDashboard } from "./dashboard";
import { CCIdeaGenerator } from "./idea-generator";
import { CCScriptWriter } from "./script-writer";
import { CCCaptionWriter } from "./caption-writer";

export function ContentCreatorNicheShell({
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
  const nicheId = "content-creator";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);

  useEffect(() => { setCriteria(apiCriteria); }, [apiCriteria]);

  const ideasDb   = databases.find((d) => d.nicheId === nicheId && d.dbId === "ideas")   ?? null;
  const scriptsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "scripts") ?? null;

  if (activeTab === CC_TABS.DASHBOARD) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <ContentCreatorDashboard databases={databases} criteria={criteria} nicheId={nicheId} />
    </div>
  );

  if (activeTab === CC_TABS.IDEAS) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <CCIdeaGenerator criteria={criteria} ideasDb={ideasDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === CC_TABS.SCRIPT) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <CCScriptWriter criteria={criteria} scriptsDb={scriptsDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === CC_TABS.CAPTION) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <CCCaptionWriter criteria={criteria} scriptsDb={scriptsDb} onRowAdded={onRowAdded} />
    </div>
  );

  return null;
}
