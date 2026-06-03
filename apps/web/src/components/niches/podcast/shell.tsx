"use client";
import { useState, useEffect, type ReactNode } from "react";
import { PODCAST_TABS } from "@/lib/niche-registry";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { PodcastDashboard }          from "./dashboard";
import { PodcastEpisodePlanner }     from "./episode-planner";
import { PodcastShowNotes }          from "./show-notes";
import { PodcastGuestOutreach }      from "./guest-outreach";
import { PodcastTranscriptSummary }  from "./transcript-summary";
import { PodcastLibrary }            from "./library";

export function PodcastNicheShell({
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
  const nicheId = "podcast";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);
  useEffect(() => { setCriteria(apiCriteria); }, [apiCriteria]);

  const documentsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents") ?? null;

  const wrap = (children: ReactNode) => (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>{children}</div>
  );

  if (activeTab === PODCAST_TABS.DASHBOARD)   return wrap(<PodcastDashboard databases={databases} criteria={criteria} />);
  if (activeTab === PODCAST_TABS.EPISODE)     return wrap(<PodcastEpisodePlanner criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === PODCAST_TABS.SHOW_NOTES)  return wrap(<PodcastShowNotes criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === PODCAST_TABS.OUTREACH)    return wrap(<PodcastGuestOutreach criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === PODCAST_TABS.TRANSCRIPT)  return wrap(<PodcastTranscriptSummary criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === PODCAST_TABS.LIBRARY)     return wrap(<PodcastLibrary databases={databases} />);

  return null;
}
