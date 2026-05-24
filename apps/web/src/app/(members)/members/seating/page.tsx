"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2, Download, Printer, ArrowLeft } from "lucide-react";
import type {
  WorkspaceDatabase,
  WorkspaceResponse,
} from "@/app/api/members/workspace/route";

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_BORDER_MED = "rgba(55,53,47,0.16)";
const N_BLUE = "rgb(35,131,226)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

type SeatingShape = "round" | "rectangle";

type TableColorScheme = "classic" | "sage" | "rose" | "ocean" | "sunset";

type TableTheme = {
  label: string;
  bg: string;
  border: string;
  text: string;
  mutedText: string;
  chipBg: string;
  chipText: string;
  chipBorder: string;
  selectedGlow: string;
};

const TABLE_THEMES: Record<TableColorScheme, TableTheme> = {
  classic: {
    label: "Classic",
    bg: "#ffffff",
    border: "#d6d3ce",
    text: "#37352f",
    mutedText: "#6b6862",
    chipBg: "#f3f4f6",
    chipText: "#4b5563",
    chipBorder: "#d1d5db",
    selectedGlow: "0 8px 24px rgba(107,114,128,0.2)",
  },
  sage: {
    label: "Sage",
    bg: "#f2f8f3",
    border: "#b7d9bf",
    text: "#214b2e",
    mutedText: "#4b7055",
    chipBg: "#ddf0e1",
    chipText: "#24573a",
    chipBorder: "#b7d9bf",
    selectedGlow: "0 8px 24px rgba(49,130,91,0.24)",
  },
  rose: {
    label: "Rose",
    bg: "#fff1f5",
    border: "#f9c5d5",
    text: "#7a2848",
    mutedText: "#9c4d68",
    chipBg: "#ffdce8",
    chipText: "#7a2848",
    chipBorder: "#f4b6cb",
    selectedGlow: "0 8px 24px rgba(190,24,93,0.22)",
  },
  ocean: {
    label: "Ocean",
    bg: "#edf7ff",
    border: "#b6dfff",
    text: "#1d4f73",
    mutedText: "#3a6f95",
    chipBg: "#d8edff",
    chipText: "#1f5f8f",
    chipBorder: "#b6dfff",
    selectedGlow: "0 8px 24px rgba(37,99,235,0.2)",
  },
  sunset: {
    label: "Sunset",
    bg: "#fff5e8",
    border: "#ffd2a8",
    text: "#7b3f00",
    mutedText: "#9a5c1a",
    chipBg: "#ffe3c2",
    chipText: "#8a4a00",
    chipBorder: "#ffd2a8",
    selectedGlow: "0 8px 24px rgba(194,120,3,0.24)",
  },
};

type SeatingGuest = {
  id: string;
  name: string;
};

type SeatingTable = {
  id: string;
  name: string;
  number: number;
  seats: number;
  shape: SeatingShape;
  colorScheme: TableColorScheme;
  x: number;
  y: number;
  guestIds: string[];
};

function findPropertyName(props: WorkspaceDatabase["properties"], candidates: string[]): string | null {
  const map = new Map(props.map((p) => [p.name.toLowerCase(), p.name]));
  for (const c of candidates) {
    const match = map.get(c.toLowerCase());
    if (match) return match;
  }
  return null;
}

function getGuestDisplayName(row: WorkspaceDatabase["rows"][number]): string {
  const candidates = ["Full Name", "Guest Name", "Name", "Title"];
  for (const key of candidates) {
    const val = row.properties[key];
    if (typeof val === "string" && val.trim().length > 0) return val.trim();
  }
  for (const val of Object.values(row.properties)) {
    if (typeof val === "string" && val.trim().length > 0) return val.trim();
  }
  return "Guest";
}

function normalizeTableLabel(table: SeatingTable): string {
  return table.name.trim().length > 0 ? table.name.trim() : `Table ${table.number}`;
}

function getTableTheme(scheme: string | undefined): TableTheme {
  if (scheme && scheme in TABLE_THEMES) {
    return TABLE_THEMES[scheme as TableColorScheme];
  }
  return TABLE_THEMES.classic;
}

