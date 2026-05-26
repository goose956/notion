"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Download, Printer, ArrowLeft } from "lucide-react";
import type { WorkspaceDatabase } from "@/app/api/members/workspace/route";

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_BORDER_MED = "rgba(55,53,47,0.16)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

type SeatingShape = "round" | "rectangle" | "square" | "rect-around";
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

type SeatingGuest = { id: string; name: string };

type SeatingTable = {
  id: string;
  name: string;
  number: number;
  seats: number;
  shape: SeatingShape;
  colorScheme: TableColorScheme;
  x: number;
  y: number;
  guestIds: Array<string | null>;
  saved: boolean;
};

type PersistedSeatingLayout = {
  dbNotionId: string;
  updatedAt: number;
  tables: SeatingTable[];
  zoom: number;
  snapToGrid: boolean;
};

function getTableDimensions(table: SeatingTable): { width: number; height: number } {
  if (table.shape === "rectangle") return { width: 420, height: 112 };
  if (table.shape === "square") return { width: 180, height: 180 };
  if (table.shape === "rect-around") return { width: 360, height: 170 };
  return { width: 170, height: 170 };
}

function getSeatPosition(table: SeatingTable, seatIndex: number): { x: number; y: number } {
  const { width, height } = getTableDimensions(table);
  const seatCount = Math.max(1, table.seats);

  if (table.shape === "rectangle") {
    // Top Table: seats only along the top edge
    const x = 8 + ((width - 16) * (seatIndex + 0.5)) / seatCount;
    return { x, y: 8 };
  }

  if (table.shape === "rect-around") {
    // Rectangle with seats distributed around all 4 sides proportionally
    const margin = 14;
    const innerW = width - 2 * margin;
    const innerH = height - 2 * margin;
    const perimeter = 2 * (innerW + innerH);
    const offset = (seatIndex / seatCount) * perimeter;
    if (offset < innerW) {
      return { x: margin + offset, y: margin }; // top: left → right
    } else if (offset < innerW + innerH) {
      return { x: width - margin, y: margin + (offset - innerW) }; // right: top → bottom
    } else if (offset < 2 * innerW + innerH) {
      return { x: width - margin - (offset - innerW - innerH), y: height - margin }; // bottom: right → left
    } else {
      return { x: margin, y: height - margin - (offset - 2 * innerW - innerH) }; // left: bottom → top
    }
  }

  // round and square: radial positioning
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 14;
  const angle = (-Math.PI / 2) + (2 * Math.PI * seatIndex) / seatCount;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function findPropertyName(
  props: WorkspaceDatabase["properties"],
  candidates: string[],
): string | null {
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

function findPlusOneName(row: WorkspaceDatabase["rows"][number]): string | null {
  const candidates = ["Plus One Name", "Plus One", "Partner Name", "Partner", "+1 Name", "+1"];
  for (const key of candidates) {
    const val = row.properties[key];
    if (typeof val === "string" && val.trim().length > 0) return val.trim();
  }
  return null;
}

function getGuestInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function normalizeTableLabel(table: SeatingTable): string {
  return table.name.trim().length > 0 ? table.name.trim() : `Table ${table.number}`;
}

function getTableTheme(scheme: string | undefined): TableTheme {
  if (scheme && scheme in TABLE_THEMES) return TABLE_THEMES[scheme as TableColorScheme];
  return TABLE_THEMES.classic;
}

// ─── Props ────────────────────────────────────────────────────────────────────
type SeatingPlannerViewProps = {
  /** The guest-list WorkspaceDatabase (null = not found / not loaded yet) */
  guestsDb: WorkspaceDatabase | null;
  /**
   * Optional callback invoked when the user clicks the back button.
   * When omitted a Link to the workspace guest-list page is rendered instead.
   */
  onBack?: () => void;
  /** When true, the wrapper uses flex+overflow styling (for embedded use inside workspace) */
  embedded?: boolean;
};

export function SeatingPlannerView({ guestsDb: guestsDbProp, onBack, embedded = false }: SeatingPlannerViewProps) {
  const ROOM_WIDTH = 1200;
  const ROOM_HEIGHT = 780;
  const GRID_SIZE = 24;
  const ACTION_RAIL_WIDTH = 96;

  // Keep a local copy so we can update row data after saving assignments
  const [guestsDb, setGuestsDb] = useState<WorkspaceDatabase | null>(guestsDbProp);
  useEffect(() => { setGuestsDb(guestsDbProp); }, [guestsDbProp]);

  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<{ tableId: string; seatIndex: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const roomRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ tableId: string; offsetX: number; offsetY: number } | null>(null);
  const loadedStorageKeyRef = useRef<string | null>(null);
  const isHydratingRef = useRef(false);
  const hasUserMutatedRef = useRef(false);
  const hydrationTokenRef = useRef(0);

  const guests = useMemo<SeatingGuest[]>(() => {
    if (!guestsDb) return [];
    const list: SeatingGuest[] = [];
    for (const row of guestsDb.rows) {
      list.push({ id: row.pageId, name: getGuestDisplayName(row) });
      const plusOne = findPlusOneName(row);
      if (plusOne) {
        list.push({ id: `${row.pageId}-plus-one`, name: `${plusOne} (+1)` });
      }
    }
    return list;
  }, [guestsDb]);

  const storageKey = guestsDb ? `wedding.seating.${guestsDb.notionId}` : null;
  const tableFieldName = guestsDb
    ? findPropertyName(guestsDb.properties, ["Table", "Table Number", "Table Assignment"])
    : null;

  function normalizePersistedLayout(raw: unknown, expectedNotionId: string): PersistedSeatingLayout | null {
    if (!raw || typeof raw !== "object") return null;
    const data = raw as Record<string, unknown>;
    if (data["dbNotionId"] !== expectedNotionId) return null;
    const parsed = data as {
      dbNotionId?: unknown;
      updatedAt?: unknown;
      tables?: unknown;
      zoom?: unknown;
      snapToGrid?: unknown;
    };
    const loaded = Array.isArray(parsed.tables) ? (parsed.tables as SeatingTable[]) : [];
    const cleaned: SeatingTable[] = loaded.map((t): SeatingTable => ({
      id: t.id,
      name: t.name || `Table ${t.number}`,
      number: Number.isFinite(t.number) ? Math.max(1, Math.round(t.number)) : 1,
      seats: Number.isFinite(t.seats) ? Math.max(1, Math.round(t.seats)) : 8,
      shape: t.shape === "rectangle" || t.shape === "square" || t.shape === "rect-around" ? t.shape : "round",
      colorScheme: t.colorScheme && t.colorScheme in TABLE_THEMES ? t.colorScheme : "classic",
      x: Number.isFinite(t.x) ? t.x : 20,
      y: Number.isFinite(t.y) ? t.y : 20,
      guestIds: (() => {
        const seatCount = Number.isFinite(t.seats) ? Math.max(1, Math.round(t.seats)) : 8;
        const initial = Array.isArray(t.guestIds)
          ? t.guestIds
              .map((id) => (typeof id === "string" ? id : null))
              .slice(0, seatCount)
          : [];
        while (initial.length < seatCount) initial.push(null);
        return initial;
      })(),
      saved: typeof (t as { saved?: unknown }).saved === "boolean" ? Boolean((t as { saved?: unknown }).saved) : true,
    }));
    const zoom =
      typeof parsed.zoom === "number" && Number.isFinite(parsed.zoom)
        ? Math.min(180, Math.max(60, Math.round(parsed.zoom)))
        : 100;
    const snapToGrid = typeof parsed.snapToGrid === "boolean" ? parsed.snapToGrid : true;
    const updatedAt =
      typeof parsed.updatedAt === "number" && Number.isFinite(parsed.updatedAt)
        ? parsed.updatedAt
        : 0;
    return {
      dbNotionId: expectedNotionId,
      updatedAt,
      tables: cleaned,
      zoom,
      snapToGrid,
    };
  }

  function applyLayout(layout: PersistedSeatingLayout | null) {
    if (!layout) {
      setTables([]);
      setSelectedTableId(null);
      setEditingTableId(null);
      setZoom(100);
      setSnapToGrid(true);
      return;
    }
    setTables(layout.tables);
    setSelectedTableId(layout.tables[0]?.id ?? null);
    setEditingTableId(null);
    setZoom(layout.zoom);
    setSnapToGrid(layout.snapToGrid);
  }

  // Load tables from localStorage + DB criteria — only when the storageKey changes.
  // NOT when guests changes. Including guests as a dep would reload from localStorage on every
  // parent re-render, clobbering in-progress edits before the persistence effect can save them.
  useEffect(() => {
    if (!storageKey) return;
    if (loadedStorageKeyRef.current === storageKey) return; // already loaded for this key
    loadedStorageKeyRef.current = storageKey;
    const token = ++hydrationTokenRef.current;
    isHydratingRef.current = true;
    hasUserMutatedRef.current = false;

    let localLayout: PersistedSeatingLayout | null = null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        localLayout = normalizePersistedLayout(JSON.parse(raw), guestsDb?.notionId ?? "");
      }
    } catch {
      localLayout = null;
    }

    applyLayout(localLayout);

    void (async () => {
      try {
        const res = await fetch("/api/members/criteria/wedding-planner", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json().catch(() => ({}))) as { criteria?: Record<string, unknown> | null };
        const fromDb = normalizePersistedLayout(body.criteria?.["seating-layout-v1"], guestsDb?.notionId ?? "");
        if (!fromDb) return;
        if (hydrationTokenRef.current !== token) return;
        if (hasUserMutatedRef.current) return;
        if (!localLayout || fromDb.updatedAt >= localLayout.updatedAt) {
          isHydratingRef.current = true;
          applyLayout(fromDb);
        }
      } catch {
        // Keep UI resilient when DB criteria read fails.
      } finally {
        if (hydrationTokenRef.current === token) {
          // Defer so the state updates above settle before tracking user mutations.
          queueMicrotask(() => {
            if (hydrationTokenRef.current === token) isHydratingRef.current = false;
          });
        }
      }
    })();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Mark user mutations after hydration so async DB load doesn't clobber active edits.
  useEffect(() => {
    if (isHydratingRef.current) return;
    hasUserMutatedRef.current = true;
  }, [tables, zoom, snapToGrid]);

  // Persist tables to localStorage + DB criteria (debounced)
  useEffect(() => {
    if (!storageKey || !guestsDb) return;
    if (isHydratingRef.current) return;
    const payload: PersistedSeatingLayout = {
      dbNotionId: guestsDb.notionId,
      updatedAt: Date.now(),
      tables,
      zoom,
      snapToGrid,
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Ignore storage write errors.
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const getRes = await fetch("/api/members/criteria/wedding-planner", { cache: "no-store" });
          const getBody = getRes.ok
            ? ((await getRes.json().catch(() => ({}))) as { criteria?: Record<string, unknown> | null })
            : { criteria: null };
          const nextCriteria = {
            ...(getBody.criteria ?? {}),
            "seating-layout-v1": payload,
          };
          await fetch("/api/members/criteria/wedding-planner", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ criteria: nextCriteria }),
          });
        } catch {
          // Ignore transient DB criteria persistence failures; local cache is fallback.
        }
      })();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [storageKey, guestsDb, tables, zoom, snapToGrid]);

  // Keep selectedTableId in sync
  useEffect(() => {
    if (tables.length === 0) { if (selectedTableId !== null) setSelectedTableId(null); return; }
    if (selectedTableId !== null && tables.some((t) => t.id === selectedTableId)) return;
    setSelectedTableId(tables[0]!.id);
  }, [tables, selectedTableId]);

  // Mouse drag handling
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
          const { width, height } = getTableDimensions(table);
          const rawX = Math.max(0, Math.min(ROOM_WIDTH - width - ACTION_RAIL_WIDTH, roomX - drag.offsetX));
          const rawY = Math.max(0, Math.min(ROOM_HEIGHT - height, roomY - drag.offsetY));
          const x = snapToGrid ? Math.round(rawX / GRID_SIZE) * GRID_SIZE : rawX;
          const y = snapToGrid ? Math.round(rawY / GRID_SIZE) * GRID_SIZE : rawY;
          return { ...table, x, y };
        }),
      );
    };
    const handleUp = () => { dragStateRef.current = null; };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [zoom, snapToGrid]);

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;
  const zoomScale = zoom / 100;
  const guestById = useMemo(() => new Map(guests.map((g) => [g.id, g])), [guests]);
  const guestToTableId = useMemo(() => {
    const map = new Map<string, string>();
    for (const table of tables) {
      for (const guestId of table.guestIds) {
        if (guestId) map.set(guestId, table.id);
      }
    }
    return map;
  }, [tables]);
  const assignedGuestIds = new Set<string>(guestToTableId.keys());
  const unseatedGuests = guests.filter((g) => !assignedGuestIds.has(g.id));
  const overCapacityTables = tables.filter((t) => t.guestIds.filter(Boolean).length > t.seats);

  function createTable(shape: SeatingShape = "round") {
    setError(null);
    const usedNumbers = new Set(tables.map((t) => t.number));
    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) nextNumber++;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tableIndex = tables.length;
    const defaultSeats: Record<SeatingShape, number> = { rectangle: 10, round: 8, square: 4, "rect-around": 12 };
    const defaultColor: Record<SeatingShape, TableColorScheme> = { rectangle: "ocean", round: "classic", square: "sage", "rect-around": "rose" };
    const defaultX: Record<SeatingShape, number> = { rectangle: 360, round: 32 + (tableIndex % 5) * 145, square: 32 + (tableIndex % 5) * 200, "rect-around": 200 };
    const defaultY: Record<SeatingShape, number> = { rectangle: 24, round: 80 + Math.floor(tableIndex / 5) * 145, square: 80 + Math.floor(tableIndex / 5) * 200, "rect-around": 240 };
    const table: SeatingTable = {
      id,
      number: nextNumber,
      name: shape === "rectangle" ? "Top Table" : `Table ${nextNumber}`,
      seats: defaultSeats[shape],
      shape,
      colorScheme: defaultColor[shape],
      x: defaultX[shape],
      y: defaultY[shape],
      guestIds: [],
      saved: false,
    };
    setTables((prev) => [...prev, table]);
    setSelectedTableId(id);
    setEditingTableId(id);
  }

  function updateTable(tableId: string, updater: (t: SeatingTable) => SeatingTable) {
    setTables((prev) => prev.map((t) => (t.id === tableId ? updater(t) : t)));
  }

  function deleteTable(tableId: string) {
    if (!confirm("Delete this table and unassign its guests?")) return;
    setTables((prev) => prev.filter((t) => t.id !== tableId));
    setSelectedSeat((prev) => (prev?.tableId === tableId ? null : prev));
  }

  function assignGuestToTable(guestId: string, targetTableId: string | null) {
    setTables((prev) =>
      prev.map((table) => {
        const hasGuest = table.guestIds.includes(guestId);
        if (targetTableId === table.id) {
          if (hasGuest) return table;
          const next = [...table.guestIds];
          const emptyIndex = next.findIndex((id) => id === null);
          if (emptyIndex >= 0) {
            next[emptyIndex] = guestId;
            return { ...table, guestIds: next };
          }
          if (next.length > 0) next[next.length - 1] = guestId;
          return { ...table, guestIds: next };
        }
        if (hasGuest) {
          return {
            ...table,
            guestIds: table.guestIds.map((id) => (id === guestId ? null : id)),
          };
        }
        return table;
      }),
    );
  }

  function assignGuestToSeat(guestId: string, targetTableId: string, seatIndex: number) {
    setTables((prev) => {
      // Remove guest from any current seat first while preserving seat indexes.
      const stripped = prev.map((table) => ({
        ...table,
        guestIds: table.guestIds.map((id) => (id === guestId ? null : id)),
      }));
      return stripped.map((table) => {
        if (table.id !== targetTableId) return table;
        const clampedIndex = Math.max(0, Math.min(table.seats - 1, seatIndex));
        const next = [...table.guestIds].slice(0, table.seats);
        while (next.length < table.seats) next.push(null);
        next[clampedIndex] = guestId;
        return { ...table, guestIds: next };
      });
    });
    setSelectedSeat({ tableId: targetTableId, seatIndex: Math.max(0, seatIndex) });
  }

  function removeGuestFromSeat(tableId: string, seatIndex: number) {
    setTables((prev) =>
      prev.map((table) => {
        if (table.id !== tableId) return table;
        if (seatIndex < 0 || seatIndex >= table.seats) return table;
        const next = [...table.guestIds];
        while (next.length < table.seats) next.push(null);
        next[seatIndex] = null;
        return { ...table, guestIds: next };
      }),
    );
  }

  async function saveAssignmentsToGuestList() {
    setError(null);
    setSuccess(null);
    if (!guestsDb) { setError("Guest database is not loaded yet."); return; }
    if (!tableFieldName) { setError("Could not find a Table field in this Guest List database."); return; }
    setSaving(true);
    try {
      const assignmentByGuest = new Map<string, string>();
      for (const table of tables) {
        const label = normalizeTableLabel(table);
        for (const guestId of table.guestIds) {
          if (guestId) assignmentByGuest.set(guestId, label);
        }
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
              r.pageId !== row.pageId ? r : { ...r, properties: { ...r.properties, [tableFieldName]: nextVal } },
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
    const esc = (s: string) =>
      s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
    const nodes = tables
      .map((table) => {
        const label = normalizeTableLabel(table);
        const theme = getTableTheme(table.colorScheme);
        const { width, height } = getTableDimensions(table);
        const assignedCount = table.guestIds.filter(Boolean).length;
        // Seat circles using the same positioning as the canvas
        const seatCircles = Array.from({ length: Math.max(1, table.seats) }).map((_, idx) => {
          const pos = getSeatPosition(table, idx);
          const filled = Boolean(table.guestIds[idx]);
          return `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="6" fill="${filled ? theme.chipBg : "#ffffff"}" stroke="${theme.chipBorder}" />`;
        }).join("");
        const cx = width / 2;
        const cy = height / 2;
        if (table.shape === "round") {
          const r = Math.min(width, height) / 2 - 2;
          const guestLines = table.guestIds.filter(Boolean).slice(0, 4).map((id) => esc(guestById.get(id ?? "")?.name ?? "")).filter(Boolean);
          return `<g transform="translate(${table.x},${table.y})"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${theme.bg}" stroke="${theme.border}" />${seatCircles}<text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" fill="${theme.text}" font-weight="700">Table ${table.number}</text><text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="10" font-family="Arial, sans-serif" fill="${theme.text}">${esc(label)}</text><text x="${cx}" y="${cy + 18}" text-anchor="middle" font-size="10" font-family="Arial, sans-serif" fill="${theme.mutedText}">${assignedCount}/${table.seats}</text>${guestLines.map((line, i) => `<text x="${cx}" y="${cy + 32 + i * 11}" text-anchor="middle" font-size="9" font-family="Arial, sans-serif" fill="${theme.mutedText}">${line}</text>`).join("")}</g>`;
        }
        // square, rect-around, rectangle (top table) — all use a rect background
        const shapeLabel = table.shape === "rectangle" ? "Top Table" : table.shape === "rect-around" ? "Rectangle" : "Square";
        return `<g transform="translate(${table.x},${table.y})"><rect x="0" y="0" width="${width}" height="${height}" rx="10" fill="${theme.bg}" stroke="${theme.border}" />${seatCircles}<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="13" font-family="Arial, sans-serif" fill="${theme.text}" font-weight="700">Table ${table.number}</text><text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="10" font-family="Arial, sans-serif" fill="${theme.text}">${esc(label)}</text><text x="${cx}" y="${cy + 27}" text-anchor="middle" font-size="9" font-family="Arial, sans-serif" fill="${theme.mutedText}">${shapeLabel} · ${assignedCount}/${table.seats}</text></g>`;
      })
      .join("\n");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${ROOM_WIDTH}" height="${ROOM_HEIGHT}" viewBox="0 0 ${ROOM_WIDTH} ${ROOM_HEIGHT}"><defs><pattern id="grid" width="${GRID_SIZE}" height="${GRID_SIZE}" patternUnits="userSpaceOnUse"><path d="M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}" fill="none" stroke="#ece9e3" stroke-width="1" /></pattern></defs><rect x="0" y="0" width="${ROOM_WIDTH}" height="${ROOM_HEIGHT}" fill="#faf9f7" /><rect x="0" y="0" width="${ROOM_WIDTH}" height="${ROOM_HEIGHT}" fill="url(#grid)" /><text x="16" y="24" font-size="14" font-family="Arial, sans-serif" fill="#37352f" font-weight="700">Wedding Seating Plan</text><text x="16" y="42" font-size="11" font-family="Arial, sans-serif" fill="#6b6862">Tables: ${tables.length} · Guests seated: ${assignedGuestIds.size}/${guests.length}</text>${nodes}</svg>`.trim();
  }

  async function exportAsPng() {
    if (tables.length === 0) { setError("Add at least one table before exporting."); return; }
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
    if (tables.length === 0) { setError("Add at least one table before printing."); return; }
    setError(null);
    const svgMarkup = buildSvgMarkup();
    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) { setError("Popup blocked. Allow popups to print/export PDF."); return; }
    printWindow.document.open();
    printWindow.document.write(`<html><head><title>Wedding Seating Plan</title><style>body{margin:0;padding:20px;font-family:Arial,sans-serif;background:#fff}.wrap{max-width:1200px;margin:0 auto}svg{width:100%;height:auto;border:1px solid #ddd;border-radius:8px}@media print{body{padding:0}}</style></head><body><div class="wrap">${svgMarkup}</div><script>window.onload=function(){window.print()};<\/script></body></html>`);
    printWindow.document.close();
  }

  return (
    <div
      style={{
        padding: "18px 20px",
        fontFamily: N_FONT,
        background: "#fff9f8",
        ...(embedded
          ? { flex: 1, overflow: "auto", minHeight: 0 }
          : { minHeight: "100vh" }),
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
        <div>
          <div style={{ marginBottom: "6px" }}>
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "12px",
                  color: "#be185d",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: N_FONT,
                }}
              >
                <ArrowLeft size={12} />
                Back to Guest List
              </button>
            ) : (
              <Link
                href="/members/workspace?nicheId=wedding-planner&dbId=guests"
                style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#be185d", textDecoration: "none" }}
              >
                <ArrowLeft size={12} />
                Back to Guest List
              </Link>
            )}
          </div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#6b2040", letterSpacing: "-0.5px" }}>
            🌸 Wedding Seating Planner
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#9d174d" }}>
            Drag tables on the canvas and drag guests from the list into a table.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => setRightPanelCollapsed((prev) => !prev)}
            style={{ padding: "7px 10px", borderRadius: "4px", border: "1px solid rgba(55,53,47,0.18)", background: "#fff", color: N_FG, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
          >
            {rightPanelCollapsed ? "Show Guest List" : "Hide Guest List"}
          </button>
          <button type="button" onClick={() => createTable("rectangle")}
            style={{ padding: "7px 10px", borderRadius: "4px", border: "none", background: "linear-gradient(135deg, #6b2040, #be185d)", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 16px rgba(190,24,93,0.18)" }}>
            + Top Table
          </button>
          <button type="button" onClick={() => createTable("round")}
            style={{ padding: "7px 10px", borderRadius: "4px", border: `1px solid ${N_BORDER_MED}`, background: "#fff", color: N_FG, fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Plus size={12} /> Round Table
          </button>
          <button type="button" onClick={() => createTable("square")}
            style={{ padding: "7px 10px", borderRadius: "4px", border: "1px solid rgba(33,75,46,0.18)", background: "linear-gradient(135deg, #eef7f0, #dff0e4)", color: "#214b2e", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Plus size={12} /> Square Table
          </button>
          <button type="button" onClick={() => createTable("rect-around")}
            style={{ padding: "7px 10px", borderRadius: "4px", border: "1px solid rgba(29,79,115,0.18)", background: "linear-gradient(135deg, #edf7ff, #d9eeff)", color: "#1d4f73", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Plus size={12} /> Rectangle Table
          </button>
          <button type="button" onClick={() => void exportAsPng()}
            style={{ padding: "7px 10px", borderRadius: "4px", border: `1px solid ${N_BORDER_MED}`, background: "white", color: N_FG, fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <Download size={12} /> Export PNG
          </button>
          <button type="button" onClick={printAsPdf}
            style={{ padding: "7px 10px", borderRadius: "4px", border: `1px solid ${N_BORDER_MED}`, background: "white", color: N_FG, fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <Printer size={12} /> Print / PDF
          </button>
          <button type="button" onClick={() => void saveAssignmentsToGuestList()} disabled={saving}
            style={{ padding: "7px 12px", borderRadius: "4px", border: "none", background: saving ? "rgba(190,24,93,0.2)" : "linear-gradient(135deg, #6b2040, #be185d)", color: "white", fontSize: "12px", fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
            {saving ? "Saving..." : "Save to Guest List"}
          </button>
        </div>
      </div>

      {/* ── Controls ──────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: N_FG }}>
          Zoom
          <input type="range" min={60} max={180} step={5} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          <span style={{ width: "42px", textAlign: "right", color: N_MUTED }}>{zoom}%</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: N_FG }}>
          <input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
          Snap to grid
        </label>
        <button
          type="button"
          onClick={() => setRightPanelCollapsed((prev) => !prev)}
          style={{ border: "1px solid rgba(55,53,47,0.2)", background: "#fff", color: N_FG, borderRadius: "4px", padding: "5px 9px", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: N_FONT }}
        >
          {rightPanelCollapsed ? "Show Guest List Panel" : "Hide Guest List Panel"}
        </button>
      </div>

      {(error || success) && (
        <div style={{ marginBottom: "10px" }}>
          {error && <p style={{ margin: 0, fontSize: "12px", color: "rgb(220,38,38)" }}>{error}</p>}
          {success && <p style={{ margin: 0, fontSize: "12px", color: "rgb(15,123,108)" }}>{success}</p>}
        </div>
      )}

      {(unseatedGuests.length > 0 || overCapacityTables.length > 0) && (
        <div style={{ marginBottom: "10px", padding: "8px 10px", borderRadius: "6px", border: "1px solid rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.08)" }}>
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#b45309" }}>Seating conflicts detected</p>
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

      {/* ── Canvas + panel ───────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: rightPanelCollapsed ? "1fr" : "2fr 1fr", gap: "12px" }}>
        {/* Canvas */}
        <div style={{ position: "relative", minHeight: "600px", border: `1px dashed ${N_BORDER_MED}`, borderRadius: "6px", background: "linear-gradient(180deg, #fffdf7 0%, #f7f3ea 100%)", overflow: "auto" }}>
          <div
            ref={roomRef}
            style={{
              position: "relative",
              width: `${ROOM_WIDTH}px`,
              height: `${ROOM_HEIGHT}px`,
              transform: `scale(${zoomScale})`,
              transformOrigin: "top left",
              backgroundImage: snapToGrid ? `linear-gradient(to right, rgba(55,53,47,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(55,53,47,0.06) 1px, transparent 1px)` : "none",
              backgroundSize: snapToGrid ? `${GRID_SIZE}px ${GRID_SIZE}px` : "auto",
            }}
          >
            {tables.length === 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: N_MUTED, fontSize: "13px" }}>
                No tables yet. Add a Top Table, Round Table, Square Table, or Rectangle Table to begin.
              </div>
            )}

            {tables.map((table) => {
              const assignedCount = table.guestIds.filter(Boolean).length;
              const selected = selectedTableId === table.id;
              const theme = getTableTheme(table.colorScheme);
              const editing = !table.saved || editingTableId === table.id;
              const { width, height } = getTableDimensions(table);
              return (
                <div
                  key={table.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const guestId = e.dataTransfer.getData("text/guestId");
                    if (!guestId) return;
                    const selectedSeatIndex =
                      selectedSeat && selectedSeat.tableId === table.id
                        ? Math.max(0, Math.min(table.seats - 1, selectedSeat.seatIndex))
                        : null;
                    const firstEmptyIndex = table.guestIds.findIndex((id) => id === null);
                    const firstEmpty = firstEmptyIndex >= 0
                      ? firstEmptyIndex
                      : Math.max(0, table.seats - 1);
                    assignGuestToSeat(guestId, table.id, selectedSeatIndex ?? firstEmpty);
                  }}
                  onMouseDown={(e) => {
                    const target = e.target as HTMLElement;
                    if (["input", "button", "select", "textarea", "label"].includes(target.tagName.toLowerCase())) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const currentZoom = zoom / 100;
                    dragStateRef.current = { tableId: table.id, offsetX: (e.clientX - rect.left) / currentZoom, offsetY: (e.clientY - rect.top) / currentZoom };
                  }}
                  onClick={() => setSelectedTableId(table.id)}
                  style={{
                    position: "absolute",
                    left: `${table.x}px`,
                    top: `${table.y}px`,
                    width: `${width}px`,
                    minHeight: `${height}px`,
                    padding: "8px",
                    overflow: "visible",
                    borderRadius: table.shape === "round" ? "999px" : table.shape === "square" ? "12px" : "10px",
                    border: `1px solid ${selected ? "#be185d" : theme.border}`,
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
                  {editing ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <strong style={{ fontSize: "12px", color: theme.text }}>Table setup</strong>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTable(table.id);
                          }}
                          style={{ border: "none", background: "none", color: theme.mutedText, fontSize: "11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "3px" }}
                          title="Delete table"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>

                      <input
                        value={table.name}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateTable(table.id, (t) => ({ ...t, name: e.target.value }))}
                        style={{ width: "100%", padding: "4px 6px", borderRadius: "4px", border: `1px solid ${N_BORDER}`, fontSize: "12px", marginBottom: "6px", boxSizing: "border-box", fontFamily: N_FONT }}
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
                              updateTable(table.id, (t) => ({ ...t, number: Number.isFinite(next) ? Math.max(1, Math.round(next)) : t.number }));
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
                                  guestIds: (() => {
                                    const nextSeats = Number.isFinite(next) ? Math.max(1, Math.round(next)) : t.seats;
                                    const nextGuestIds = t.guestIds.slice(0, nextSeats);
                                    while (nextGuestIds.length < nextSeats) nextGuestIds.push(null);
                                    return nextGuestIds;
                                  })(),
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
                            onChange={(e) => {
                              const s = e.target.value as SeatingShape;
                              updateTable(table.id, (t) => ({ ...t, shape: s }));
                            }}
                            style={{ border: `1px solid ${N_BORDER}`, borderRadius: "4px", padding: "3px 4px", fontSize: "12px", fontFamily: N_FONT }}
                          >
                            <option value="round">Round</option>
                            <option value="square">Square</option>
                            <option value="rect-around">Rectangle (all around)</option>
                            <option value="rectangle">Top Table (one side)</option>
                          </select>
                        </label>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "6px", alignItems: "end" }}>
                        <label style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "10px", color: N_SUBTLE }}>
                          Color
                          <select
                            value={table.colorScheme}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateTable(table.id, (t) => ({ ...t, colorScheme: e.target.value in TABLE_THEMES ? (e.target.value as TableColorScheme) : "classic" }))}
                            style={{ border: `1px solid ${N_BORDER}`, borderRadius: "4px", padding: "3px 4px", fontSize: "12px", fontFamily: N_FONT }}
                          >
                            {Object.entries(TABLE_THEMES).map(([key, cfg]) => (
                              <option key={key} value={key}>{cfg.label}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTable(table.id, (t) => ({ ...t, saved: true }));
                            setEditingTableId(null);
                          }}
                          style={{ border: "none", background: "linear-gradient(135deg, #6b2040, #be185d)", color: "white", borderRadius: "4px", padding: "6px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: N_FONT }}
                        >
                          Save
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                        {Array.from({ length: Math.max(1, table.seats) }).map((_, seatIdx) => {
                          const pos = getSeatPosition(table, seatIdx);
                          const guestId = table.guestIds[seatIdx] ?? null;
                          const guest = guestId ? guestById.get(guestId) : null;
                          const isSelectedSeat = selectedSeat?.tableId === table.id && selectedSeat?.seatIndex === seatIdx;
                          return (
                            <div
                              key={`${table.id}-seat-${seatIdx}`}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const droppedGuestId = e.dataTransfer.getData("text/guestId");
                                if (!droppedGuestId) return;
                                assignGuestToSeat(droppedGuestId, table.id, seatIdx);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (guest) {
                                  removeGuestFromSeat(table.id, seatIdx);
                                  setSelectedSeat({ tableId: table.id, seatIndex: seatIdx });
                                  return;
                                }
                                setSelectedSeat({ tableId: table.id, seatIndex: seatIdx });
                              }}
                              title={guest ? `${guest.name} (click to remove)` : `Seat ${seatIdx + 1} (drop guest here)`}
                              style={{
                                pointerEvents: "auto",
                                position: "absolute",
                                left: `${pos.x - 11}px`,
                                top: `${pos.y - 11}px`,
                                width: "22px",
                                height: "22px",
                                borderRadius: "999px",
                                border: isSelectedSeat ? "2px solid #be185d" : `1px solid ${theme.chipBorder}`,
                                background: isSelectedSeat ? "rgba(190,24,93,0.18)" : guest ? theme.chipBg : "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "8px",
                                fontWeight: 700,
                                color: theme.chipText,
                                cursor: guest ? "pointer" : "copy",
                              }}
                            >
                              {guest ? getGuestInitials(guest.name) : ""}
                            </div>
                          );
                        })}
                      </div>

                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          pointerEvents: "none",
                        }}
                      >
                        <strong style={{ fontSize: table.shape === "rectangle" ? "32px" : "28px", lineHeight: 1, color: theme.text, textAlign: "center" }}>
                          Table {table.number}
                        </strong>
                      </div>

                      <div
                        style={{
                          position: "absolute",
                          right: "-94px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          alignItems: "stretch",
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTableId(table.id);
                          }}
                          style={{ border: "none", background: "rgba(37,99,235,0.95)", color: "white", borderRadius: "4px", padding: "5px 9px", fontSize: "10px", fontWeight: 700, cursor: "pointer", fontFamily: N_FONT, boxShadow: "0 4px 10px rgba(37,99,235,0.22)", textAlign: "left", minWidth: "88px" }}
                        >
                          Edit Table
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTable(table.id);
                          }}
                          style={{ border: "none", background: "rgba(55,53,47,0.9)", color: "white", borderRadius: "4px", padding: "5px 9px", fontSize: "10px", fontWeight: 700, cursor: "pointer", fontFamily: N_FONT, boxShadow: "0 4px 10px rgba(55,53,47,0.2)", textAlign: "left", minWidth: "88px" }}
                        >
                          Delete Table
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => setRightPanelCollapsed((prev) => !prev)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                zIndex: 5,
                border: "1px solid rgba(55,53,47,0.2)",
                background: "rgba(255,255,255,0.96)",
                color: N_FG,
                borderRadius: "6px",
                padding: "6px 10px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: N_FONT,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              {rightPanelCollapsed ? "Show Guest List" : "Hide Guest List"}
            </button>
          </div>
        </div>

        {/* Right panel */}
        {!rightPanelCollapsed && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", minHeight: "600px" }}>
          <div style={{ border: `1px solid ${N_BORDER}`, borderRadius: "6px", background: "white", padding: "10px", height: "600px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Guest List (Drag to Table)
              </p>
              <button
                type="button"
                onClick={() => setRightPanelCollapsed(true)}
                style={{ border: "1px solid rgba(55,53,47,0.2)", background: "#fff", color: N_FG, borderRadius: "4px", padding: "2px 7px", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: N_FONT }}
              >
                Collapse
              </button>
            </div>

            {/* Drop-to-unassign zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const guestId = e.dataTransfer.getData("text/guestId"); if (guestId) assignGuestToTable(guestId, null); }}
              style={{ marginBottom: "10px", padding: "8px", borderRadius: "6px", border: `1px dashed ${N_BORDER_MED}`, background: "rgba(55,53,47,0.03)", fontSize: "12px", color: N_MUTED }}
            >
              Drop here to unassign from any table.
            </div>

            <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingRight: "4px", scrollbarGutter: "stable" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {guests.map((guest) => {
                const ownerId = guestToTableId.get(guest.id);
                const owner = ownerId ? tables.find((t) => t.id === ownerId) : null;
                const assignedToSelected = selectedTable ? ownerId === selectedTable.id : false;
                return (
                  <div
                    key={guest.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/guestId", guest.id); e.dataTransfer.effectAllowed = "move"; }}
                    onDoubleClick={() => { if (selectedTable) assignGuestToTable(guest.id, selectedTable.id); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: `1px solid ${assignedToSelected ? "rgba(190,24,93,0.35)" : N_BORDER}`,
                      background: assignedToSelected ? "rgba(190,24,93,0.08)" : "white",
                      cursor: "grab",
                    }}
                    title="Drag to a table, or double-click to assign to selected table"
                  >
                    <span style={{ fontSize: "12px", color: N_FG, flex: 1, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <span>{guest.name}</span>
                      {owner && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#9d174d",
                            background: "rgba(190,24,93,0.12)",
                            border: "1px solid rgba(190,24,93,0.25)",
                            borderRadius: "999px",
                            padding: "1px 6px",
                          }}
                        >
                          T{owner.number}
                        </span>
                      )}
                    </span>
                    {owner ? (
                      <span style={{ fontSize: "10px", color: N_SUBTLE }}>@ {normalizeTableLabel(owner)}</span>
                    ) : (
                      <span style={{ fontSize: "10px", color: "#b45309" }}>Unseated</span>
                    )}
                  </div>
                );
              })}
              {guests.length === 0 && (
                <p style={{ margin: 0, fontSize: "12px", color: N_MUTED }}>No guests found in the Guest List database.</p>
              )}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
