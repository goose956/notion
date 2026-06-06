"use client";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { PROJECT_MANAGER_TABS } from "@/lib/niche-registry";
import { PMDashboard } from "./dashboard";
import { PMApplyTemplates } from "./apply-templates";
import { PMFocusMode } from "./focus-mode";
import { PMTaskBreakdown } from "./task-breakdown";
import { PMDocuments } from "./documents";

export function ProjectManagerShell({
  activeTab,
  databases,
  apiCriteria,
  onRowAdded,
  onRowUpdated,
  onRowDeleted,
}: {
  activeTab: string;
  databases: WorkspaceDatabase[];
  apiCriteria: Record<string, unknown> | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
  onRowUpdated: (dbNotionId: string, pageId: string, name: string, val: string | number | boolean | null) => void;
  onRowDeleted: (dbNotionId: string, pageId: string) => void;
}) {
  const projectsDb  = databases.find((d) => d.nicheId === "project-manager" && d.dbId === "projects") ?? null;
  // dbId match only — nicheId guard omitted so a schemaSnapshot mismatch can't hide the DB
  const documentsDb = databases.find((d) => d.dbId === "documents") ?? null;
  const tasksDb     = databases.find((d) => d.nicheId === "project-manager" && d.dbId === "tasks") ?? null;
  const templatesDb = databases.find((d) => d.nicheId === "project-manager" && d.dbId === "task-templates") ?? null;
  const reviewsDb   = databases.find((d) => d.nicheId === "project-manager" && d.dbId === "weekly-reviews") ?? null;
  if (activeTab === PROJECT_MANAGER_TABS.DASHBOARD) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <PMDashboard
        projectsDb={projectsDb}
        tasksDb={tasksDb}
        reviewsDb={reviewsDb}
        criteria={apiCriteria}
      />
    </div>
  );

  if (activeTab === PROJECT_MANAGER_TABS.APPLY_TEMPLATES) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <PMApplyTemplates
        projectsDb={projectsDb}
        templatesDb={templatesDb}
        tasksDb={tasksDb}
        onRowAdded={onRowAdded}
      />
    </div>
  );

  if (activeTab === PROJECT_MANAGER_TABS.FOCUS_MODE) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <PMFocusMode
        projectsDb={projectsDb}
        tasksDb={tasksDb}
        criteria={apiCriteria}
      />
    </div>
  );

  if (activeTab === PROJECT_MANAGER_TABS.TASK_BREAKDOWN) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <PMTaskBreakdown
        tasksDb={tasksDb}
        projectsDb={projectsDb}
        onRowAdded={onRowAdded}
      />
    </div>
  );

  if (activeTab === PROJECT_MANAGER_TABS.DOCUMENTS) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <PMDocuments
        documentsDb={documentsDb}
        projectsDb={projectsDb}
        onRowAdded={onRowAdded}
        onRowUpdated={onRowUpdated}
        onRowDeleted={onRowDeleted}
      />
    </div>
  );

  return null;
}
