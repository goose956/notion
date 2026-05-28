import { auth } from "@/auth";
import { getCustomerWorkflows } from "@niche-factory/db";
import { redirect } from "next/navigation";
import { WORKFLOW_CATALOG } from "@/lib/workflow-catalog";
import { AddWorkflowButton } from "./add-button";

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
    <div style={{ fontFamily: N_FONT, maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: N_FG, margin: 0 }}>
        Browse Workflows
      </h1>
      <p style={{ fontSize: 15, color: N_MUTED, marginTop: 6, marginBottom: 32 }}>
        Add workflow packs to your account. Each workflow uses your credits.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {WORKFLOW_CATALOG.map((workflow) => {
          const isActive = activeSet.has(workflow.id);
          return (
            <div
              key={workflow.id}
              style={{
                border: `1px solid ${N_BORDER}`,
                borderRadius: 12,
                padding: "24px 28px",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 24,
                background: isActive ? "rgba(15,123,108,0.04)" : "#fff",
              }}
            >
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ fontSize: 36, lineHeight: 1 }}>{workflow.emoji}</div>
                <div>
                  <div
                    style={{ fontSize: 17, fontWeight: 600, color: N_FG, marginBottom: 4 }}
                  >
                    {workflow.name}
                    {isActive && (
                      <span
                        style={{
                          marginLeft: 10,
                          fontSize: 12,
                          fontWeight: 500,
                          color: "rgb(15,123,108)",
                          background: "rgba(15,123,108,0.1)",
                          borderRadius: 4,
                          padding: "2px 8px",
                          verticalAlign: "middle",
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: N_MUTED, maxWidth: 460 }}>
                    {workflow.description}
                  </div>
                </div>
              </div>

              <div style={{ flexShrink: 0 }}>
                {isActive ? (
                  <div
                    style={{
                      fontFamily: N_FONT,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 20px",
                      borderRadius: 8,
                      background: "rgba(15,123,108,0.12)",
                      color: "rgb(15,123,108)",
                      fontSize: 14,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ✓ In your workspace
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
