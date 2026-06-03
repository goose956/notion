"use client";

import { useState } from "react";
import { Download, Sparkles, Camera, ChevronDown, ChevronUp, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { WORKFLOW_CATALOG } from "@/lib/workflow-catalog";

const PAGE_SIZE = 30;

// ─── Suggested colour palettes per niche ─────────────────────────────────────
const NICHE_PALETTES: Record<string, [string, string, string]> = {
  "wedding-planner":        ["#be185d", "#9d174d", "#f43f8e"],
  "rainbow":                ["#e11d7a", "#7c3aed", "#0891b2"],
  "project-manager":        ["#4f46e5", "#0284c7", "#059669"],
  "pinterest-poster":       ["#e11d48", "#db2777", "#9333ea"],
  "neurodivergent":         ["#0d9488", "#0891b2", "#7c3aed"],
  "side-hustle":            ["#ea580c", "#d97706", "#16a34a"],
  "neurodivergent-wedding": ["#7c3aed", "#be185d", "#0d9488"],
  "food-business":          ["#16a34a", "#0891b2", "#ca8a04"],
  "content-creator":        ["#0284c7", "#7c3aed", "#e11d48"],
  "etsy-shop":              ["#f59e0b", "#ea580c", "#16a34a"],
  "cake-business":          ["#db2777", "#9333ea", "#ea580c"],
  "str-guidebook":          ["#0891b2", "#0d9488", "#4f46e5"],
  "nail-tech":              ["#c026d3", "#db2777", "#7c3aed"],
};

const QUICK_SWATCHES = [
  "#e11d48", "#db2777", "#c026d3", "#9333ea", "#7c3aed",
  "#4f46e5", "#2563eb", "#0284c7", "#0891b2", "#0d9488",
  "#16a34a", "#ca8a04", "#ea580c", "#e83d00", "#f59e0b",
];

interface NicheExportData {
  id: string;
  name: string;
  tagline: string;
  short_description: string;
  feature_1: string;
  feature_2: string;
  feature_3: string;
  feature_4: string;
  feature_5: string;
  target_audience: string;
  seed_keywords: string;
  screenshot_1: string;
  screenshot_2: string;
  screenshot_3: string;
  accent_1: string;
  accent_2: string;
  accent_3: string;
}

function initData(): NicheExportData[] {
  return WORKFLOW_CATALOG.map((w) => {
    const palette = NICHE_PALETTES[w.id] ?? ["#4f46e5", "#0284c7", "#16a34a"];
    return {
      id: w.id,
      name: w.name,
      tagline: w.tagline,
      short_description: w.description,
      feature_1: "", feature_2: "", feature_3: "", feature_4: "", feature_5: "",
      target_audience: "",
      seed_keywords: "",
      screenshot_1: "", screenshot_2: "", screenshot_3: "",
      accent_1: palette[0],
      accent_2: palette[1],
      accent_3: palette[2],
    };
  });
}

function toCsv(rows: NicheExportData[]): string {
  const headers = [
    "app_name", "tagline", "short_description",
    "feature_1", "feature_2", "feature_3", "feature_4", "feature_5",
    "target_audience", "seed_keywords",
    "screenshot_1", "screenshot_2", "screenshot_3",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.name, r.tagline, r.short_description,
        r.feature_1, r.feature_2, r.feature_3, r.feature_4, r.feature_5,
        r.target_audience, r.seed_keywords,
        r.screenshot_1, r.screenshot_2, r.screenshot_3,
      ].map(escape).join(",")
    ),
  ].join("\n");
}

