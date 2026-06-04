"use client";
import { useState, useEffect, type ReactNode } from "react";
import { VIBE_CODER_TABS } from "@/lib/niche-registry";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { VibeCoderDashboard }  from "./dashboard";
import { VibeIdeaScorer }      from "./idea-scorer";
import { VibeProjectPlanner }  from "./project-planner";
import { VibeLaunchKit }       from "./launch-kit";
import { VibeCoderLibrary }    from "./library";

export function VibeCoderNicheShell({
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
  const nicheId = "vibe-coder";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);
  useEffect(() => { setCriteria(apiCriteria); }, [apiCriteria]);

  const documentsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents") ?? null;

  const wrap = (children: ReactNode) => (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>{children}</div>
  );

  if (activeTab === VIBE_CODER_TABS.DASHBOARD) return wrap(<VibeCoderDashboard databases={databases} criteria={criteria} />);
  if (activeTab === VIBE_CODER_TABS.SCORE)     return wrap(<VibeIdeaScorer criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === VIBE_CODER_TABS.PLAN)      return wrap(<VibeProjectPlanner criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === VIBE_CODER_TABS.LAUNCH)    return wrap(<VibeLaunchKit criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === VIBE_CODER_TABS.LIBRARY)   return wrap(<VibeCoderLibrary databases={databases} />);

  return null;
}
