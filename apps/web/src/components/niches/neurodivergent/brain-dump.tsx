"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER } from "./utils";

interface DumpItem {
  text: string;
  category: "Task" | "Habit" | "Idea" | "Feeling" | "Note";
  energyRequired?: "Low 🔋" | "Medium ⚡" | "High 🚀";
  context?: string;
}

interface DumpResult {
  items: DumpItem[];
  summary: string;
}

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  Task:    { bg: "rgba(59,130,246,0.09)",  color: "#1d4ed8" },
  Habit:   { bg: "rgba(5,150,105,0.09)",   color: "#065f46" },
  Idea:    { bg: "rgba(124,58,237,0.09)",  color: "#4c1d95" },
  Feeling: { bg: "rgba(236,72,153,0.09)",  color: "#9d174d" },
  Note:    { bg: "rgba(107,114,128,0.09)", color: "#374151" },
};

export function NDBrainDump({
  tasksDb,
  dumpDb,
  onRowAdded,
  nicheId = "neurodivergent",
}: {
  tasksDb:    WorkspaceDatabase | null;
  dumpDb:     WorkspaceDatabase | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
  nicheId?:   string;
}) {
  const [text, setText]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<DumpResult | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [adding, setAdding]   = useState(false);
  const [addResult, setAddResult] = useState<string | null>(null);

  async function sort() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setAddResult(null);
    setChecked(new Set());
    try {
      const res = await fetch("/api/members/nd-brain-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as DumpResult;
      setResult(data);
      setChecked(new Set(data.items.map((_, i) => i)));
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
    if (!result || checked.size === 0) return;
    setAdding(true);
    setAddResult(null);
    let added = 0;
    try {
      for (const i of checked) {
        const item = result.items[i];
        if (!item) continue;

        // Tasks go to the tasks DB; everything else goes to brain-dump DB
        const isTask = item.category === "Task" && tasksDb;
        const targetDb = isTask ? tasksDb : dumpDb;
        if (!targetDb) continue;

        const properties = isTask
          ? {
              "Task":             item.text,
              "Energy Required":  item.energyRequired ?? "Medium ⚡",
              "Context":          item.context ?? "Anywhere",
              "Status":           "To Do",
            }
          : {
              "Note":      item.text,
              "Category":  item.category,
              "Processed": false,
            };

        const propertyTypes = isTask
          ? { "Task": "title", "Energy Required": "select", "Context": "select", "Status": "status" }
          : { "Note": "title", "Category": "select", "Processed": "checkbox" };

        const res = await fetch("/api/members/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseId: targetDb.notionId, properties, propertyTypes }),
        });
        if (res.ok) {
          const data = await res.json() as { pageId?: string };
          if (data.pageId) {
            onRowAdded(targetDb.notionId, { pageId: data.pageId, properties });
            added++;
          }
        }
      }
      setAddResult(`✓ Saved ${added} item${added !== 1 ? "s" : ""} to Notion`);
      setChecked(new Set());
      if (added > 0) setText("");
    } catch {
      setAddResult("Something went wrong — please try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div style={{ maxWidth: "680px", fontFamily: N_FONT }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800, color: N_FG }}>Brain Dump</h1>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          Tip it all out. One thought per line or just one big splurge — the AI will sort it into tasks, habits, ideas, and notes.
        </p>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"call dentist\nbuy milk\ni want to learn guitar\nfeeling overwhelmed today\nidea: sell prints on etsy\nremind myself to drink water"}
          rows={8}
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
        onClick={() => void sort()}
        disabled={loading || !text.trim()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "11px 26px",
          borderRadius: "6px",
          border: "none",
          background: loading || !text.trim() ? "rgba(55,53,47,0.12)" : ACCENT,
          color: loading || !text.trim() ? N_MUTED : "white",
          fontSize: "14px",
          fontWeight: 600,
          cursor: loading || !text.trim() ? "default" : "pointer",
          fontFamily: N_FONT,
          marginBottom: "28px",
        }}
      >
        {loading
          ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Sorting it out…</>
          : "🌀 Sort it out"}
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
              {result.items.length} items — {checked.size} selected
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setChecked(new Set(result.items.map((_, i) => i)))} style={{ fontSize: "11px", color: ACCENT, background: "none", border: "none", cursor: "pointer", fontFamily: N_FONT }}>Select all</button>
              <button onClick={() => setChecked(new Set())} style={{ fontSize: "11px", color: N_SUBTLE, background: "none", border: "none", cursor: "pointer", fontFamily: N_FONT }}>Clear</button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
            {result.items.map((item, i) => {
              const isChecked = checked.has(i);
              const cs = CATEGORY_STYLE[item.category] ?? CATEGORY_STYLE["Note"]!;
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
                  <div style={{
                    width: "16px", height: "16px", borderRadius: "3px", flexShrink: 0, marginTop: "1px",
                    border: `2px solid ${isChecked ? ACCENT : N_BORDER}`,
                    background: isChecked ? ACCENT : "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isChecked && <span style={{ color: "white", fontSize: "10px", lineHeight: 1 }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 3px", fontSize: "13px", fontWeight: isChecked ? 600 : 400, color: N_FG, lineHeight: 1.4 }}>{item.text}</p>
                    {item.energyRequired && item.category === "Task" && (
                      <p style={{ margin: 0, fontSize: "11px", color: N_MUTED }}>Energy: {item.energyRequired}</p>
                    )}
                  </div>
                  <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "99px", background: cs.bg, color: cs.color, fontWeight: 600, flexShrink: 0 }}>
                    {item.category}
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
              : `Save ${checked.size} item${checked.size !== 1 ? "s" : ""} to Notion`}
          </button>
        </div>
      )}
    </div>
  );
}
