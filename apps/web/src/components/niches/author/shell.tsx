"use client";
import { useState, useEffect } from "react";
import { AUTHOR_TABS } from "@/lib/niche-registry";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { AuthorDashboard } from "./dashboard";
import { AuthorOutlineBuilder } from "./outline-builder";
import { AuthorCharacterBuilder } from "./character-builder";
import { AuthorSceneWriter } from "./scene-writer";
import { AuthorCoverStudio } from "./cover-studio";
import { AuthorLibrary } from "./library";

export function AuthorNicheShell({
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
  const nicheId = "author";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);
  useEffect(() => { setCriteria(apiCriteria); }, [apiCriteria]);

  const documentsDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents")   ?? null;
  const charactersDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "characters")  ?? null;
  const scenesDb     = databases.find((d) => d.nicheId === nicheId && d.dbId === "scenes")      ?? null;

  if (activeTab === AUTHOR_TABS.DASHBOARD) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <AuthorDashboard databases={databases} criteria={criteria} nicheId={nicheId} />
    </div>
  );

  if (activeTab === AUTHOR_TABS.OUTLINE) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <AuthorOutlineBuilder criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === AUTHOR_TABS.CHARACTERS) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <AuthorCharacterBuilder criteria={criteria} charactersDb={charactersDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === AUTHOR_TABS.SCENE) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <AuthorSceneWriter criteria={criteria} scenesDb={scenesDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === AUTHOR_TABS.COVER) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <AuthorCoverStudio criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />
    </div>
  );

  if (activeTab === AUTHOR_TABS.LIBRARY) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <AuthorLibrary databases={databases} />
    </div>
  );

  return null;
}
