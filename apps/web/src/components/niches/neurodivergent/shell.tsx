"use client";
import { useState, useEffect } from "react";
import { N_BORDER, N_MUTED } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { NEURODIVERGENT_TABS } from "@/lib/niche-registry";
import { NeurodivergentDashboard } from "./dashboard";
import { NDBrainDump } from "./brain-dump";
import { NDFocusFilter } from "./focus-filter";
import { NDTaskBreakdown } from "./task-breakdown";

export function NeurodivergentNicheShell({
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
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);

  useEffect(() => {
    setCriteria(apiCriteria);
  }, [apiCriteria]);

  const nicheId = "neurodivergent";
  const tasksDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "tasks")      ?? null;
  const dumpDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "brain-dump") ?? null;

  if (activeTab === NEURODIVERGENT_TABS.DASHBOARD) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <NeurodivergentDashboard
        databases={databases}
        criteria={criteria}
        onCriteriaUpdated={setCriteria}
        nicheId={nicheId}
      />
    </div>
  );

  if (activeTab === NEURODIVERGENT_TABS.BRAIN_DUMP) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      {dumpDb || tasksDb ? (
        <NDBrainDump
          tasksDb={tasksDb}
          dumpDb={dumpDb}
          onRowAdded={onRowAdded}
          nicheId={nicheId}
        />
      ) : (
        <div style={{ border: `1px solid ${N_BORDER}`, borderRadius: "8px", padding: "16px", color: N_MUTED, fontSize: "13px" }}>
          Brain Dump needs the Brain Dump or Tasks database to be deployed.
        </div>
      )}
    </div>
  );

  if (activeTab === NEURODIVERGENT_TABS.FOCUS) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <NDFocusFilter
        tasksDb={tasksDb}
        criteria={criteria}
      />
    </div>
  );

  if (activeTab === NEURODIVERGENT_TABS.BREAKDOWN) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <NDTaskBreakdown
        tasksDb={tasksDb}
        onRowAdded={onRowAdded}
      />
    </div>
  );

  return null;
}
