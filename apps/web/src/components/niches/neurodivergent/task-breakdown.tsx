"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER } from "./utils";

interface MicroStep {
  step:            string;
  energyRequired:  "Low 🔋" | "Medium ⚡" | "High 🚀";
  timeEstimate:    string;
  notes:           string;
}

interface BreakdownResult {
  steps:   MicroStep[];
  summary: string;
}

const ENERGY_STYLE: Record<string, { bg: string; color: string }> = {
  "Low 🔋":    { bg: "rgba(5,150,105,0.09)",  color: "#065f46" },
  "Medium ⚡": { bg: "rgba(217,119,6,0.09)",  color: "#92400e" },
  "High 🚀":   { bg: "rgba(124,58,237,0.09)", color: "#4c1d95" },
};

function asText(v: unknown): string { return v == null ? "" : String(v); }

export function NDTaskBreakdown({
  tasksDb,
  onRowAdded,
}: {
  tasksDb:    WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const [goal, setGoal]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<BreakdownResult | null>(null);
  const [adding, setAdding]   = useState(false);
  const [addResult, setAddResult] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());

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

  async function addToTasks() {
    if (!result || !tasksDb || checked.size === 0) return;
    setAdding(true);
    setAddResult(null);
    let added = 0;
    try {
      for (const i of checked) {
        const s = result.steps[i];
        if (!s) continue;
        const res = await fetch("/api/members/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId: tasksDb.notionId,
            properties: {
              "Task":            s.step,
              "Energy Required": s.energyRequired,
              "Status":          "To Do",
              "Notes":           s.notes,
            },
            propertyTypes: {
              "Task": "title",
              "Energy Required": "select",
              "Status": "status",
              "Notes": "rich_text",
            },
          }),
        });
        if (res.ok) {
          const data = await res.json() as { pageId?: string };
          if (data.pageId) {
            onRowAdded(tasksDb.notionId, {
              pageId: data.pageId,
              properties: {
                "Task":            s.step,
                "Energy Required": s.energyRequired,
                "Status":          "To Do",
                "Notes":           s.notes,
              },
            });
            added++;
          }
        }
      }
      setAddResult(`✓ Added ${added} step${added !== 1 ? "s" : ""} to your Tasks`);
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
          Stuck on something? Describe it and the AI will chop it into small, manageable steps — each with an energy level so you know when to tackle it.
        </p>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: N_FG, marginBottom: "6px" }}>
          What&apos;s the thing that feels too big to start?
        </label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Sort out my finances and set up a budget&#10;e.g. Apply for a new job&#10;e.g. Clean and organise my room"
          rows={3}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 12px",
            borderRadius: "6px",
            border: `1px solid ${N_BORDER}`,
            fontSize: "13px",
            color: N_FG,
            fontFamily: N_FONT,
            resize: "vertical",
            lineHeight: 1.6,
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
            {result.steps.map((s, i) => {
              const isChecked = checked.has(i);
              const es = ENERGY_STYLE[s.energyRequired] ?? ENERGY_STYLE["Medium ⚡"]!;
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
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${isChecked ? ACCENT : N_BORDER}`, background: isChecked ? ACCENT : "white", flexShrink: 0, marginTop: "1px" }}>
                    {isChecked && <span style={{ color: "white", fontSize: "10px", lineHeight: 1 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 3px", fontSize: "13px", fontWeight: isChecked ? 600 : 400, color: N_FG, lineHeight: 1.4 }}>{s.step}</p>
                    {s.notes && <p style={{ margin: 0, fontSize: "11px", color: N_MUTED, lineHeight: 1.4 }}>{s.notes}</p>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end", flexShrink: 0 }}>
                    <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "99px", background: es.bg, color: es.color, fontWeight: 600 }}>{s.energyRequired}</span>
                    {s.timeEstimate && <span style={{ fontSize: "10px", color: N_SUBTLE }}>{s.timeEstimate}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {addResult && (
            <div style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "6px", background: addResult.startsWith("✓") ? "rgba(5,150,105,0.07)" : "rgba(220,38,38,0.07)", border: `1px solid ${addResult.startsWith("✓") ? "rgba(5,150,105,0.2)" : "rgba(220,38,38,0.2)"}`, fontSize: "13px", color: addResult.startsWith("✓") ? "#065f46" : "#b91c1c" }}>
              {addResult}
            </div>
          )}

          <button
            onClick={() => void addToTasks()}
            disabled={adding || checked.size === 0 || !tasksDb}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              borderRadius: "6px",
              border: "none",
              background: adding || checked.size === 0 || !tasksDb ? "rgba(55,53,47,0.12)" : ACCENT,
              color: adding || checked.size === 0 || !tasksDb ? N_MUTED : "white",
              fontSize: "14px",
              fontWeight: 600,
              cursor: adding || checked.size === 0 || !tasksDb ? "default" : "pointer",
              fontFamily: N_FONT,
            }}
          >
            {adding
              ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Adding…</>
              : `Add ${checked.size} step${checked.size !== 1 ? "s" : ""} to Tasks`}
          </button>
        </div>
      )}
    </div>
  );
}