// ─── Colour picker ────────────────────────────────────────────────────────────
function ColourPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <label className="relative cursor-pointer">
          <span className="block w-8 h-8 rounded-md border-2 border-white/20 shadow-sm" style={{ background: value }} />
          <input type="color" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" value={value} onChange={(e) => onChange(e.target.value)} />
        </label>
        <input
          className="w-24 border rounded-md px-2 py-1 text-xs font-mono bg-background"
          value={value}
          onChange={(e) => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
        />
        <button type="button" onClick={() => setOpen((p) => !p)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
          Presets
        </button>
      </div>
      {open && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {QUICK_SWATCHES.map((c) => (
            <button key={c} type="button" title={c} onClick={() => { onChange(c); setOpen(false); }}
              className="w-6 h-6 rounded-md border-2 transition-transform hover:scale-110"
              style={{ background: c, borderColor: c === value ? "white" : "transparent" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {multiline ? (
        <textarea className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

// ─── Niche row ────────────────────────────────────────────────────────────────
function NicheRow({
  row, globalIndex, selected, onSelect, onChange,
}: {
  row: NicheExportData;
  globalIndex: number;
  selected: boolean;
  onSelect: (idx: number, checked: boolean) => void;
  onChange: (index: number, field: keyof NicheExportData, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [screenshotting, setScreenshotting] = useState(false);
  const [screenshotFolder, setScreenshotFolder] = useState("");

  async function handleParse() {
    setParsing(true);
    try {
      const res = await fetch("/api/admin/export/parse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: row.name, description: row.short_description }),
      });
      const data = await res.json();
      if (data.features) {
        onChange(globalIndex, "feature_1", data.features[0] ?? "");
        onChange(globalIndex, "feature_2", data.features[1] ?? "");
        onChange(globalIndex, "feature_3", data.features[2] ?? "");
        onChange(globalIndex, "feature_4", data.features[3] ?? "");
        onChange(globalIndex, "feature_5", data.features[4] ?? "");
      }
      if (data.target_audience) onChange(globalIndex, "target_audience", data.target_audience);
      if (data.seed_keywords) onChange(globalIndex, "seed_keywords", data.seed_keywords);
    } finally {
      setParsing(false);
    }
  }

  async function handleScreenshots() {
    if (!screenshotFolder.trim()) { alert("Enter a folder path first"); return; }
    setScreenshotting(true);
    try {
      const res = await fetch("/api/admin/export/screenshots", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicheId: row.id, folder: screenshotFolder, accents: [row.accent_1, row.accent_2, row.accent_3] }),
      });
      const data = await res.json();
      if (data.paths) {
        onChange(globalIndex, "screenshot_1", data.paths[0] ?? "");
        onChange(globalIndex, "screenshot_2", data.paths[1] ?? "");
        onChange(globalIndex, "screenshot_3", data.paths[2] ?? "");
      }
    } finally {
      setScreenshotting(false);
    }
  }

  const filled = row.feature_1 && row.feature_2 && row.feature_3 && row.target_audience && row.seed_keywords;

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${selected ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(globalIndex, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-muted accent-primary cursor-pointer"
        />

        {/* Expand toggle */}
        <button
          className="flex items-center gap-3 flex-1 text-left"
          onClick={() => setOpen((p) => !p)}
        >
          <span className="text-lg">{WORKFLOW_CATALOG[globalIndex]?.emoji}</span>
          <span className="flex items-center gap-1">
            {([row.accent_1, row.accent_2, row.accent_3] as const).map((c, i) => (
              <span key={i} className="w-3 h-3 rounded-full border border-white/10" style={{ background: c }} />
            ))}
          </span>
          <span className="font-medium flex-1">{row.name}</span>
          {filled ? (
            <span className="text-xs text-green-600 font-medium">Ready</span>
          ) : (
            <span className="text-xs text-muted-foreground">Incomplete</span>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="App name" value={row.name} onChange={(v) => onChange(globalIndex, "name", v)} />
            <Field label="Tagline" value={row.tagline} onChange={(v) => onChange(globalIndex, "tagline", v)} />
          </div>
          <Field label="Short description" value={row.short_description} onChange={(v) => onChange(globalIndex, "short_description", v)} multiline />

          <div className="flex items-center gap-3">
            <button onClick={handleParse} disabled={parsing}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
              {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Parse with AI
            </button>
            <span className="text-xs text-muted-foreground">Auto-fill features, audience and keywords</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <Field key={n} label={`Feature ${n}`}
                value={row[`feature_${n}` as keyof NicheExportData]}
                onChange={(v) => onChange(globalIndex, `feature_${n}` as keyof NicheExportData, v)} />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Target audience" value={row.target_audience} onChange={(v) => onChange(globalIndex, "target_audience", v)} />
            <Field label="Seed keywords (comma-separated)" value={row.seed_keywords} onChange={(v) => onChange(globalIndex, "seed_keywords", v)} />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Screenshot colours</p>
            <p className="text-xs text-muted-foreground">Each screenshot uses a different accent — keeps listing images visually varied.</p>
            <div className="grid grid-cols-3 gap-4">
              <ColourPicker label="Screenshot 1" value={row.accent_1} onChange={(v) => onChange(globalIndex, "accent_1", v)} />
              <ColourPicker label="Screenshot 2" value={row.accent_2} onChange={(v) => onChange(globalIndex, "accent_2", v)} />
              <ColourPicker label="Screenshot 3" value={row.accent_3} onChange={(v) => onChange(globalIndex, "accent_3", v)} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Screenshots</p>
            <div className="flex items-center gap-2">
              <input className="flex-1 border rounded-md px-3 py-1.5 text-sm bg-background"
                placeholder="Output folder path on server"
                value={screenshotFolder} onChange={(e) => setScreenshotFolder(e.target.value)} />
              <button onClick={handleScreenshots} disabled={screenshotting}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm hover:bg-muted disabled:opacity-60">
                {screenshotting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                Screenshot
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((n) => (
                <Field key={n} label={`Screenshot ${n} path`}
                  value={row[`screenshot_${n}` as keyof NicheExportData]}
                  onChange={(v) => onChange(globalIndex, `screenshot_${n}` as keyof NicheExportData, v)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ExportPage() {
  const [rows, setRows] = useState<NicheExportData[]>(initData);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(WORKFLOW_CATALOG.map((_, i) => i)));
  const [page, setPage] = useState(0);
  const [parsingAll, setParsingAll] = useState(false);

  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const selectedRows = rows.filter((_, i) => selected.has(i));
  const allOnPageSelected = pageRows.every((_, j) => selected.has(page * PAGE_SIZE + j));

  function handleSelect(idx: number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(idx); else next.delete(idx);
      return next;
    });
  }

  function toggleAll() {
    const pageIndices = pageRows.map((_, j) => page * PAGE_SIZE + j);
    if (allOnPageSelected) {
      setSelected((prev) => { const next = new Set(prev); pageIndices.forEach((i) => next.delete(i)); return next; });
    } else {
      setSelected((prev) => { const next = new Set(prev); pageIndices.forEach((i) => next.add(i)); return next; });
    }
  }

  function handleChange(index: number, field: keyof NicheExportData, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value } as NicheExportData;
      return next;
    });
  }

  function downloadCsv() {
    const csv = toCsv(selectedRows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "listing-factory-niches.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleParseAll() {
    setParsingAll(true);
    try {
      for (const i of Array.from(selected).sort((a, b) => a - b)) {
        const row = rows[i]!;
        const res = await fetch("/api/admin/export/parse", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: row.name, description: row.short_description }),
        });
        const data = await res.json();
        setRows((prev) => {
          const next = [...prev];
          const cur = next[i]!;
          next[i] = {
            ...cur,
            feature_1: data.features?.[0] ?? cur.feature_1,
            feature_2: data.features?.[1] ?? cur.feature_2,
            feature_3: data.features?.[2] ?? cur.feature_3,
            feature_4: data.features?.[3] ?? cur.feature_4,
            feature_5: data.features?.[4] ?? cur.feature_5,
            target_audience: data.target_audience ?? cur.target_audience,
            seed_keywords: data.seed_keywords ?? cur.seed_keywords,
          };
          return next;
        });
      }
    } finally {
      setParsingAll(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground bg-background/80 mb-2">
          <Download className="h-3.5 w-3.5 text-accent" />
          Listing Factory Export
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Export Niche Packs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select the niches to include, pick screenshot colours, AI-fill fields, then download the CSV.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={handleParseAll} disabled={parsingAll || selected.size === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
          {parsingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Parse Selected with AI
        </button>
        <button onClick={downloadCsv} disabled={selected.size === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted disabled:opacity-60">
          <Download className="h-4 w-4" />
          Download CSV
        </button>
        <span className="text-xs text-muted-foreground ml-auto">
          {selected.size} of {rows.length} selected
        </span>
      </div>

      {/* Select all on page */}
      <div className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll}
          className="h-4 w-4 rounded border-muted accent-primary cursor-pointer" />
        <span className="text-muted-foreground text-xs">
          {allOnPageSelected ? "Deselect" : "Select"} all on this page
        </span>
      </div>

      {/* Niche list */}
      <div className="space-y-2">
        {pageRows.map((row, j) => {
          const globalIndex = page * PAGE_SIZE + j;
          return (
            <NicheRow
              key={row.id}
              row={row}
              globalIndex={globalIndex}
              selected={selected.has(globalIndex)}
              onSelect={handleSelect}
              onChange={handleChange}
            />
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-muted disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-muted-foreground text-xs">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border hover:bg-muted disabled:opacity-40">
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bottom download */}
      {selected.size > 0 && (
        <div className="pt-2 border-t">
          <button onClick={downloadCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
            <Download className="h-4 w-4" />
            Download CSV ({selected.size} niche{selected.size !== 1 ? "s" : ""})
          </button>
        </div>
      )}
    </div>
  );
}
