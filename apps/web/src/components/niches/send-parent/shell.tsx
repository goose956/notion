"use client";
import { SEND_TABS } from "@/lib/niche-registry";
import { SENDDashboard }          from "./dashboard";
import { SENDAppointmentManager } from "./appointment-manager";
import { SENDBehaviourLog }       from "./behaviour-log";
import { SENDEHCPBuilder }        from "./ehcp-builder";
import { SENDLetterWriter }       from "./letter-writer";
import { SENDDocuments }          from "./documents";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

export function SENDParentShell({
  activeTab,
  databases,
  criteria,
  onRowAdded,
}: {
  activeTab:  string;
  databases:  WorkspaceDatabase[];
  criteria:   Record<string, unknown> | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const appointmentsDb = databases.find(d => d.nicheId === "send-parent" && d.dbId === "appointments") ?? null;
  const behaviourDb    = databases.find(d => d.nicheId === "send-parent" && d.dbId === "behaviour-log") ?? null;
  const documentsDb    = databases.find(d => d.nicheId === "send-parent" && d.dbId === "documents") ?? null;

  switch (activeTab) {
    case SEND_TABS.DASHBOARD:
      return <SENDDashboard databases={databases} criteria={criteria} />;
    case SEND_TABS.APPOINTMENTS:
      return <SENDAppointmentManager criteria={criteria} appointmentsDb={appointmentsDb} documentsDb={documentsDb} onRowAdded={onRowAdded} />;
    case SEND_TABS.BEHAVIOUR:
      return <SENDBehaviourLog criteria={criteria} behaviourDb={behaviourDb} documentsDb={documentsDb} onRowAdded={onRowAdded} />;
    case SEND_TABS.EHCP:
      return <SENDEHCPBuilder criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />;
    case SEND_TABS.LETTERS:
      return <SENDLetterWriter criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />;
    case SEND_TABS.DOCUMENTS:
      return <SENDDocuments documentsDb={documentsDb} />;
    default:
      // Not a SEND tab — stay mounted but render nothing
      return null;
  }
}
