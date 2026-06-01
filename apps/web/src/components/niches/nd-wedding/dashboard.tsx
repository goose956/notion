"use client";
import { useState, useEffect } from "react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";
import { asText, asNumber, ENERGY_LEVELS, ACCENT, ACCENT_LIGHT, ACCENT_BORDER, type EnergyLevel, parseWeddingDate, daysUntil } from "./utils";

const NDW_GRADIENT = "linear-gradient(135deg, #1e0938 0%, #3b0764 40%, #6d28d9 75%, #c4b5fd 100%)";
const NDW_SHADOW   = "rgba(109,40,217,0.30)";

export function NDWDashboard({
  databases,
  criteria,
  onCriteriaUpdated,
  nicheId = "neurodivergent-wedding",
}: {
  databases: WorkspaceDatabase[];
  criteria: Record<string, unknown> | null;
  onCriteriaUpdated: (c: Record<string, unknown>) => void;
  nicheId?: string;
}) {
  const coupleNames  = asText(criteria?.["couple-names"]) || "Your Wedding";
  const savedEnergy  = asText(criteria?.["today-energy"]) as EnergyLevel | "";
  const weddingDate  = parseWeddingDate(criteria?.["wedding-date"]);
  const totalBudget  = asNumber(criteria?.["total-budget"]);

  const [energy, setEnergy] = useState<EnergyLevel | "">(savedEnergy);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setEnergy(asText(criteria?.["today-energy"]) as EnergyLevel | "");
  }, [criteria]);

  const timelineDb = databases.find((d) => d.nicheId === nicheId && d.dbId === "timeline") ?? null;
  const budgetDb   = databases.find((d) => d.nicheId === nicheId && d.dbId === "budget")   ?? null;
  const guestsDb   = databases.find((d) => d.nicheId === nicheId && d.dbId === "guests")   ?? null;

  const openTasks = (timelineDb?.rows ?? []).filter(
    (r) => asText(r.properties["Status"]) !== "Done" && asText(r.properties["Status"]) !== "Dropped",
  );

  const matchingTasks = energy
    ? openTasks.filter((r) => asText(r.properties["Energy Required"]) === energy).slice(0, 3)
    : openTasks.filter((r) => asText(r.properties["Priority"]) === "Urgent").slice(0, 3);

  const totalSpent  = (budgetDb?.rows ?? []).reduce((sum, r) => sum + (asNumber(r.properties["Actual Cost"]) ?? 0), 0);
  const confirmedGuests = (guestsDb?.rows ?? []).filter((r) => asText(r.properties["RSVP"]) === "Confirmed").length;
  const totalGuests = guestsDb?.rows.length ?? 0;

  const days = weddingDate ? daysUntil(weddingDate) : null;

  async function saveCriteria(patch: Record<string, unknown>) {
    setSaving(true);
    setSaveError(null);
    try {
      const next = { ...(criteria ?? {}), ...patch };
      const res = await fetch(`/api/members/criteria/${nicheId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria: next }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const body = await res.json() as { criteria?: Record<string, unknown> };
      onCriteriaUpdated(body.criteria ?? next);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function selectEnergy(level: EnergyLevel) {
    setEnergy(level);
    await saveCriteria({ "today-energy": level });
  }

  const _ = saving; // suppress unused warning

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontFamily: N_FONT }}>

      {/* HERO */}
      <section style={{ borderRadius: "16px", background: NDW_GRADIENT, overflow: "hidden", boxShadow: `0 12px 40px ${NDW_SHADOW}, 0 2px 8px rgba(0,0,0,0.10)`, padding: "22px 26px 20px" }}>
        <p style={{ margin: "0 0 6px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
          💜 Neurodivergent Wedding Planner
        </p>
        <h2 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "white", textShadow: "0 1px 6px rgba(0,0,0,0.25)" }}>
          {coupleNames}
        </h2>

        {days !== null && (
          <p style={{ margin: "0 0 18px", fontSize: "13px", color: "rgba(255,255,255,0.70)" }}>
            {days > 0 ? `${days} days to go` : days === 0 ? "Today is the day! 🎉" : `${Math.abs(days)} days ago`}
            {weddingDate && ` · ${weddingDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`}
          </p>
        )}

        <div>
          <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            How&apos;s your energy right now?
          </p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {ENERGY_LEVELS.map((level) => {
              const isActive = energy === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => void selectEnergy(level)}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "999px",
                    border: isActive ? "2px solid rgba(255,255,255,0.9)" : "1px solid rgba(255,255,255,0.3)",
                    background: isActive ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: N_FONT,
                  }}
                >
                  {level}
                </button>
              );
            })}
          </div>
          {saveError && <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#ffb3b3" }}>{saveError}</p>}
        </div>
      </section>

      {/* STATS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
        <div style={{ borderRadius: "12px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, padding: "14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#6d28d9" }}>Open tasks</p>
          <p style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: N_FG }}>{openTasks.length}</p>
          {energy && <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>{matchingTasks.length} match your energy</p>}
        </div>

        {totalBudget !== null && (
          <div style={{ borderRadius: "12px", background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.18)", padding: "14px" }}>
            <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#065f46" }}>Budget spent</p>
            <p style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: N_FG }}>£{totalSpent.toLocaleString()}</p>
            <p style={{ margin: "3px 0 0", fontSize: "11px", color: N_MUTED }}>of £{totalBudget.toLocaleString()}</p>
          </div>
        )}

        {totalGuests > 0 && (
          <div style={{ borderRadius: "12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", padding: "14px" }}>
            <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: "#92400e" }}>Guests confirmed</p>
            <p style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: N_FG }}>{confirmedGuests}<span style={{ fontSize: "14px", fontWeight: 500, color: N_SUBTLE }}>/{totalGuests}</span></p>
          </div>
        )}
      </div>

      {/* TASKS MATCHED TO ENERGY */}
      <section style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${N_BORDER}` }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>
            {energy ? `Planning tasks at ${energy.split(" ")[0]} energy` : "Urgent planning tasks"}
          </p>
          {!energy && <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_MUTED }}>Set your energy above to see matched tasks</p>}
        </div>
        {matchingTasks.length === 0 ? (
          <div style={{ padding: "20px 16px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
              {energy ? "No tasks match this energy level." : "No urgent tasks. You can breathe."}
            </p>
          </div>
        ) : (
          <div>
            {matchingTasks.map((task, i) => {
              const name     = asText(task.properties["Task"]);
              const category = asText(task.properties["Category"]);
              const due      = asText(task.properties["Due Date"]);
              return (
                <div
                  key={task.pageId}
                  style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px 16px", borderBottom: i < matchingTasks.length - 1 ? `1px solid ${N_BORDER}` : "none" }}
                >
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${ACCENT_BORDER}`, background: "white", flexShrink: 0, marginTop: "1px" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: N_FG, lineHeight: 1.4 }}>{name || "Untitled"}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_SUBTLE }}>
                      {[category, due].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
