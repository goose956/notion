"use client";

import { useState } from "react";
import { Download, Sparkles, Camera, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { WORKFLOW_CATALOG } from "@/lib/workflow-catalog";

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
}

function initData(): NicheExportData[] {
  return WORKFLOW_CATALOG.map((w) => ({
    id: w.id,
    name: w.name,
    tagline: w.tagline,
    short_description: w.description,
    feature_1: "",
    feature_2: "",
    feature_3: "",
    feature_4: "",
    feature_5: "",
    target_audience: "",
    seed_keywords: "",
    screenshot_1: "",
    screenshot_2: "",
    screenshot_3: "",
  }));
}

function toCsv(rows: NicheExportData[]): string {
  const headers = [
    "app_name",
    "tagline",
    "short_description",
    "feature_1",
    "feature_2",
    "feature_3",
    "feature_4",
    "feature_5",
    "target_audience",
    "seed_keywords",
    "screenshot_1",
    "screenshot_2",
    "screenshot_3",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.name,
        r.tagline,
        r.short_description,
        r.feature_1,
        r.feature_2,
        r.feature_3,
        r.feature_4,
        r.feature_5,
        r.target_audience,
        r.seed_keywords,
        r.screenshot_1,
        r.screenshot_2,
        r.screenshot_3,
      ]
        .map(escape)
        .join(",")
    ),
  ];
  return lines.join("\n");
}

function NicheRow({
  row,
  index,
  onChange,
}: {
  row: NicheExportData;
  index: number;
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: row.name, description: row.short_description }),
      });
      const data = await res.json();
      if (data.features) {
        onChange(index, "feature_1", data.features[0] ?? "");
        onChange(index, "feature_2", data.features[1] ?? "");
        onChange(index, "feature_3", data.features[2] ?? "");
        onChange(index, "feature_4", data.features[3] ?? "");
        onChange(index, "feature_5", data.features[4] ?? "");
      }
      if (data.target_audience) onChange(index, "target_audience", data.target_audience);
      if (data.seed_keywords) onChange(index, "seed_keywords", data.seed_keywords);
    } finally {
      setParsing(false);
    }
  }

  async function handleScreenshots() {
    if (!screenshotFolder.trim()) {
      alert("Enter a folder path first");
      return;
    }
    setScreenshotting(true);
    try {
      const res = await fetch("/api/admin/export/screenshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicheId: row.id, folder: screenshotFolder }),
      });
      const data = await res.json();
      if (data.paths) {
        onChange(index, "screenshot_1", data.paths[0] ?? "");
        onChange(index, "screenshot_2", data.paths[1] ?? "");
        onChange(index, "screenshot_3", data.paths[2] ?? "");
      }
    } finally {
      setScreenshotting(false);
    }
  }

  const filled =
    row.feature_1 && row.feature_2 && row.feature_3 && row.target_audience && row.seed_keywords;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((p) => !p)}
      >
        <span className="text-lg">{WORKFLOW_CATALOG[index]?.emoji}</span>
        <span className="font-medium flex-1">{row.name}</span>
        {filled ? (
          <span className="text-xs text-green-600 font-medium">Ready</span>
        ) : (
          <span className="text-xs text-muted-foreground">Incomplete</span>
        )}
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field
              label="App name"
              value={row.name}
              onChange={(v) => onChange(index, "name", v)}
            />
            <Field
              label="Tagline"
              value={row.tagline}
              onChange={(v) => onChange(index, "tagline", v)}
            />
          </div>

          <Field
            label="Short description"
            value={row.short_description}
            onChange={(v) => onChange(index, "short_description", v)}
            multiline
          />

          <div className="flex items-center gap-3">
            <button
              onClick={handleParse}
              disabled={parsing}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
            >
              {parsing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Parse with AI
            </button>
            <span className="text-xs text-muted-foreground">
              Auto-fill features, audience and keywords from description
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <Field
                key={n}
                label={`Feature ${n}`}
                value={row[`feature_${n}` as keyof NicheExportData]}
                onChange={(v) => onChange(index, `feature_${n}` as keyof NicheExportData, v)}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field
              label="Target audience"
              value={row.target_audience}
              onChange={(v) => onChange(index, "target_audience", v)}
            />
            <Field
              label="Seed keywords (comma-separated)"
              value={row.seed_keywords}
              onChange={(v) => onChange(index, "seed_keywords", v)}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Screenshots</p>
            <div className="flex items-center gap-2">
              <input
                className="flex-1 border rounded-md px-3 py-1.5 text-sm bg-background"
                placeholder="Output folder path (e.g. C:\screenshots\nail-tech)"
                value={screenshotFolder}
                onChange={(e) => setScreenshotFolder(e.target.value)}
              />
              <button
                onClick={handleScreenshots}
                disabled={screenshotting}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm hover:bg-muted disabled:opacity-60"
              >
                {screenshotting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                Screenshot
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {([1, 2, 3] as const).map((n) => (
                <Field
                  key={n}
                  label={`Screenshot ${n} path`}
                  value={row[`screenshot_${n}` as keyof NicheExportData]}
                  onChange={(v) =>
                    onChange(index, `screenshot_${n}` as keyof NicheExportData, v)
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {multiline ? (
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

export default function ExportPage() {
  const [rows, setRows] = useState<NicheExportData[]>(initData);

  function handleChange(index: number, field: keyof NicheExportData, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value } as NicheExportData;
      return next;
    });
  }

  function downloadCsv() {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "listing-factory-niches.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function parseAll() {
    for (let i = 0; i < rows.length; i++) {
      const res = await fetch("/api/admin/export/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: rows[i].name, description: rows[i].short_description }),
      });
      const data = await res.json();
      setRows((prev) => {
        const next = [...prev];
        next[i] = {
          ...next[i],
          feature_1: data.features?.[0] ?? next[i].feature_1,
          feature_2: data.features?.[1] ?? next[i].feature_2,
          feature_3: data.features?.[2] ?? next[i].feature_3,
          feature_4: data.features?.[3] ?? next[i].feature_4,
          feature_5: data.features?.[4] ?? next[i].feature_5,
          target_audience: data.target_audience ?? next[i].target_audience,
          seed_keywords: data.seed_keywords ?? next[i].seed_keywords,
        };
        return next;
      });
    }
  }

  const [parsingAll, setParsingAll] = useState(false);

  async function handleParseAll() {
    setParsingAll(true);
    try {
      await parseAll();
    } finally {
      setParsingAll(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground bg-background/80 mb-2">
          <Download className="h-3.5 w-3.5 text-accent" />
          Listing Factory Export
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Export Niche Packs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate a CSV for the Listing Factory desktop app. Edit fields per niche, use AI to
          auto-fill features and keywords, take screenshots, then download.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleParseAll}
          disabled={parsingAll}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
        >
          {parsingAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Parse All with AI
        </button>
        <button
          onClick={downloadCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Download CSV
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <NicheRow key={row.id} row={row} index={i} onChange={handleChange} />
        ))}
      </div>

      <div className="pt-2">
        <button
          onClick={downloadCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Download CSV
        </button>
      </div>
    </div>
  );
}
