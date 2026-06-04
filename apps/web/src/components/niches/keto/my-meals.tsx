"use client";
import { useState } from "react";
import { N_FG, N_MUTED, N_BORDER, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, asText, asNumber } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const MEAL_TYPES = ["All", "Breakfast", "Lunch", "Dinner", "Snack", "Dessert"];
const MEAL_TYPE_COLORS: Record<string, string> = {
  Breakfast: "#d97706", Lunch: "#059669", Dinner: "#2563eb", Snack: "#f97316", Dessert: "#db2777",
};

function MealCard({ row }: { row: WorkspaceRow }) {
  const [open, setOpen] = useState(false);
  const name  = asText(row.properties["Title"])     || "Untitled";
  const type  = asText(row.properties["Type"])      || "";
  const cals  = asNumber(row.properties["Calories"]);
  const carbs = asNumber(row.properties["Net Carbs"]);
  const prot  = asNumber(row.properties["Protein"]);
  const fat   = asNumber(row.properties["Fat"]);
  const notes = asText(row.properties["Notes"])     || "";
  const ingr  = asText(row.properties["Ingredients"]) || "";
  const color = MEAL_TYPE_COLORS[type] ?? "#059669";

  return (
    <div style={{ borderRadius: "10px", border: `1px solid ${N_BORDER}`, background: "white", overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => setOpen((x) => !x)}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          {type && <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px", background: `${color}15`, color, border: `1px solid ${color}25` }}>{type}</span>}
          <span style={{ flex: 1, fontSize: "13px", fontWeight: 600, color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
          <span style={{ fontSize: "11px", color: N_MUTED, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[
            { l: "Cal",   v: cals  !== null ? `${cals} kcal` : null, bg: "#fef3c7", c: "#92400e" },
            { l: "Carbs", v: carbs !== null ? `${carbs}g`    : null, bg: "#dcfce7", c: "#14532d" },
            { l: "Prot",  v: prot  !== null ? `${prot}g`     : null, bg: "#dbeafe", c: "#1e3a8a" },
            { l: "Fat",   v: fat   !== null ? `${fat}g`      : null, bg: "#fce7f3", c: "#831843" },
          ].filter((x) => x.v !== null).map(({ l, v, bg, c }) => (
            <span key={l} style={{ background: bg, color: c, fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "6px" }}>{l} {v}</span>
          ))}
        </div>
      </div>
      {open && (ingr || notes) && (
        <div style={{ borderTop: `1px solid ${N_BORDER}`, padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {ingr && (
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ingredients</p>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "12px", color: N_FG, lineHeight: 1.7, fontFamily: "Georgia, serif" }}>{ingr}</pre>
            </div>
          )}
          {notes && (
            <div>
              <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700, color: N_MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>Analysis Notes</p>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "12px", color: N_FG, lineHeight: 1.7, fontFamily: "Georgia, serif" }}>{notes.slice(0, 600)}{notes.length > 600 ? "…" : ""}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DocRow({ row }: { row: WorkspaceRow }) {
  const [open, setOpen] = useState(false);
  const title   = asText(row.properties["Title"])   || "Untitled";
  const type    = asText(row.properties["Type"])    || "";
  const content = asText(row.properties["Content"]) || "";
  return (
    <div style={{ borderRadius: "10px", border: `1px solid ${N_BORDER}`, background: "white", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }} onClick={() => setOpen((x) => !x)}>
        {type && <span style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px", background: ACCENT_LIGHT, color: ACCENT_TEXT, border: `1px solid ${ACCENT_BORDER}` }}>{type}</span>}
        <span style={{ flex: 1, fontSize: "13px", fontWeight: 500, color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        <span style={{ fontSize: "11px", color: N_MUTED, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && content && (
        <div style={{ borderTop: `1px solid ${N_BORDER}`, padding: "12px 14px" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "12px", color: N_FG, lineHeight: 1.7, fontFamily: "Georgia, serif" }}>{content}</pre>
        </div>
      )}
    </div>
  );
}

export function KetoMyMeals({
  mealsDb,
  documentsDb,
}: {
  mealsDb:     WorkspaceDatabase | null;
  documentsDb: WorkspaceDatabase | null;
}) {
  const [filter, setFilter] = useState("All");

  const meals: WorkspaceRow[]     = mealsDb?.rows     ?? [];
  const documents: WorkspaceRow[] = documentsDb?.rows ?? [];

  const filtered = filter === "All" ? meals : meals.filter((r) => asText(r.properties["Type"]) === filter);

  function downloadMealBook() {
    if (meals.length === 0) return;
    const lines: string[] = ["KETO MEAL BOOK", "═".repeat(50), ""];

    const byType: Record<string, WorkspaceRow[]> = {};
    for (const row of meals) {
      const t = asText(row.properties["Type"]) || "Other";
      (byType[t] ??= []).push(row);
    }

    for (const [type, rows] of Object.entries(byType)) {
      lines.push(`── ${type.toUpperCase()} ──`, "");
      for (const row of rows) {
        const name  = asText(row.properties["Title"]) || "Untitled";
        const cals  = asNumber(row.properties["Calories"]);
        const carbs = asNumber(row.properties["Net Carbs"]);
        const prot  = asNumber(row.properties["Protein"]);
        const fat   = asNumber(row.properties["Fat"]);
        const ingr  = asText(row.properties["Ingredients"]);
        const notes = asText(row.properties["Notes"]);
        lines.push(`▸ ${name}`);
        const macros = [cals !== null ? `${cals} kcal` : null, carbs !== null ? `Net Carbs: ${carbs}g` : null, prot !== null ? `Protein: ${prot}g` : null, fat !== null ? `Fat: ${fat}g` : null].filter(Boolean);
        if (macros.length) lines.push(`  Macros: ${macros.join("  |  ")}`);
        if (ingr)  { lines.push("  Ingredients:", ...ingr.split("\n").map((l) => `    ${l}`)); }
        if (notes) { lines.push("  Notes:", ...notes.split("\n").slice(0, 8).map((l) => `    ${l}`)); }
        lines.push("");
      }
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "keto-meal-book.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function printMealBook() {
    if (meals.length === 0) return;
    const w = window.open("", "_blank");
    if (!w) return;

    const byType: Record<string, WorkspaceRow[]> = {};
    for (const row of meals) {
      const t = asText(row.properties["Type"]) || "Other";
      (byType[t] ??= []).push(row);
    }

    let body = "";
    for (const [type, rows] of Object.entries(byType)) {
      body += `<h2>${type}</h2>`;
      for (const row of rows) {
        const name  = asText(row.properties["Title"]) || "Untitled";
        const cals  = asNumber(row.properties["Calories"]);
        const carbs = asNumber(row.properties["Net Carbs"]);
        const prot  = asNumber(row.properties["Protein"]);
        const fat   = asNumber(row.properties["Fat"]);
        const ingr  = asText(row.properties["Ingredients"]);
        const notes = asText(row.properties["Notes"]);
        const macros = [cals !== null ? `${cals} kcal` : null, carbs !== null ? `Net Carbs: ${carbs}g` : null, prot !== null ? `Protein: ${prot}g` : null, fat !== null ? `Fat: ${fat}g` : null].filter(Boolean).join(" &nbsp;·&nbsp; ");
        body += `<div class="meal"><h3>${name}</h3>`;
        if (macros) body += `<p class="macros">${macros}</p>`;
        if (ingr)   body += `<p><strong>Ingredients:</strong></p><pre>${ingr.replace(/</g, "&lt;")}</pre>`;
        if (notes)  body += `<p><strong>Notes:</strong></p><pre>${notes.slice(0, 800).replace(/</g, "&lt;")}</pre>`;
        body += "</div>";
      }
    }

    w.document.write(`<html><head><title>My Keto Meal Book</title><style>
      body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 24px;color:#111;line-height:1.7;}
      h1{font-size:24px;color:#047857;}h2{font-size:16px;color:#059669;border-bottom:1px solid #d1fae5;padding-bottom:4px;margin-top:32px;}
      h3{font-size:14px;color:#065f46;margin:18px 0 4px;}.macros{font-size:12px;color:#6b7280;margin:0 0 6px;}
      pre{white-space:pre-wrap;font-family:inherit;font-size:13px;margin:4px 0 12px;}.meal{page-break-inside:avoid;}
    </style></head><body><h1>My Keto Meal Book</h1>${body}</body></html>`);
    w.document.close();
    w.print();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: N_FONT, maxWidth: "720px" }}>
      {/* Meals section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ margin: "0 0 2px", fontSize: "17px", fontWeight: 700, color: N_FG }}>My Meals</h2>
            <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>{meals.length} saved meal{meals.length !== 1 ? "s" : ""}</p>
          </div>
          {meals.length > 0 && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={downloadMealBook} style={{ padding: "7px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Download .txt</button>
              <button onClick={printMealBook}    style={{ padding: "7px 14px", borderRadius: "7px", border: "none", background: ACCENT, color: "white", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Print / PDF</button>
            </div>
          )}
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {MEAL_TYPES.map((t) => (
            <button key={t} onClick={() => setFilter(t)} style={{ padding: "4px 12px", borderRadius: "99px", border: `1px solid ${filter === t ? ACCENT : N_BORDER}`, background: filter === t ? ACCENT_LIGHT : "white", color: filter === t ? ACCENT_TEXT : N_MUTED, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>{t}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER}`, padding: "32px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
              {meals.length === 0
                ? "No meals saved yet. Use the Recipe Analyser and click \"Save to My Meals\"."
                : `No ${filter} meals saved yet.`}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.map((row) => <MealCard key={row.pageId} row={row} />)}
          </div>
        )}
      </div>

      {/* Documents section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div>
          <h2 style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: 700, color: N_FG }}>Documents</h2>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Meal plans, recipe analyses and macro targets.</p>
        </div>
        {documents.length === 0 ? (
          <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER}`, padding: "24px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Generate a meal plan or macro analysis and save it to see it here.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {documents.map((row) => <DocRow key={row.pageId} row={row} />)}
          </div>
        )}
      </div>
    </div>
  );
}