export default function SeatingPlannerPage() {
  const ROOM_WIDTH = 1200;
  const ROOM_HEIGHT = 780;
  const GRID_SIZE = 24;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [backend, setBackend] = useState<"app" | "notion">("notion");
  const [guestsDb, setGuestsDb] = useState<WorkspaceDatabase | null>(null);

  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [snapToGrid, setSnapToGrid] = useState(true);

  const roomRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ tableId: string; offsetX: number; offsetY: number } | null>(null);

  const guests = useMemo<SeatingGuest[]>(() => {
    if (!guestsDb) return [];
    return guestsDb.rows.map((row) => ({ id: row.pageId, name: getGuestDisplayName(row) }));
  }, [guestsDb]);

  const storageKey = guestsDb ? `wedding.seating.${guestsDb.notionId}` : null;
  const tableFieldName = guestsDb
    ? findPropertyName(guestsDb.properties, ["Table", "Table Number", "Table Assignment"])
    : null;

  useEffect(() => {
    async function run() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/members/workspace");
        if (!res.ok) throw new Error("Failed to load workspace data");
        const data = (await res.json()) as WorkspaceResponse;
        setBackend(data.backend);

        const db = data.databases.find(
          (d) => d.nicheId === "wedding-planner" && d.dbId === "guests",
        );
        setGuestsDb(db ?? null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load seating planner");
      } finally {
        setLoading(false);
      }
    }

    void run();
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setTables([]);
        setSelectedTableId(null);
        setZoom(100);
        setSnapToGrid(true);
        return;
      }
      const parsed = JSON.parse(raw) as {
        tables?: SeatingTable[];
        zoom?: number;
        snapToGrid?: boolean;
      };
      const loaded = Array.isArray(parsed.tables) ? parsed.tables : [];

      const cleaned: SeatingTable[] = loaded.map((t): SeatingTable => ({
        id: t.id,
        name: t.name || `Table ${t.number}`,
        number: Number.isFinite(t.number) ? Math.max(1, Math.round(t.number)) : 1,
        seats: Number.isFinite(t.seats) ? Math.max(1, Math.round(t.seats)) : 8,
        shape: t.shape === "rectangle" ? "rectangle" : "round",
        colorScheme:
          t.colorScheme && t.colorScheme in TABLE_THEMES
            ? t.colorScheme
            : "classic",
        x: Number.isFinite(t.x) ? t.x : 20,
        y: Number.isFinite(t.y) ? t.y : 20,
        guestIds: Array.isArray(t.guestIds)
          ? t.guestIds.filter((id) => guests.some((g) => g.id === id))
          : [],
      }));

      setTables(cleaned);
      setSelectedTableId(cleaned[0]?.id ?? null);
      setZoom(
        typeof parsed.zoom === "number" && Number.isFinite(parsed.zoom)
          ? Math.min(180, Math.max(60, Math.round(parsed.zoom)))
          : 100,
      );
      setSnapToGrid(typeof parsed.snapToGrid === "boolean" ? parsed.snapToGrid : true);
    } catch {
      setTables([]);
      setSelectedTableId(null);
      setZoom(100);
      setSnapToGrid(true);
    }
  }, [storageKey, guests]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ tables, zoom, snapToGrid }),
      );
    } catch {
      // Ignore storage write errors.
    }
  }, [storageKey, tables, zoom, snapToGrid]);

  useEffect(() => {
    if (tables.length === 0) {
      if (selectedTableId !== null) setSelectedTableId(null);
      return;
    }
    if (selectedTableId !== null && tables.some((t) => t.id === selectedTableId)) return;
    setSelectedTableId(tables[0]!.id);
  }, [tables, selectedTableId]);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const room = roomRef.current;
      if (!room) return;
      const rect = room.getBoundingClientRect();
      const zoomScale = zoom / 100;
      const roomX = (event.clientX - rect.left) / zoomScale;
      const roomY = (event.clientY - rect.top) / zoomScale;

      setTables((prev) =>
        prev.map((table) => {
          if (table.id !== drag.tableId) return table;
          const width = table.shape === "rectangle" ? 320 : 170;
          const height = table.shape === "rectangle" ? 132 : 170;

          const rawX = Math.max(0, Math.min(ROOM_WIDTH - width, roomX - drag.offsetX));
          const rawY = Math.max(0, Math.min(ROOM_HEIGHT - height, roomY - drag.offsetY));

          const x = snapToGrid ? Math.round(rawX / GRID_SIZE) * GRID_SIZE : rawX;
          const y = snapToGrid ? Math.round(rawY / GRID_SIZE) * GRID_SIZE : rawY;

          return { ...table, x, y };
        }),
      );
    };

    const handleUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [zoom, snapToGrid]);

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;
  const zoomScale = zoom / 100;

  const guestById = useMemo(
    () => new Map(guests.map((g) => [g.id, g])),
    [guests],
  );

  const guestToTableId = useMemo(() => {
    const map = new Map<string, string>();
    for (const table of tables) {
      for (const guestId of table.guestIds) {
        map.set(guestId, table.id);
      }
    }
    return map;
  }, [tables]);

  const assignedGuestIds = new Set<string>(guestToTableId.keys());
  const unseatedGuests = guests.filter((guest) => !assignedGuestIds.has(guest.id));
  const overCapacityTables = tables.filter((table) => table.guestIds.length > table.seats);

  function createTable(shape: SeatingShape = "round") {
    setError(null);
    const usedNumbers = new Set(tables.map((t) => t.number));
    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) nextNumber++;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const table: SeatingTable = {
      id,
      number: nextNumber,
      name: shape === "rectangle" ? "Top Table" : `Table ${nextNumber}`,
      seats: shape === "rectangle" ? 10 : 8,
      shape,
      colorScheme: shape === "rectangle" ? "ocean" : "classic",
      x: shape === "rectangle" ? 420 : 32 + (tables.length % 5) * 140,
      y: shape === "rectangle" ? 24 : 80 + Math.floor(tables.length / 5) * 120,
      guestIds: [],
    };

    setTables((prev) => [...prev, table]);
    setSelectedTableId(id);
  }

  function updateTable(tableId: string, updater: (table: SeatingTable) => SeatingTable) {
    setTables((prev) => prev.map((table) => (table.id === tableId ? updater(table) : table)));
  }

  function deleteTable(tableId: string) {
    if (!confirm("Delete this table and unassign its guests?")) return;
    setTables((prev) => prev.filter((table) => table.id !== tableId));
  }

  function assignGuestToTable(guestId: string, targetTableId: string | null) {
    setTables((prev) =>
      prev.map((table) => {
        const hasGuest = table.guestIds.includes(guestId);
        if (targetTableId === table.id) {
          if (hasGuest) return table;
          return { ...table, guestIds: [...table.guestIds, guestId] };
        }
        if (hasGuest) return { ...table, guestIds: table.guestIds.filter((id) => id !== guestId) };
        return table;
      }),
    );
  }

  async function saveAssignmentsToGuestList() {
    setError(null);
    setSuccess(null);

    if (!guestsDb) {
      setError("Guest database is not loaded yet.");
      return;
    }
    if (!tableFieldName) {
      setError("Could not find a Table field in this Guest List database.");
      return;
    }

    setSaving(true);
    try {
      const assignmentByGuest = new Map<string, string>();
      for (const table of tables) {
        const label = normalizeTableLabel(table);
        for (const guestId of table.guestIds) assignmentByGuest.set(guestId, label);
      }

      for (const row of guestsDb.rows) {
        const nextVal = assignmentByGuest.get(row.pageId) ?? null;
        const currentVal = row.properties[tableFieldName];
        const currentText = typeof currentVal === "string" ? currentVal : null;
        if (currentText === nextVal) continue;

        const res = await fetch(`/api/members/workspace/${row.pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            properties: { [tableFieldName]: nextVal },
            propertyTypes: { [tableFieldName]: "rich_text" },
          }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Failed to save one or more guest assignments");
        }

        setGuestsDb((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            rows: prev.rows.map((r) =>
              r.pageId !== row.pageId
                ? r
                : { ...r, properties: { ...r.properties, [tableFieldName]: nextVal } },
            ),
          };
        });
      }

      setSuccess("Seating assignments saved to your Guest List.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save seating assignments");
    } finally {
      setSaving(false);
    }
  }

  function buildSvgMarkup(): string {
    const esc = (input: string) =>
      input
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

    const nodes = tables
      .map((table) => {
        const label = normalizeTableLabel(table);
        const theme = getTableTheme(table.colorScheme);
        const assignedNames = table.guestIds
          .map((id) => guestById.get(id)?.name)
          .filter((n): n is string => typeof n === "string");

        if (table.shape === "rectangle") {
          const chips = assignedNames
            .slice(0, 6)
            .map((name, idx) => {
              const x = 10 + idx * 50;
              return `
                <rect x="${x}" y="8" width="46" height="16" rx="8" fill="${theme.chipBg}" stroke="${theme.chipBorder}" />
                <text x="${x + 23}" y="19" text-anchor="middle" font-size="8" font-family="Arial, sans-serif" fill="${theme.chipText}">${esc(name).slice(0, 8)}</text>
              `;
            })
            .join("");
          return `
            <g transform="translate(${table.x},${table.y})">
              <rect x="0" y="0" width="320" height="132" rx="12" fill="${theme.bg}" stroke="${theme.border}" />
              ${chips}
              <text x="12" y="42" font-size="12" font-family="Arial, sans-serif" fill="${theme.text}" font-weight="700">#${table.number} ${esc(label)}</text>
              <text x="12" y="60" font-size="11" font-family="Arial, sans-serif" fill="${theme.mutedText}">${table.guestIds.length}/${table.seats} seated</text>
              <text x="12" y="77" font-size="10" font-family="Arial, sans-serif" fill="${theme.mutedText}">Head table layout (guests on one side)</text>
            </g>
          `;
        }

        const guestLines = assignedNames.slice(0, 4).map((name) => esc(name));
        return `
          <g transform="translate(${table.x},${table.y})">
            <circle cx="85" cy="85" r="80" fill="${theme.bg}" stroke="${theme.border}" />
            <text x="85" y="54" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" fill="${theme.text}" font-weight="700">#${table.number}</text>
            <text x="85" y="70" text-anchor="middle" font-size="11" font-family="Arial, sans-serif" fill="${theme.text}">${esc(label)}</text>
            <text x="85" y="85" text-anchor="middle" font-size="10" font-family="Arial, sans-serif" fill="${theme.mutedText}">${table.guestIds.length}/${table.seats}</text>
            ${guestLines
              .map((line, idx) => `<text x="85" y="${102 + idx * 11}" text-anchor="middle" font-size="9" font-family="Arial, sans-serif" fill="${theme.mutedText}">${line}</text>`)
              .join("")}
          </g>
        `;
      })
      .join("\n");

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${ROOM_WIDTH}" height="${ROOM_HEIGHT}" viewBox="0 0 ${ROOM_WIDTH} ${ROOM_HEIGHT}">
        <defs>
          <pattern id="grid" width="${GRID_SIZE}" height="${GRID_SIZE}" patternUnits="userSpaceOnUse">
            <path d="M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}" fill="none" stroke="#ece9e3" stroke-width="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="${ROOM_WIDTH}" height="${ROOM_HEIGHT}" fill="#faf9f7" />
        <rect x="0" y="0" width="${ROOM_WIDTH}" height="${ROOM_HEIGHT}" fill="url(#grid)" />
        <text x="16" y="24" font-size="14" font-family="Arial, sans-serif" fill="#37352f" font-weight="700">Wedding Seating Plan</text>
        <text x="16" y="42" font-size="11" font-family="Arial, sans-serif" fill="#6b6862">Tables: ${tables.length} Â· Guests seated: ${assignedGuestIds.size}/${guests.length}</text>
        ${nodes}
      </svg>
    `.trim();
  }

  async function exportAsPng() {
    if (tables.length === 0) {
      setError("Add at least one table before exporting.");
      return;
    }
    setError(null);
    try {
      const svgMarkup = buildSvgMarkup();
      const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const image = new Image();

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not render export image."));
        image.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = ROOM_WIDTH * 2;
      canvas.height = ROOM_HEIGHT * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is not available in this browser.");
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.drawImage(image, 0, 0, ROOM_WIDTH, ROOM_HEIGHT);

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `wedding-seating-plan-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export PNG.");
    }
  }

  function printAsPdf() {
    if (tables.length === 0) {
      setError("Add at least one table before printing.");
      return;
    }
    setError(null);
    const svgMarkup = buildSvgMarkup();
    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      setError("Popup blocked. Allow popups to print/export PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Wedding Seating Plan</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #fff; }
            .wrap { max-width: 1200px; margin: 0 auto; }
            svg { width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="wrap">${svgMarkup}</div>
          <script>
            window.onload = function () { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", color: N_MUTED, fontFamily: N_FONT }}>
        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
        Loading seating planner...
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: "30px", fontFamily: N_FONT }}>
        <p style={{ color: "rgb(220,38,38)", marginBottom: "10px" }}>{loadError}</p>
        <Link href="/members/workspace" style={{ color: N_BLUE, textDecoration: "none" }}>
          Back to workspace
        </Link>
      </div>
    );
  }

  if (backend !== "app") {
    return (
      <div style={{ padding: "30px", fontFamily: N_FONT }}>
        <h1 style={{ marginTop: 0, color: N_FG, fontSize: "22px" }}>Seating Planner</h1>
        <p style={{ color: N_MUTED, maxWidth: "640px" }}>
          This planner is currently available for the in-app wedding workspace only.
        </p>
        <Link href="/members/workspace" style={{ color: N_BLUE, textDecoration: "none" }}>
          Back to workspace
        </Link>
      </div>
    );
  }

  if (!guestsDb) {
    return (
      <div style={{ padding: "30px", fontFamily: N_FONT }}>
        <h1 style={{ marginTop: 0, color: N_FG, fontSize: "22px" }}>Seating Planner</h1>
        <p style={{ color: N_MUTED, maxWidth: "640px" }}>
          Could not find the wedding Guest List database yet. Deploy the wedding niche and open this page again.
        </p>
        <Link href="/members/workspace?nicheId=wedding-planner&dbId=guests" style={{ color: N_BLUE, textDecoration: "none" }}>
          Open guest list
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "18px 20px", fontFamily: N_FONT, background: "#fff9f8", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
        <div>
          <div style={{ marginBottom: "6px" }}>
            <Link
              href="/members/workspace?nicheId=wedding-planner&dbId=guests"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "12px",
                color: "#be185d",
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={12} />
              Back to Guest List
            </Link>
          </div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#6b2040", letterSpacing: "-0.5px" }}>🌸 Wedding Seating Planner</h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#9d174d" }}>
            Drag tables on the canvas and drag guests from the list into a table.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => createTable("rectangle")}
            style={{
              padding: "7px 10px",
              borderRadius: "4px",
              border: `1px solid ${N_BORDER_MED}`,
              background: "white",
              color: N_FG,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Top Table
          </button>
          <button
            type="button"
            onClick={() => createTable("round")}
            style={{
              padding: "7px 10px",
              borderRadius: "4px",
              border: `1px solid ${N_BORDER_MED}`,
              background: "white",
              color: N_FG,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
            Round Table
          </button>
          <button
            type="button"
            onClick={() => void exportAsPng()}
            style={{
              padding: "7px 10px",
              borderRadius: "4px",
              border: `1px solid ${N_BORDER_MED}`,
              background: "white",
              color: N_FG,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <Download size={12} /> Export PNG
          </button>
          <button
            type="button"
            onClick={printAsPdf}
            style={{
              padding: "7px 10px",
              borderRadius: "4px",
              border: `1px solid ${N_BORDER_MED}`,
              background: "white",
              color: N_FG,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <Printer size={12} /> Print / PDF
          </button>
          <button
            type="button"
            onClick={() => void saveAssignmentsToGuestList()}
            disabled={saving}
            style={{
              padding: "7px 12px",
              borderRadius: "4px",
              border: "none",
              background: saving ? "rgba(190,24,93,0.2)" : "linear-gradient(135deg, #6b2040, #be185d)",
              color: "white",
              fontSize: "12px",
              fontWeight: 600,
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Saving..." : "Save to Guest List"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: N_FG }}>
          Zoom
          <input
            type="range"
            min={60}
            max={180}
            step={5}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <span style={{ width: "42px", textAlign: "right", color: N_MUTED }}>{zoom}%</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: N_FG }}>
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={(e) => setSnapToGrid(e.target.checked)}
          />
          Snap to grid
        </label>
      </div>

      {(error || success) && (
        <div style={{ marginBottom: "10px" }}>
          {error && <p style={{ margin: 0, fontSize: "12px", color: "rgb(220,38,38)" }}>{error}</p>}
          {success && <p style={{ margin: 0, fontSize: "12px", color: "rgb(15,123,108)" }}>{success}</p>}
        </div>
      )}

      {(unseatedGuests.length > 0 || overCapacityTables.length > 0) && (
        <div
          style={{
            marginBottom: "10px",
            padding: "8px 10px",
            borderRadius: "6px",
            border: "1px solid rgba(245,158,11,0.35)",
            background: "rgba(245,158,11,0.08)",
          }}
        >
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#b45309" }}>
            Seating conflicts detected
          </p>
          {unseatedGuests.length > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#92400e" }}>
              {unseatedGuests.length} unseated guest{unseatedGuests.length !== 1 ? "s" : ""}: {unseatedGuests.slice(0, 8).map((g) => g.name).join(", ")}
              {unseatedGuests.length > 8 ? "..." : ""}
            </p>
          )}
          {overCapacityTables.length > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#92400e" }}>
              Over capacity: {overCapacityTables.map((t) => `${normalizeTableLabel(t)} (${t.guestIds.length}/${t.seats})`).join(", ")}
            </p>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
        <div
          style={{
            position: "relative",
            minHeight: "600px",
            border: `1px dashed ${N_BORDER_MED}`,
            borderRadius: "6px",
            background: "linear-gradient(180deg, #fffdf7 0%, #f7f3ea 100%)",
            overflow: "auto",
          }}
        >
          <div
            ref={roomRef}
            style={{
              position: "relative",
              width: `${ROOM_WIDTH}px`,
              height: `${ROOM_HEIGHT}px`,
              transform: `scale(${zoomScale})`,
              transformOrigin: "top left",
              backgroundImage: snapToGrid
                ? `linear-gradient(to right, rgba(55,53,47,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(55,53,47,0.06) 1px, transparent 1px)`
                : "none",
              backgroundSize: snapToGrid ? `${GRID_SIZE}px ${GRID_SIZE}px` : "auto",
            }}
          >
            {tables.length === 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: N_MUTED, fontSize: "13px" }}>
                No tables yet. Add a Top Table or Round Table to begin.
              </div>
            )}

            {tables.map((table) => {
              const assignedCount = table.guestIds.length;
              const selected = selectedTableId === table.id;
              const theme = getTableTheme(table.colorScheme);
              const width = table.shape === "rectangle" ? 320 : 170;
              const height = table.shape === "rectangle" ? 132 : 170;

              return (
                <div
                  key={table.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const guestId = e.dataTransfer.getData("text/guestId");
                    if (guestId) assignGuestToTable(guestId, table.id);
                  }}
                  onMouseDown={(e) => {
                    const target = e.target as HTMLElement;
                    const tag = target.tagName.toLowerCase();
                    if (["input", "button", "select", "textarea", "label"].includes(tag)) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const currentZoom = zoom / 100;
                    dragStateRef.current = {
                      tableId: table.id,
                      offsetX: (e.clientX - rect.left) / currentZoom,
                      offsetY: (e.clientY - rect.top) / currentZoom,
                    };
                  }}
                  onClick={() => setSelectedTableId(table.id)}
                  style={{
                    position: "absolute",
                    left: `${table.x}px`,
                    top: `${table.y}px`,
                    width: `${width}px`,
                    minHeight: `${height}px`,
                    padding: "8px",
                    borderRadius: table.shape === "round" ? "999px" : "12px",
                    border: `1px solid ${selected ? N_BLUE : theme.border}`,
                    background: theme.bg,
                    boxShadow: selected ? theme.selectedGlow : "0 4px 14px rgba(0,0,0,0.07)",
                    cursor: "grab",
                    userSelect: "none",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <strong style={{ fontSize: "12px", color: theme.text }}>#{table.number}</strong>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTable(table.id);
                      }}
                      style={{
                        border: "none",
                        background: "none",
                        color: theme.mutedText,
                        fontSize: "11px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                      title="Delete table"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>

                  {table.shape === "rectangle" && (
                    <div
                      style={{
                        borderBottom: `1px dashed ${N_BORDER}`,
                        paddingBottom: "6px",
                        marginBottom: "6px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                        minHeight: "26px",
                      }}
                    >
                      {table.guestIds.slice(0, 8).map((guestId) => {
                        const guest = guestById.get(guestId);
                        if (!guest) return null;
                        return (
                          <span
                            key={guestId}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              fontSize: "10px",
                              background: theme.chipBg,
                              color: theme.chipText,
                              border: `1px solid ${theme.chipBorder}`,
                              borderRadius: "999px",
                              padding: "2px 6px",
                            }}
                          >
                            {guest.name}
                          </span>
                        );
                      })}
                      {table.guestIds.length > 8 && (
                        <span style={{ fontSize: "10px", color: N_SUBTLE }}>
                          +{table.guestIds.length - 8} more
                        </span>
                      )}
                    </div>
                  )}

                  <input
                    value={table.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateTable(table.id, (t) => ({ ...t, name: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "4px 6px",
                      borderRadius: "4px",
                      border: `1px solid ${N_BORDER}`,
                      fontSize: "12px",
                      marginBottom: "6px",
                      boxSizing: "border-box",
                      fontFamily: N_FONT,
                    }}
                  />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "6px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "10px", color: N_SUBTLE }}>
                      Number
                      <input
                        type="number"
                        min={1}
                        value={table.number}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          updateTable(table.id, (t) => ({
                            ...t,
                            number: Number.isFinite(next) ? Math.max(1, Math.round(next)) : t.number,
                          }));
                        }}
                        style={{ border: `1px solid ${N_BORDER}`, borderRadius: "4px", padding: "3px 4px", fontSize: "12px", fontFamily: N_FONT }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "10px", color: N_SUBTLE }}>
                      Seats
                      <input
                        type="number"
                        min={1}
                        value={table.seats}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          updateTable(table.id, (t) => ({
                            ...t,
                            seats: Number.isFinite(next) ? Math.max(1, Math.round(next)) : t.seats,
                          }));
                        }}
                        style={{ border: `1px solid ${N_BORDER}`, borderRadius: "4px", padding: "3px 4px", fontSize: "12px", fontFamily: N_FONT }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "10px", color: N_SUBTLE }}>
                      Shape
                      <select
                        value={table.shape}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          updateTable(table.id, (t) => ({
                            ...t,
                            shape: e.target.value === "rectangle" ? "rectangle" : "round",
                          }))
                        }
                        style={{ border: `1px solid ${N_BORDER}`, borderRadius: "4px", padding: "3px 4px", fontSize: "12px", fontFamily: N_FONT }}
                      >
                        <option value="round">Round</option>
                        <option value="rectangle">Rectangle</option>
                      </select>
                    </label>
                  </div>

                  <label style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "10px", color: N_SUBTLE, marginBottom: "6px" }}>
                    Color
                    <select
                      value={table.colorScheme}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        updateTable(table.id, (t) => ({
                          ...t,
                          colorScheme:
                            e.target.value in TABLE_THEMES
                              ? (e.target.value as TableColorScheme)
                              : "classic",
                        }))
                      }
                      style={{ border: `1px solid ${N_BORDER}`, borderRadius: "4px", padding: "3px 4px", fontSize: "12px", fontFamily: N_FONT }}
                    >
                      {Object.entries(TABLE_THEMES).map(([key, cfg]) => (
                        <option key={key} value={key}>
                          {cfg.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div style={{ fontSize: "11px", color: theme.mutedText }}>
                    {assignedCount}/{table.seats} seated
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${N_BORDER}`,
            borderRadius: "6px",
            background: "white",
            padding: "10px",
            maxHeight: "600px",
            overflowY: "auto",
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Guest List (Drag to Table)
          </p>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const guestId = e.dataTransfer.getData("text/guestId");
              if (guestId) assignGuestToTable(guestId, null);
            }}
            style={{
              marginBottom: "10px",
              padding: "8px",
              borderRadius: "6px",
              border: `1px dashed ${N_BORDER_MED}`,
              background: "rgba(55,53,47,0.03)",
              fontSize: "12px",
              color: N_MUTED,
            }}
          >
            Drop here to unassign from any table.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {guests.map((guest) => {
              const ownerId = guestToTableId.get(guest.id);
              const owner = ownerId ? tables.find((t) => t.id === ownerId) : null;
              const assignedToSelected = selectedTable ? ownerId === selectedTable.id : false;

              return (
                <div
                  key={guest.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/guestId", guest.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDoubleClick={() => {
                    if (selectedTable) assignGuestToTable(guest.id, selectedTable.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: `1px solid ${assignedToSelected ? "rgba(35,131,226,0.35)" : N_BORDER}`,
                    background: assignedToSelected ? "rgba(35,131,226,0.08)" : "white",
                    cursor: "grab",
                  }}
                  title="Drag this guest onto a table"
                >
                  <span style={{ fontSize: "12px", color: N_FG, flex: 1 }}>{guest.name}</span>
                  {owner ? (
                    <span style={{ fontSize: "10px", color: N_SUBTLE }}>
                      @ {normalizeTableLabel(owner)}
                    </span>
                  ) : (
                    <span style={{ fontSize: "10px", color: "#b45309" }}>Unseated</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
