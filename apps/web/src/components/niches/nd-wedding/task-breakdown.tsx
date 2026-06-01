"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ENERGY_COLOR, type EnergyLevel } from "./utils";

interface MicroStep {
  step:           string;
  energyRequired: EnergyLevel;
  timeEstimate:   string;
  notes:          string;
}

interface BreakdownResult {
  steps:   MicroStep[];
  summary: string;
}

export function NDWTaskBreakdown({
  timelineDb,
  onRowAdded,
}: {
  timelineDb:  WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const [goal, setGoal]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<BreakdownResult | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [adding, setAdding]   = useState(false);
  const [addResult, setAddResult] = useState<string | null>(null);

  async function breakdown() {
    if (!goal.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAddResult(null);
    setChecked(new Set());
    try {
      const res = await fetch("/api/members/nd-breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as BreakdownResult;
      setResult(data);
      setChecked(new Set(data.steps.map((_, i) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  async function saveSelected() {
    if (!result || checked.size === 0 || !timelineDb) return;
    setAdding(true);
    setAddResult(null);
    let added = 0;
    try {
      for (const i of checked) {
        const step = result.steps[i];
        if (!step) continue;
        const properties: Record<string, string | number | boolean | null> = {
          "Task":            step.step,
          "Energy Required": step.energyRequired,
          "Status":          "To Do",
        };
        if (step.notes) properties["Notes"] = step.notes;
        const propertyTypes: Record<string, string> = {
          "Task":            "title",
          "Energy Required": "select",
          "Status":          "select",
          "Notes":           "rich_text",
        };
        const res = await fetch("/api/members/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseId: timelineDb.notionId, properties, propertyTypes }),
        });
        if (res.ok) {
          const data = await res.json() as { pageId?: string };
          if (data.pageId) {
            onRowAdded(timelineDb.notionId, { pageId: data.pageId, properties });
            added++;
          }
        }
      }
      setAddResult(`✓ Added ${added} task${added !== 1 ? "s" : ""} to your Planning Timeline`);
      setChecked(new Set());
    } catch {
      setAddResult("Something went wrong — please try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div style={{ maxWidth: "680px", fontFamily: N_FONT }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800, color: N_FG }}>Break It Down</h1>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          Got a wedding task that feels overwhelming? Break it into tiny, doable steps — each with an energy level so you can tackle them when you have capacity.
        </p>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Choose and book the wedding venue"
          rows={3}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            borderRadius: "10px",
            border: `1px solid ${N_BORDER}`,
            fontSize: "14px",
            color: N_FG,
            fontFamily: N_FONT,
            resize: "vertical",
            lineHeight: 1.7,
            outline: "none",
          }}
        />
      </div>

      <button
        onClick={() => void breakdown()}
        disabled={loading || !goal.trim()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "11px 26px",
          borderRadius: "6px",
          border: "none",
          background: loading || !goal.trim() ? "rgba(55,53,47,0.12)" : ACCENT,
          color: loading || !goal.trim() ? N_MUTED : "white",
          fontSize: "14px",
          fontWeight: 600,
          cursor: loading || !goal.trim() ? "default" : "pointer",
          fontFamily: N_FONT,
          marginBottom: "28px",
        }}
      >
        {loading
          ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Breaking it down…</>
          : "🔨 Break it down"}
      </button>

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: "6px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", fontSize: "13px", color: "#b91c1c", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {result && (
        <div>
          {result.summary && (
            <div style={{ marginBottom: "16px", padding: "12px 14px", borderRadius: "8px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}` }}>
              <p style={{ margin: 0, fontSize: "13px", color: N_FG, lineHeight: 1.6 }}>{result.summary}</p>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: N_FG }}>
              {result.steps.length} steps — {checked.size} selected
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setChecked(new Set(result.steps.map((_, i) => i)))} style={{ fontSize: "11px", color: ACCENT, background: "none", border: "none", cursor: "pointer", fontFamily: N_FONT }}>Select all</button>
              <button onClick={() => setChecked(new Set())} style={{ fontSize: "11px", color: N_SUBTLE, background: "none", border: "none", cursor: "pointer", fontFamily: N_FONT }}>Clear</button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
            {result.steps.map((step, i) => {
              const isChecked = checked.has(i);
              const cs = ENERGY_COLOR[step.energyRequired];
              return (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: `1px solid ${isChecked ? ACCENT_BORDER : N_BORDER}`,
                    background: isChecked ? ACCENT_LIGHT : "white",
                    cursor: "pointer",
                    fontFamily: N_FONT,
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "3px", flexShrink: 0, marginTop: "2px",
                    border: `2px solid ${isChecked ? ACCENT : N_BORDER}`,
                    background: isChecked ? ACCENT : "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isChecked && <span style={{ color: "white", fontSize: "10px", lineHeight: 1 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 3px", fontSize: "13px", fontWeight: isChecked ? 600 : 400, color: N_FG, lineHeight: 1.4 }}>{step.step}</p>
                    <p style={{ margin: 0, fontSize: "11px", color: N_MUTED }}>
                      {step.timeEstimate}
                      {step.notes ? ` · ${step.notes}` : ""}
                    </p>
                  </div>
                  <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: cs.bg, color: cs.text, border: `1px solid ${cs.border}`, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>
                    {step.energyRequired}
                  </span>
                </button>
              );
            })}
          </div>

          {addResult && (
            <div style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "6px", background: addResult.startsWith("✓") ? "rgba(5,150,105,0.07)" : "rgba(220,38,38,0.07)", border: `1px solid ${addResult.startsWith("✓") ? "rgba(5,150,105,0.2)" : "rgba(220,38,38,0.2)"}`, fontSize: "13px", color: addResult.startsWith("✓") ? "#065f46" : "#b91c1c" }}>
              {addResult}
            </div>
          )}

          {timelineDb ? (
            <button
              onClick={() => void saveSelected()}
              disabled={adding || checked.size === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 24px",
                borderRadius: "6px",
                border: "none",
                background: adding || checked.size === 0 ? "rgba(55,53,47,0.12)" : ACCENT,
                color: adding || checked.size === 0 ? N_MUTED : "white",
                fontSize: "14px",
                fontWeight: 600,
                cursor: adding || checked.size === 0 ? "default" : "pointer",
                fontFamily: N_FONT,
              }}
            >
              {adding
                ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
                : `Add ${checked.size} step${checked.size !== 1 ? "s" : ""} to Planning Timeline`}
            </button>
          ) : (
            <p style={{ fontSize: "12px", color: N_MUTED }}>Deploy the Planning Timeline database to save steps.</p>
          )}
        </div>
      )}
    </div>
  );
}
