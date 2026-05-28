import { auth } from "@/auth";
import { getCustomerWorkflows } from "@niche-factory/db";
import { redirect } from "next/navigation";
import { WORKFLOW_CATALOG } from "@/lib/workflow-catalog";
import { AddWorkflowButton } from "./add-button";
import { RemoveWorkflowButton } from "./remove-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Browse Workflows — Niche Factory" };

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

export default async function WorkflowsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login" as never);

  const activeWorkflows = await getCustomerWorkflows(session.user.email);
  const activeSet = new Set(activeWorkflows);

  return (
    <div style={{ fontFamily: N_FONT, padding: "32px 28px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: N_FG, margin: 0 }}>
        Browse Workflows
      </h1>
      <p style={{ fontSize: 13, color: N_MUTED, marginTop: 4, marginBottom: 24 }}>
        Add workflow packs to your account. Each workflow uses your credits.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {WORKFLOW_CATALOG.map((workflow) => {
          const isActive = activeSet.has(workflow.id);
          return (
            <div
              key={workflow.id}
              style={{
                border: `1px solid ${isActive ? "rgba(15,123,108,0.25)" : N_BORDER}`,
                borderRadius: 10,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: isActive ? "rgba(15,123,108,0.04)" : "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 24, lineHeight: 1 }}>{workflow.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: N_FG, flex: 1 }}>
                  {workflow.name}
                </span>
              </div>
              <p style={{ fontSize: 12, color: N_MUTED, margin: 0, lineHeight: 1.5 }}>
                {workflow.tagline}
              </p>
              <div style={{ marginTop: "auto", paddingTop: 4 }}>
                {isActive ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div
                      style={{
                        fontFamily: N_FONT,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "6px 12px",
                        borderRadius: 6,
                        background: "rgba(15,123,108,0.1)",
                        color: "rgb(15,123,108)",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      ✓ Active
                    </div>
                    <RemoveWorkflowButton slug={workflow.id} />
                  </div>
                ) : (
                  <AddWorkflowButton slug={workflow.id} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
