"use client";
import { useState, useEffect, useMemo } from "react";
import { SeatingPlannerView } from "@/app/(members)/members/seating/SeatingPlannerView";
import { WEDDING_TABS } from "@/lib/niche-registry";
import { N_BORDER, N_MUTED } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { WeddingWorkspaceDashboard } from "./dashboard";
import { WeddingDraftStudio } from "./draft-studio";
import { WeddingInvitationCanvas } from "./invitation-canvas";
import { WeddingSpeechWriter } from "./speech-writer";
import { WeddingHoneymoonPlanner } from "./honeymoon-planner";

// ─── WeddingNicheShell ────────────────────────────────────────────────────────
//
// Owns all wedding-planner state so WorkspacePage has zero wedding knowledge.
// Always stays mounted (while the wedding niche is loaded) so state persists
// across tab switches. Returns null when a non-wedding tab is active.
//
// Reports `seatedGuestIds` upward so the guests DatabaseTable (rendered by
// WorkspacePage on a real DB tab) can reflect live seating changes.

export function WeddingNicheShell({
  activeTab,
  databases,
  apiWeddingCriteria,
  onRowAdded,
  onRowUpdated,
  onRowDeleted,
  onSeatedIdsChanged,
}: {
  activeTab: string;
  databases: WorkspaceDatabase[];
  apiWeddingCriteria: Record<string, unknown> | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
  onRowUpdated: (dbNotionId: string, pageId: string, name: string, val: string | number | boolean | null) => void;
  onRowDeleted: (dbNotionId: string, pageId: string) => void;
  onSeatedIdsChanged: (ids: Set<string>) => void;
}) {
  const [weddingCriteria, setWeddingCriteria] = useState<Record<string, unknown> | null>(apiWeddingCriteria);
  const [liveSeatedIds, setLiveSeatedIds] = useState<Set<string> | null>(null);

  // Sync when the workspace API refreshes
  useEffect(() => {
    setWeddingCriteria(apiWeddingCriteria);
    setLiveSeatedIds(null);
  }, [apiWeddingCriteria]);

  const documentsDb = databases.find((d) => d.nicheId === "wedding-planner" && d.dbId === "documents") ?? null;
  const guestsDb    = databases.find((d) => d.nicheId === "wedding-planner" && d.dbId === "guests")    ?? null;
  const honeymoonDb = databases.find((d) => d.nicheId === "wedding-planner" && d.dbId === "honeymoon") ?? null;

  const seatedGuestIds = useMemo<Set<string>>(() => {
    if (liveSeatedIds !== null) return liveSeatedIds;
    const layout = weddingCriteria?.["seating-layout-v1"] as
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
  }, [liveSeatedIds, weddingCriteria]);

  // Report upward so the guests DB table (in WorkspacePage) stays in sync
  useEffect(() => {
    onSeatedIdsChanged(seatedGuestIds);
  }, [seatedGuestIds, onSeatedIdsChanged]);

  // ── Render the active wedding tab ────────────────────────────────────────
  if (activeTab === WEDDING_TABS.DASHBOARD) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <WeddingWorkspaceDashboard
        databases={databases}
        weddingCriteria={weddingCriteria}
        onWeddingCriteriaUpdated={setWeddingCriteria}
        liveSeatedCount={seatedGuestIds.size}
      />
    </div>
  );

  if (activeTab === WEDDING_TABS.SEATING) return (
    <SeatingPlannerView guestsDb={guestsDb} embedded onSeatingChanged={setLiveSeatedIds} />
  );

  if (activeTab === WEDDING_TABS.DRAFT) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      {documentsDb ? (
        <WeddingDraftStudio
          db={documentsDb}
          onRowAdded={(row) => onRowAdded(documentsDb.notionId, row)}
        />
      ) : (
        <div style={{ border: `1px solid ${N_BORDER}`, borderRadius: "8px", background: "#fff9f8", padding: "16px", color: N_MUTED, fontSize: "13px" }}>
          Draft Letters needs the Documents database to be available.
        </div>
      )}
    </div>
  );

  if (activeTab === WEDDING_TABS.INVITATION) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <WeddingInvitationCanvas
        weddingCriteria={weddingCriteria}
        documentsDb={documentsDb}
        onDocumentSaved={(row) => { if (!documentsDb) return; onRowAdded(documentsDb.notionId, row); }}
      />
    </div>
  );

  if (activeTab === WEDDING_TABS.SPEECH) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <WeddingSpeechWriter
        weddingCriteria={weddingCriteria}
        onWeddingCriteriaUpdated={setWeddingCriteria}
        documentsDb={documentsDb}
        onDocumentSaved={(row) => { if (!documentsDb) return; onRowAdded(documentsDb.notionId, row); }}
        onDocumentDeleted={(pageId) => { if (!documentsDb) return; onRowDeleted(documentsDb.notionId, pageId); }}
      />
    </div>
  );

  if (activeTab === WEDDING_TABS.HONEYMOON) return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
      <WeddingHoneymoonPlanner
        honeymoonDb={honeymoonDb}
        onRowAdded={(row) => { if (!honeymoonDb) return; onRowAdded(honeymoonDb.notionId, row); }}
        onRowUpdated={(pageId, name, val) => { if (!honeymoonDb) return; onRowUpdated(honeymoonDb.notionId, pageId, name, val); }}
        onRowDeleted={(pageId) => { if (!honeymoonDb) return; onRowDeleted(honeymoonDb.notionId, pageId); }}
      />
    </div>
  );

  // Not a wedding virtual tab — stay mounted but render nothing
  return null;
}
