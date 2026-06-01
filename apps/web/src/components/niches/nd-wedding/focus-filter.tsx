"use client";
import { useState } from "react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";
import { asText, ENERGY_LEVELS, ENERGY_COLOR, ACCENT, ACCENT_LIGHT, ACCENT_BORDER, type EnergyLevel } from "./utils";

const CATEGORIES = ["All", "Venue & Catering", "Guests", "Flowers & Decor", "Music & Entertainment", "Admin", "Personal", "Other"] as const;

export function NDWFocusFilter({
  timelineDb,
  criteria,
}: {
  timelineDb: WorkspaceDatabase | null;
  criteria:   Record<string, unknown> | null;
}) {
  const savedEnergy = asText(criteria?.["today-energy"]) as EnergyLevel | "";
  const [energy, setEnergy] = useState<EnergyLevel | "">(savedEnergy);
  const [category, setCategory] = useState<string>("All");

  const allRows = timelineDb?.rows ?? [];
  const openRows = allRows.filter(
    (r) => asText(r.properties["Status"]) !== "Done" && asText(r.properties["Status"]) !== "Dropped",
  );

  const filtered = openRows.filter((r) => {
    if (energy && asText(r.properties["Energy Required"]) !== energy) return false;
    if (category !== "All" && asText(r.properties["Category"]) !== category) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: "680px", fontFamily: N_FONT }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 800, color: N_FG }}>What can I do?</h1>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Filter your planning tasks by energy level to find what you can tackle right now.</p>
      </div>

      {/* Energy filter */}
      <div style={{ marginBottom: "16px" }}>
        <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: N_MUTED }}>
          Energy level
        </p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setEnergy("")}
            style={{
              padding: "7px 14px",
              borderRadius: "999px",
              border: `1px solid ${energy === "" ? ACCENT_BORDER : N_BORDER}`,
              background: energy === "" ? ACCENT_LIGHT : "white",
              color: energy === "" ? "#4c1d95" : N_SUBTLE,
              fontSize: "12px",
              fontWeight: energy === "" ? 700 : 400,
              cursor: "pointer",
              fontFamily: N_FONT,
            }}
          >
            Any
          </button>
          {ENERGY_LEVELS.map((level) => {
            const isActive = energy === level;
            const cs = ENERGY_COLOR[level];
            return (
              <button
                key={level}
                type="button"
                onClick={() => setEnergy(isActive ? "" : level)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "999px",
                  border: `1px solid ${isActive ? cs.activeBorder : cs.border}`,
                  background: isActive ? cs.activeBg : cs.bg,
                  color: cs.text,
                  fontSize: "12px",
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

      {/* Category filter */}
      <div style={{ marginBottom: "20px" }}>
        <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: N_MUTED }}>
          Category
        </p>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => {
            const isActive = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "999px",
                  border: `1px solid ${isActive ? ACCENT_BORDER : N_BORDER}`,
                  background: isActive ? ACCENT_LIGHT : "white",
                  color: isActive ? "#4c1d95" : N_SUBTLE,
                  fontSize: "12px",
                  fontWeight: isActive ? 700 : 400,
                  cursor: "pointer",
                  fontFamily: N_FONT,
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: N_FG }}>{filtered.length} task{filtered.length !== 1 ? "s" : ""}</p>
          {energy && <span style={{ fontSize: "11px", color: N_MUTED }}>Filtered to {energy}</span>}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
              {openRows.length === 0
                ? "No open planning tasks yet — add some to the Timeline database."
                : "No tasks match these filters. Try a different energy level or category."}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((row, i) => {
              const name     = asText(row.properties["Task"]);
              const cat      = asText(row.properties["Category"]);
              const due      = asText(row.properties["Due Date"]);
              const rowEnergy = asText(row.properties["Energy Required"]) as EnergyLevel | "";
              const energyCs = rowEnergy ? ENERGY_COLOR[rowEnergy] : null;
              return (
                <div
                  key={row.pageId}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "12px 16px",
                    borderBottom: i < filtered.length - 1 ? `1px solid ${N_BORDER}` : "none",
                  }}
                >
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${ACCENT_BORDER}`, background: "white", flexShrink: 0, marginTop: "1px" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: N_FG, lineHeight: 1.4 }}>{name || "Untitled"}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: N_SUBTLE }}>
                      {[cat, due].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {energyCs && (
                    <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: energyCs.bg, color: energyCs.text, border: `1px solid ${energyCs.border}`, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>
                      {rowEnergy}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
