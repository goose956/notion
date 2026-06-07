"use client";
import { useState, useEffect, useCallback, type ReactNode } from "react";
import { TEACHER_TABS } from "@/lib/niche-registry";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { TeacherDashboard } from "./dashboard";
import { TeacherYearPlanner } from "./year-planner";
import { TeacherLessonPlanner } from "./lesson-planner";
import { TeacherReportWriter } from "./report-writer";
import { TeacherAssessmentBuilder } from "./assessment-builder";
import { TeacherTasks } from "./tasks";
import { TeacherKeyDates } from "./key-dates";
import { DocumentsView } from "@/components/workspace/documents-view";
import { ClassSelectorBar, type TeacherClass } from "./class-selector";
import { N_BORDER_MED, N_FONT, N_MUTED } from "@/lib/workspace-tokens";
import { ACCENT_BORDER, ACCENT_LIGHT, ACCENT_TEXT } from "./utils";

const CLASSES_STORAGE_KEY = "teacher-classes";
const ACTIVE_CLASS_STORAGE_KEY = "teacher-active-class-id";

// Tabs where the class context is meaningfully shown
const CLASS_AWARE_TABS = new Set([
  TEACHER_TABS.LESSONS,
  TEACHER_TABS.REPORTS,
  TEACHER_TABS.ASSESSMENTS,
  TEACHER_TABS.YEAR_PLANNER,
]);

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
  const nicheId = "teacher";
  const [criteria, setCriteria] = useState<Record<string, unknown> | null>(apiCriteria);
  useEffect(() => { setCriteria(apiCriteria); }, [apiCriteria]);

  // ── Class registry (persisted in localStorage) ──────────────────────────────
  const [classes, setClasses] = useState<TeacherClass[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(CLASSES_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as TeacherClass[];
    } catch { /* */ }
    return [];
  });

  const [activeClassId, setActiveClassId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACTIVE_CLASS_STORAGE_KEY) ?? null;
  });

  function handleClassesChange(next: TeacherClass[]) {
    setClasses(next);
    try { localStorage.setItem(CLASSES_STORAGE_KEY, JSON.stringify(next)); } catch { /* */ }
  }

  function handleSelectClass(id: string) {
    setActiveClassId(id);
    try { localStorage.setItem(ACTIVE_CLASS_STORAGE_KEY, id); } catch { /* */ }
  }

  const activeClass = classes.find((c) => c.id === activeClassId) ?? null;

  // ── Build effective criteria: base criteria + active class overrides ─────────
  const effectiveCriteria = useCallback((): Record<string, unknown> | null => {
    if (!criteria && !activeClass) return null;
    const base = criteria ?? {};
    if (!activeClass) return base;
    return {
      ...base,
      // Active class overrides year-groups and subject for all tools
      "subject":     activeClass.subject     || base["subject"],
      "year-groups": activeClass.yearGroup   || base["year-groups"],
      // Pass through the active class itself so tools can use it directly
      "_activeClass": activeClass,
    };
  }, [criteria, activeClass]);

  // ── DB lookups ───────────────────────────────────────────────────────────────
  const documentsDb   = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents")    ?? null;
  const yearPlannerDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "year-planner") ?? null;
  const tasksDb       = databases.find((d) => d.nicheId === nicheId && d.dbId === "tasks")        ?? null;
  const keyDatesDb    = databases.find((d) => d.nicheId === nicheId && d.dbId === "key-dates")    ?? null;

  const ec = effectiveCriteria();

  const wrap = (children: ReactNode) => (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

      {/* Class context bar — shown on class-aware tabs */}
      {CLASS_AWARE_TABS.has(activeTab) && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "10px 24px", borderBottom: `1px solid ${N_BORDER_MED}`,
          background: "white", flexShrink: 0, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED, fontFamily: N_FONT }}>Class:</span>
          <ClassSelectorBar
            classes={classes}
            activeClassId={activeClassId}
            onSelect={handleSelectClass}
            onClassesChange={handleClassesChange}
          />
          {activeClass && (
            <span style={{
              fontSize: "11px", color: ACCENT_TEXT, fontFamily: N_FONT,
              padding: "3px 10px", borderRadius: "99px",
              background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`,
            }}>
              {[activeClass.yearGroup, activeClass.subject].filter(Boolean).join(" · ")}
            </span>
          )}
          {!activeClass && classes.length === 0 && (
            <span style={{ fontSize: "12px", color: N_MUTED, fontFamily: N_FONT }}>
              Add a class to auto-fill year group &amp; subject across all tools.
            </span>
          )}
        </div>
      )}

      <div style={{ padding: "16px 24px", flex: 1 }}>{children}</div>
    </div>
  );

  if (activeTab === TEACHER_TABS.DASHBOARD)    return wrap(<TeacherDashboard databases={databases} criteria={ec} classes={classes} activeClass={activeClass} />);
  if (activeTab === TEACHER_TABS.YEAR_PLANNER) return wrap(
    <TeacherYearPlanner
      db={yearPlannerDb}
      apiCriteria={ec}
      classes={classes}
      activeClass={activeClass}
      onRowAdded={(row) => onRowAdded(yearPlannerDb?.notionId ?? "", row)}
      onRowUpdated={(pageId, name, val) => onRowUpdated(yearPlannerDb?.notionId ?? "", pageId, name, val)}
    />
  );
  if (activeTab === TEACHER_TABS.LESSONS)     return wrap(<TeacherLessonPlanner criteria={ec} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === TEACHER_TABS.REPORTS)     return wrap(<TeacherReportWriter criteria={ec} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === TEACHER_TABS.ASSESSMENTS) return wrap(<TeacherAssessmentBuilder criteria={ec} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
  if (activeTab === TEACHER_TABS.TASKS) return wrap(
    <TeacherTasks
      db={tasksDb}
      onRowAdded={(row) => onRowAdded(tasksDb?.notionId ?? "", row)}
      onRowUpdated={(pageId, name, val) => onRowUpdated(tasksDb?.notionId ?? "", pageId, name, val)}
      onRowDeleted={(pageId) => onRowDeleted(tasksDb?.notionId ?? "", pageId)}
    />
  );
  if (activeTab === TEACHER_TABS.KEY_DATES) return wrap(
    <TeacherKeyDates
      db={keyDatesDb}
      onRowAdded={(row) => onRowAdded(keyDatesDb?.notionId ?? "", row)}
      onRowDeleted={(pageId) => onRowDeleted(keyDatesDb?.notionId ?? "", pageId)}
    />
  );
  if (activeTab === TEACHER_TABS.LIBRARY && documentsDb) return wrap(
    <DocumentsView
      db={documentsDb}
      onRowAdded={(row) => onRowAdded(documentsDb.notionId, row)}
      onRowUpdated={(pageId, name, val) => onRowUpdated(documentsDb.notionId, pageId, name, val)}
      onRowDeleted={(pageId) => onRowDeleted(documentsDb.notionId, pageId)}
    />
  );

  return null;
}
