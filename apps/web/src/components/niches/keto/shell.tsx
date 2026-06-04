"use client";
import { KETO_TABS } from "@/lib/niche-registry";
import { KetoDashboard }        from "./dashboard";
import { KetoMealPlanner }      from "./meal-planner";
import { KetoRecipeAnalyser }   from "./recipe-analyser";
import { KetoMacroCalculator }  from "./macro-calculator";
import { KetoMyMeals }          from "./my-meals";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

export function KetoNicheShell({
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
  const mealsDb     = databases.find((d) => d.nicheId === "keto" && d.dbId === "meals")     ?? null;
  const documentsDb = databases.find((d) => d.nicheId === "keto" && d.dbId === "documents") ?? null;

  function wrap(node: React.ReactNode) {
    return <div style={{ padding: "24px" }}>{node}</div>;
  }

  switch (activeTab) {
    case KETO_TABS.DASHBOARD:
      return wrap(<KetoDashboard databases={databases} criteria={criteria} />);
    case KETO_TABS.PLANNER:
      return wrap(<KetoMealPlanner criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
    case KETO_TABS.ANALYSER:
      return wrap(<KetoRecipeAnalyser criteria={criteria} documentsDb={documentsDb} mealsDb={mealsDb} onRowAdded={onRowAdded} />);
    case KETO_TABS.MACROS:
      return wrap(<KetoMacroCalculator criteria={criteria} documentsDb={documentsDb} onRowAdded={onRowAdded} />);
    case KETO_TABS.MY_MEALS:
      return wrap(<KetoMyMeals mealsDb={mealsDb} documentsDb={documentsDb} />);
    default:
      return wrap(<KetoDashboard databases={databases} criteria={criteria} />);
  }
}
