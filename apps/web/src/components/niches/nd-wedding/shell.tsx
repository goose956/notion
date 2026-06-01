"use client";
import { useState, useEffect, useMemo } from "react";
import { SeatingPlannerView } from "@/app/(members)/members/seating/SeatingPlannerView";
import { NDW_TABS } from "@/lib/niche-registry";
import { N_BORDER, N_MUTED } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { WeddingDraftStudio } from "@/components/niches/wedding-planner/draft-studio";
import { WeddingInvitationCanvas } from "@/components/niches/wedding-planner/invitation-canvas";
import { WeddingSpeechWriter } from "@/components/niches/wedding-planner/speech-writer";
import { WeddingHoneymoonPlanner } from "@/components/niches/wedding-planner/honeymoon-planner";
import { NDWDashboard } from "./dashboard";
import { NDWVendorDump } from "./vendor-dump";
import { NDWFocusFilter } from "./focus-filter";
import { NDWTaskBreakdown } from "./task-breakdown";

export function NDWeddingNicheShell({
  activeTab,
  databases,
  apiCriteria,
  onRowAdded,
  onRowUpdated,
  onRowDeleted,
  onSeatedIdsChanged,
}: {
  activeTab:          string;
  databases:          WorkspaceDatabase[];
  apiCriteria:        Record<string, unknown> | null;
  onRowAdded:         (dbNotionId: string, row: WorkspaceRow) => void;
  onRowUpdated:       (dbNotionId: string, pageId: string, name: string, val: string | number | boolean | null) => void;
  onRowDeleted:       (dbNotionId: string, pageId: string) => void;
  onSeatedIdsChanged: (ids: Set<string>) => void;
}) {
  const nicheId = "neurodivergent-wedding";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);
  const [liveSeatedIds, setLiveSeatedIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    setCriteria(apiCriteria);
    setLiveSeatedIds(null);
  }, [apiCriteria]);

  const guestsDb    = databases.find((d) => d.nicheId === nicheId && d.dbId === "guests")    ?? null;
  const documentsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents") ?? null;
  const honeymoonDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "honeymoon") ?? null;
  const timelineDb  = databases.find((d) => d.nicheId === nicheId && d.dbId === "timeline")  ?? null;
  const vendorsDb   = databases.find((d) => d.nicheId === nicheId && d.dbId === "vendors")   ?? null;

  const seatedGuestIds = useMemo<Set<string>>(() => {
    if (liveSeatedIds !== null) return liveSeatedIds;
    const layout = criteria?.["seating-layout-v1"] as
      | { tables?: Array<{ guestIds?: Array<string | null> }> }
      | null
      | undefined;
    const ids = new Set<string>();
    for (const table of layout?.tables ?? []) {
      for (const id of table.guestIds ?? []) {
        if (id) ids.add(id);
      }
    }
    return ids;
  }, [liveSeatedIds, criteria]);

  useEffect(() => {
    onSeatedIdsChanged(seatedGuestIds);
  }, [seatedGuestIds, onSeatedIdsChanged]);

  if (activeTab === NDW_TABS.DASHBOARD) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <NDWDashboard
        databases={databases}
        criteria={criteria}
        onCriteriaUpdated={setCriteria}
        nicheId={nicheId}
      />
    </div>
  );

  if (activeTab === NDW_TABS.SEATING) return (
    <SeatingPlannerView guestsDb={guestsDb} embedded onSeatingChanged={setLiveSeatedIds} nicheId={nicheId} />
  );

  if (activeTab === NDW_TABS.DRAFT) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      {documentsDb ? (
        <WeddingDraftStudio
          db={documentsDb}
          onRowAdded={(row) => onRowAdded(documentsDb.notionId, row)}
          nicheId={nicheId}
        />
      ) : (
        <div style={{ border: `1px solid ${N_BORDER}`, borderRadius: "8px", background: "#faf8ff", padding: "16px", color: N_MUTED, fontSize: "13px" }}>
          Draft Letters needs the Documents database to be available.
        </div>
      )}
    </div>
  );

  if (activeTab === NDW_TABS.INVITATION) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <WeddingInvitationCanvas
        weddingCriteria={criteria}
        documentsDb={documentsDb}
        onDocumentSaved={(row) => { if (!documentsDb) return; onRowAdded(documentsDb.notionId, row); }}
      />
    </div>
  );

  if (activeTab === NDW_TABS.SPEECH) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <WeddingSpeechWriter
        weddingCriteria={criteria}
        onWeddingCriteriaUpdated={setCriteria}
        documentsDb={documentsDb}
        onDocumentSaved={(row) => { if (!documentsDb) return; onRowAdded(documentsDb.notionId, row); }}
        onDocumentDeleted={(pageId) => { if (!documentsDb) return; onRowDeleted(documentsDb.notionId, pageId); }}
        nicheId={nicheId}
      />
    </div>
  );

  if (activeTab === NDW_TABS.HONEYMOON) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <WeddingHoneymoonPlanner
        honeymoonDb={honeymoonDb}
        onRowAdded={(row) => { if (!honeymoonDb) return; onRowAdded(honeymoonDb.notionId, row); }}
        onRowUpdated={(pageId, name, val) => { if (!honeymoonDb) return; onRowUpdated(honeymoonDb.notionId, pageId, name, val); }}
        onRowDeleted={(pageId) => { if (!honeymoonDb) return; onRowDeleted(honeymoonDb.notionId, pageId); }}
      />
    </div>
  );

  if (activeTab === NDW_TABS.VENDOR_DUMP) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <NDWVendorDump
        vendorsDb={vendorsDb}
        onRowAdded={onRowAdded}
      />
    </div>
  );

  if (activeTab === NDW_TABS.FOCUS) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <NDWFocusFilter
        timelineDb={timelineDb}
        criteria={criteria}
      />
    </div>
  );

  if (activeTab === NDW_TABS.BREAKDOWN) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <NDWTaskBreakdown
        timelineDb={timelineDb}
        onRowAdded={onRowAdded}
      />
    </div>
  );

  return null;
}
