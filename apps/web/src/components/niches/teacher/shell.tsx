"use client";
import { useState, useEffect } from "react";
import { TEACHER_TABS } from "@/lib/niche-registry";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { TeacherDashboard } from "./dashboard";
import { TeacherLessonPlanner } from "./lesson-planner";
import { TeacherReportWriter } from "./report-writer";
import { TeacherAssessmentBuilder } from "./assessment-builder";
import { TeacherLibrary } from "./library";

export function TeacherNicheShell({
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
  const nicheId = "teacher";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);
  useEffect(() => { setCriteria(apiCriteria); }, [apiCriteria]);

  const documentsDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents") ?? null;

  const wrap = (children: React.ReactNode) => (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>{children}</div>
  );

  if (activeTab === TEACHER_TABS.DASHBOARD)   return wrap(<TeacherDashboard databases={databases} criteria={criteria} />);
  if (activeTab === TEACHER_TABS.LESSONS)     return wrap(<TeacherLessonPlanner criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === TEACHER_TABS.REPORTS)     return wrap(<TeacherReportWriter criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === TEACHER_TABS.ASSESSMENTS) return wrap(<TeacherAssessmentBuilder criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === TEACHER_TABS.LIBRARY)     return wrap(<TeacherLibrary databases={databases} />);

  return null;
}
