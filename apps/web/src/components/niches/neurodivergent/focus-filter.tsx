"use client";
import { useState, useMemo } from "react";
import { Loader2, Zap } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";
import { asText, ENERGY_LEVELS, ENERGY_COLOR, ACCENT, ACCENT_LIGHT, ACCENT_BORDER, type EnergyLevel } from "./utils";

const CONTEXTS = ["Anywhere", "At desk", "Home", "Quick win", "Out & about", "Phone only"] as const;
type Context = (typeof CONTEXTS)[number];

interface FocusPickResult {
  topPick: string;
  reason: string;
  tip: string;
}

export function NDFocusFilter({
  tasksDb,
  criteria,
}: {
  tasksDb:  WorkspaceDatabase | null;
  criteria: Record<string, unknown> | null;
}) {
  const savedEnergy = asText(criteria?.["today-energy"]) as EnergyLevel | "";
  const [energy, setEnergy]   = useState<EnergyLevel | "">(savedEnergy);
  const [context, setContext] = useState<Context | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [pick, setPick]       = useState<FocusPickResult | null>(null);

  const allTasks = tasksDb?.rows ?? [];
  const openTasks = allTasks.filter(
    (r) => asText(r.properties["Status"]) !== "Done" && asText(r.properties["Status"]) !== "Dropped",
  );

  const filtered = useMemo(() => {
    return openTasks.filter((r) => {
      const taskEnergy  = asText(r.properties["Energy Required"]);
      const taskContext = asText(r.properties["Context"]);
      const energyOk  = !energy  || taskEnergy === energy  || taskEnergy === "";
      const contextOk = !context || taskContext === context || taskContext === "Anywhere" || taskContext === "";
      return energyOk && contextOk;
    });
  }, [openTasks, energy, context]);

  async function getAIPick() {
    if (filtered.length === 0) return;
    setLoading(true);
    setError(null);
    setPick(null);
    try {
      const res = await fetch("/api/members/nd-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          energy,
          context,
          tasks: filtered.map((r) => ({
            task:     asText(r.properties["Task"]),
            priority: asText(r.properties["Priority"]),
            project:  asText(r.properties["Project"]),
            context:  asText(r.properties["Context"]),
            energy:   asText(r.properties["Energy Required"]),
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as FocusPickResult;
      setPick(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "680px", fontFamily: N_FONT }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800, color: N_FG }}>What can I do right now?</h1>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          Filter your tasks by how you feel and where you are. No decisions required.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>

        {/* Energy */}
        <div>
          <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: N_FG, textTransform: "uppercase", letterSpacing: "0.08em" }}>My energy</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {ENERGY_LEVELS.map((level) => {
              const isActive = energy === level;
              const cs = ENERGY_COLOR[level];
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEnergy(isActive ? "" : level)}
                  style={{
                    padding: "7px 16px",
                    borderRadius: "999px",
                    border: `${isActive ? "2px" : "1px"} solid ${isActive ? cs.activeBorder : cs.border}`,
                    background: isActive ? cs.activeBg : cs.bg,
                    color: cs.text,
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
        </div>

        {/* Context */}
        <div>
          <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: N_FG, textTransform: "uppercase", letterSpacing: "0.08em" }}>Where I am</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {CONTEXTS.map((ctx) => {
              const isActive = context === ctx;
              return (
                <button
                  key={ctx}
                  type="button"
                  onClick={() => setContext(isActive ? "" : ctx)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",
                    border: `${isActive ? "2px" : "1px"} solid ${isActive ? ACCENT : "rgba(55,53,47,0.18)"}`,
                    background: isActive ? ACCENT_LIGHT : "rgba(55,53,47,0.03)",
                    color: isActive ? "#0f766e" : N_FG,
                    fontSize: "12px",
                    fontWeight: isActive ? 700 : 400,
                    cursor: "pointer",
                    fontFamily: N_FONT,
                  }}
                >
                  {ctx}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: N_FG }}>
          {filtered.length} task{filtered.length !== 1 ? "s" : ""} available
        </p>
        <button
          onClick={() => void getAIPick()}
          disabled={loading || filtered.length === 0}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 16px",
            borderRadius: "6px",
            border: "none",
            background: loading || filtered.length === 0 ? "rgba(55,53,47,0.10)" : ACCENT,
            color: loading || filtered.length === 0 ? N_MUTED : "white",
            fontSize: "12px",
            fontWeight: 600,
            cursor: loading || filtered.length === 0 ? "default" : "pointer",
            fontFamily: N_FONT,
          }}
        >
          {loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={13} />}
          AI pick
        </button>
      </div>

      {/* AI pick result */}
      {error && (
        <div style={{ padding: "12px 14px", borderRadius: "6px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", fontSize: "13px", color: "#b91c1c", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {pick && (
        <div style={{ borderRadius: "12px", background: `linear-gradient(135deg, #0a2e2c 0%, #0f766e 100%)`, padding: "18px 20px", marginBottom: "16px", boxShadow: "0 6px 20px rgba(13,148,136,0.2)" }}>
          <p style={{ margin: "0 0 5px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>⚡ Start here</p>
          <p style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 800, color: "white", lineHeight: 1.3 }}>{pick.topPick}</p>
          <p style={{ margin: "0 0 10px", fontSize: "12px", color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{pick.reason}</p>
          {pick.tip && (
            <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.55)", fontStyle: "italic" }}>{pick.tip}</p>
          )}
        </div>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <div style={{ padding: "28px 16px", textAlign: "center", borderRadius: "10px", border: `1px solid ${N_BORDER}`, background: "white" }}>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
            {openTasks.length === 0
              ? "No open tasks yet — add some to the Tasks database."
              : "No tasks match these filters. Try a different energy level or context."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {filtered.map((task) => {
            const name     = asText(task.properties["Task"]);
            const project  = asText(task.properties["Project"]);
            const energy   = asText(task.properties["Energy Required"]);
            const ctx      = asText(task.properties["Context"]);
            const priority = asText(task.properties["Priority"]);
            const isPicked = pick?.topPick === name;
            return (
              <div
                key={task.pageId}
                style={{
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${isPicked ? ACCENT : N_BORDER_MED}`,
                  background: isPicked ? ACCENT_LIGHT : "white",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: "0 0 3px", fontSize: "13px", fontWeight: isPicked ? 700 : 500, color: N_FG, lineHeight: 1.4 }}>
                    {isPicked && "⚡ "}{name || "Untitled"}
                  </p>
                  {project && <p style={{ margin: 0, fontSize: "11px", color: N_SUBTLE }}>{project}</p>}
                </div>
                <div style={{ display: "flex", gap: "5px", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {energy && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "99px", background: "rgba(55,53,47,0.06)", color: N_SUBTLE }}>{energy}</span>}
                  {ctx && ctx !== "Anywhere" && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "99px", background: "rgba(55,53,47,0.06)", color: N_SUBTLE }}>{ctx}</span>}
                  {priority === "Must do" && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "99px", background: "rgba(239,68,68,0.08)", color: "#dc2626", fontWeight: 600 }}>Must do</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
