"use client";
import { useState, useMemo, type CSSProperties } from "react";
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Check, Copy, Trash, Download } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, T_SURFACE, T_SURFACE2, T_CAL_BG, T_CAL_BDR, T_SHADOW } from "./utils";

// ── Storage ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = "teacher-lesson-schedule";

interface LessonEntry {
  id:        string;
  date:      string;  // YYYY-MM-DD
  timeStart: string;  // "09:00"
  timeEnd:   string;  // "10:00"
  classYear: string;  // e.g. "7A Maths", "Year 10"
  subject:   string;
  topic:     string;
  links:     string;
  notes:     string;
}

// ── Time helpers ──────────────────────────────────────────────────────────────
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function hasOverlap(entries: LessonEntry[], timeStart: string, timeEnd: string, excludeId?: string): boolean {
  const start = timeToMin(timeStart);
  const end   = timeToMin(timeEnd);
  if (end <= start) return false; // invalid range — let form validation handle it
  return entries.some(e => {
    if (excludeId && e.id === excludeId) return false;
    const eStart = timeToMin(e.timeStart);
    const eEnd   = timeToMin(e.timeEnd);
    return start < eEnd && end > eStart;
  });
}

function loadEntries(): LessonEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? (JSON.parse(s) as LessonEntry[]) : [];
  } catch { return []; }
}
function saveEntries(entries: LessonEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* */ }
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function ymdToDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_SHORT: Record<number, string> = { 1:"Mon", 2:"Tue", 3:"Wed", 4:"Thu", 5:"Fri" };

// ── Subject colours (hash-based for consistency) ──────────────────────────────
const SUBJECT_PALETTE = [
  { bg:"rgba(37,99,235,0.09)",   text:"#2563eb", border:"rgba(37,99,235,0.28)"  },
  { bg:"rgba(22,163,74,0.09)",   text:"#16a34a", border:"rgba(22,163,74,0.28)"  },
  { bg:"rgba(234,88,12,0.09)",   text:"#ea580c", border:"rgba(234,88,12,0.28)"  },
  { bg:"rgba(147,51,234,0.09)",  text:"#9333ea", border:"rgba(147,51,234,0.28)" },
  { bg:"rgba(8,145,178,0.09)",   text:"#0891b2", border:"rgba(8,145,178,0.28)"  },
  { bg:"rgba(220,38,38,0.09)",   text:"#dc2626", border:"rgba(220,38,38,0.28)"  },
  { bg:"rgba(202,138,4,0.09)",   text:"#ca8a04", border:"rgba(202,138,4,0.28)"  },
  { bg:"rgba(13,148,136,0.09)",  text:"#0d9488", border:"rgba(13,148,136,0.28)" },
];
// Preset subject → palette index so common subjects always get the same colour
// 0=blue 1=green 2=orange 3=purple 4=cyan 5=red 6=amber 7=teal
const SUBJECT_PRESET: Record<string, number> = {
  // Maths → orange
  "maths": 2, "math": 2, "mathematics": 2,
  // English → green
  "english": 1, "english literature": 1, "english language": 1,
  "english lit": 1, "english lang": 1, "literacy": 1,
  // Sciences
  "science": 4, "combined science": 4,
  "biology": 7, "bio": 7,
  "chemistry": 6, "chem": 6,
  "physics": 0,
  // Humanities
  "history": 6,
  "geography": 7, "geo": 7,
  "religious education": 6, "re": 6, "religious studies": 6, "rs": 6,
  "philosophy": 6,
  // Creative
  "art": 3, "art & design": 3, "fine art": 3,
  "music": 3,
  "drama": 3, "performing arts": 3,
  "media": 3, "media studies": 3,
  // Technology
  "computing": 4, "computer science": 4, "ict": 4,
  "design technology": 2, "dt": 2, "design & technology": 2,
  "food technology": 2, "food": 2,
  // Languages → blue
  "french": 0, "spanish": 0, "german": 0, "mandarin": 0,
  "languages": 0, "modern languages": 0, "mfl": 0,
  // PE → red
  "pe": 5, "physical education": 5, "sport": 5, "games": 5,
  // Social / business
  "business": 4, "business studies": 4, "economics": 4,
  "psychology": 3, "sociology": 1,
  "pshe": 7, "pse": 7, "citizenship": 7,
};

function subjectColor(subject: string) {
  if (!subject) return SUBJECT_PALETTE[0]!;
  const key = subject.toLowerCase().trim();
  if (key in SUBJECT_PRESET) return SUBJECT_PALETTE[SUBJECT_PRESET[key]!]!;
  // Unknown subject — use hash for a consistent colour
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = ((h * 31) + subject.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTE[h % SUBJECT_PALETTE.length]!;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

const BLANK_FORM = { timeStart: "09:00", timeEnd: "10:00", classYear: "", subject: "", topic: "", links: "", notes: "" };

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ selectedWeekStart, onSelectWeek }: {
  selectedWeekStart: Date;
  onSelectWeek: (monday: Date) => void;
}) {
  const [calYear,      setCalYear]      = useState(() => selectedWeekStart.getFullYear());
  const [calMonth,     setCalMonth]     = useState(() => selectedWeekStart.getMonth());
  const [hoveredWeek,  setHoveredWeek]  = useState<number | null>(null);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayYMD = toYMD(today);
  const selectedYMD = toYMD(selectedWeekStart);

  // Build calendar grid (Monday-first)
  const firstOfMonth = new Date(calYear, calMonth, 1);
  const startOffset  = firstOfMonth.getDay() === 0 ? 6 : firstOfMonth.getDay() - 1;
  const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(calYear, calMonth, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  function selectWeek(week: (Date | null)[]) {
    const first = week.find(d => d !== null);
    if (!first) return;
    onSelectWeek(getMonday(first));
  }

  return (
    <div style={{
      background: T_CAL_BG, borderRadius: "12px",
      border: `1px solid ${T_CAL_BDR}`, padding: "14px",
      width: "210px", flexShrink: 0, fontFamily: N_FONT,
    }}>
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <button type="button" onClick={prevMonth}
          style={{ background: "none", border: "none", cursor: "pointer", color: N_MUTED, padding: "2px 5px", borderRadius: "4px" }}>
          <ChevronLeft size={13} />
        </button>
        <span style={{ fontSize: "12px", fontWeight: 700, color: N_FG }}>
          {MONTH_NAMES[calMonth]} {calYear}
        </span>
        <button type="button" onClick={nextMonth}
          style={{ background: "none", border: "none", cursor: "pointer", color: N_MUTED, padding: "2px 5px", borderRadius: "4px" }}>
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "3px" }}>
        {["M","T","W","T","F","S","S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "9px", fontWeight: 700, color: N_MUTED, padding: "2px 0" }}>{d}</div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => {
        const first = week.find(d => d !== null);
        const weekMonday = first ? getMonday(first) : null;
        const isSelected = weekMonday ? toYMD(weekMonday) === selectedYMD : false;

        return (
          <div key={wi}
            onClick={() => selectWeek(week)}
            onMouseEnter={() => setHoveredWeek(wi)}
            onMouseLeave={() => setHoveredWeek(null)}
            style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
              borderRadius: "5px", cursor: "pointer", marginBottom: "1px",
              background: isSelected ? ACCENT_LIGHT : hoveredWeek === wi ? "rgba(37,99,235,0.05)" : "transparent",
              outline: isSelected ? `1px solid ${ACCENT_BORDER}` : hoveredWeek === wi ? `1px solid ${ACCENT_BORDER}` : "1px solid transparent",
              padding: "1px",
              transition: "background 0.1s",
            }}
          >
            {week.map((d, di) => {
              const isToday  = d ? toYMD(d) === todayYMD : false;
              const isWeekend = di >= 5;
              return (
                <div key={di} style={{
                  textAlign: "center", fontSize: "10px", padding: "3px 0",
                  borderRadius: "4px",
                  background: isToday ? ACCENT : "transparent",
                  color: !d ? "transparent" : isToday ? "white" : isWeekend ? N_MUTED : N_FG,
                  fontWeight: isToday ? 700 : 400,
                  opacity: !d ? 0 : isWeekend ? 0.45 : 1,
                }}>
                  {d ? d.getDate() : 0}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Today */}
      <button type="button"
        onClick={() => {
          const t = new Date(); t.setHours(0, 0, 0, 0);
          setCalMonth(t.getMonth()); setCalYear(t.getFullYear());
          onSelectWeek(getMonday(t));
        }}
        style={{
          width: "100%", marginTop: "10px", padding: "6px",
          borderRadius: "7px", border: `1px solid ${N_BORDER_MED}`,
          background: T_SURFACE2, cursor: "pointer", fontSize: "11px",
          color: N_MUTED, fontFamily: N_FONT,
        }}
      >
        Today
      </button>

      {/* Hint */}
      <p style={{
        margin: "8px 0 0", fontSize: "10px", color: N_MUTED,
        fontFamily: N_FONT, textAlign: "center", lineHeight: 1.4,
      }}>
        Click any row to jump to that week
      </p>
    </div>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────
function EntryCard({ entry, onEdit, onDelete }: {
  entry: LessonEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const col = subjectColor(entry.subject);
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div style={{
      borderRadius: "8px", border: `1px solid ${col.border}`,
      background: col.bg, padding: "9px 10px", marginBottom: "5px",
      position: "relative",
    }}>
      {/* Class / year header */}
      {entry.classYear && (
        <div style={{ marginBottom: "5px" }}>
          <span style={{
            fontSize: "11px", fontWeight: 700, color: col.text,
            background: col.bg, border: `1px solid ${col.border}`,
            borderRadius: "4px", padding: "2px 7px", fontFamily: N_FONT,
          }}>
            {entry.classYear}
          </span>
        </div>
      )}

      {/* Time + subject + actions row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "5px", marginBottom: "4px" }}>
        <span style={{
          fontSize: "10px", fontWeight: 700, color: col.text,
          background: T_SURFACE, border: `1px solid ${col.border}`,
          borderRadius: "3px", padding: "1px 5px", flexShrink: 0,
          fontFamily: N_FONT,
        }}>
          {entry.timeStart}{entry.timeEnd ? `–${entry.timeEnd}` : ""}
        </span>
        {entry.subject && (
          <span style={{ fontSize: "11px", fontWeight: 700, color: col.text, flex: 1, fontFamily: N_FONT, wordBreak: "break-word" }}>
            {entry.subject}
          </span>
        )}
        <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
          <button type="button" onClick={onEdit}
            style={{ background: "none", border: "none", cursor: "pointer", color: N_MUTED, padding: "1px", borderRadius: "3px", display: "flex" }}>
            <Pencil size={10} />
          </button>
          <button type="button" onClick={() => setConfirmDel(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: N_MUTED, padding: "1px", borderRadius: "3px", display: "flex" }}>
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {entry.topic && (
        <p style={{ margin: "0 0 3px", fontSize: "12px", fontWeight: 600, color: N_FG, fontFamily: N_FONT }}>{entry.topic}</p>
      )}
      {entry.links && (
        <p style={{ margin: "0 0 2px", fontSize: "10px", color: "#2563eb", fontFamily: N_FONT, wordBreak: "break-all" }}>
          🔗 {entry.links}
        </p>
      )}
      {entry.notes && (
        <p style={{ margin: 0, fontSize: "10px", color: N_MUTED, fontFamily: N_FONT }}>{entry.notes}</p>
      )}

      {/* Delete confirm overlay */}
      {confirmDel && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "8px",
          background: "rgba(255,255,255,0.95)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          zIndex: 10,
        }}>
          <span style={{ fontSize: "11px", color: "#dc2626", fontFamily: N_FONT }}>Delete?</span>
          <button type="button" onClick={onDelete}
            style={{ padding: "3px 10px", borderRadius: "5px", background: "#dc2626", border: "none", color: "white", fontWeight: 700, fontSize: "11px", cursor: "pointer", fontFamily: N_FONT }}>
            Yes
          </button>
          <button type="button" onClick={() => setConfirmDel(false)}
            style={{ padding: "3px 8px", borderRadius: "5px", background: T_SURFACE2, border: `1px solid ${N_BORDER_MED}`, color: N_MUTED, fontSize: "11px", cursor: "pointer", fontFamily: N_FONT }}>
            No
          </button>
        </div>
      )}
    </div>
  );
}

// ── Entry form ────────────────────────────────────────────────────────────────
function EntryForm({ initial, overlapError, onSave, onCancel }: {
  initial:      Omit<LessonEntry, "id" | "date">;
  overlapError: boolean;
  onSave:       (data: Omit<LessonEntry, "id" | "date">) => void;
  onCancel:     () => void;
}) {
  const [form, setForm] = useState(initial);
  const f = (patch: Partial<typeof form>) => setForm(p => ({ ...p, ...patch }));
  const canSave = !!(form.topic.trim() || form.subject.trim());

  const labelStyle: CSSProperties = {
    display: "block", fontSize: "9px", fontWeight: 700, color: N_MUTED,
    marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: N_FONT,
  };
  const inputStyle: CSSProperties = {
    width: "100%", padding: "6px 8px", borderRadius: "6px",
    border: `1px solid ${N_BORDER_MED}`, fontSize: "12px",
    fontFamily: N_FONT, boxSizing: "border-box",
  };

  return (
    <div style={{
      borderRadius: "9px", border: `1px solid ${ACCENT_BORDER}`,
      background: ACCENT_LIGHT, padding: "11px", marginBottom: "5px",
      display: "flex", flexDirection: "column", gap: "7px",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
        <div>
          <label style={labelStyle}>From</label>
          <input type="time" value={form.timeStart} onChange={e => f({ timeStart: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>To</label>
          <input type="time" value={form.timeEnd} onChange={e => f({ timeEnd: e.target.value })} style={inputStyle} />
        </div>
      </div>

      {/* Overlap error */}
      {overlapError && (
        <div style={{
          padding: "6px 10px", borderRadius: "6px",
          background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)",
          fontSize: "11px", color: "#dc2626", fontFamily: N_FONT, fontWeight: 600,
        }}>
          ⚠ This time slot overlaps with another lesson. Adjust the times.
        </div>
      )}

      <div>
        <label style={labelStyle}>Class / Year Group</label>
        <input value={form.classYear} onChange={e => f({ classYear: e.target.value })}
          placeholder="e.g. 7A, Year 10, Sixth Form" autoFocus style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Subject</label>
        <input value={form.subject} onChange={e => f({ subject: e.target.value })}
          placeholder="Maths, English…" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Topic / Lesson</label>
        <input value={form.topic} onChange={e => f({ topic: e.target.value })}
          placeholder="What are you teaching?" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Links</label>
        <input value={form.links} onChange={e => f({ links: e.target.value })}
          placeholder="https://…" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Notes</label>
        <textarea value={form.notes} onChange={e => f({ notes: e.target.value })}
          placeholder="Any notes…" rows={2}
          style={{ ...inputStyle, resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", gap: "5px" }}>
        <button type="button" onClick={() => onSave(form)} disabled={!canSave}
          style={{
            display: "flex", alignItems: "center", gap: "4px",
            padding: "5px 14px", borderRadius: "6px", background: ACCENT,
            border: "none", color: "white", fontWeight: 700, fontSize: "11px",
            cursor: "pointer", fontFamily: N_FONT, opacity: canSave ? 1 : 0.5,
          }}>
          <Check size={11} /> Save
        </button>
        <button type="button" onClick={onCancel}
          style={{ padding: "5px 10px", borderRadius: "6px", background: T_SURFACE2, border: `1px solid ${N_BORDER_MED}`, color: N_MUTED, fontSize: "11px", cursor: "pointer", fontFamily: N_FONT }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Day column ────────────────────────────────────────────────────────────────
function DayColumn({ date, entries, defaultSubject, defaultClassYear, onAdd, onEdit, onDelete }: {
  date:              Date;
  entries:           LessonEntry[];
  defaultSubject:    string;
  defaultClassYear:  string;
  onAdd:             (data: Omit<LessonEntry, "id" | "date">) => void;
  onEdit:            (id: string, data: Omit<LessonEntry, "id" | "date">) => void;
  onDelete:          (id: string) => void;
}) {
  const [adding,      setAdding]      = useState(false);
  const [editId,      setEditId]      = useState<string | null>(null);
  const [overlapErr,  setOverlapErr]  = useState(false);

  function handleAdd(data: Omit<LessonEntry, "id" | "date">) {
    if (hasOverlap(entries, data.timeStart, data.timeEnd)) {
      setOverlapErr(true);
      return;
    }
    setOverlapErr(false);
    onAdd(data);
    setAdding(false);
  }

  function handleEdit(id: string, data: Omit<LessonEntry, "id" | "date">) {
    if (hasOverlap(entries, data.timeStart, data.timeEnd, id)) {
      setOverlapErr(true);
      return;
    }
    setOverlapErr(false);
    onEdit(id, data);
    setEditId(null);
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isToday = toYMD(date) === toYMD(today);

  const dayNum = date.getDay(); // 1=Mon…5=Fri
  const dayShort = DAY_SHORT[dayNum] ?? "";

  const sorted = [...entries].sort((a, b) => a.timeStart.localeCompare(b.timeStart));

  return (
    <div style={{
      flex: "1 1 0", minWidth: 0,
      display: "flex", flexDirection: "column",
      borderRight: `1px solid ${N_BORDER}`,
    }}>
      {/* Day header */}
      <div style={{
        padding: "10px 8px 8px", borderBottom: `1px solid ${N_BORDER_MED}`,
        background: isToday ? ACCENT_LIGHT : T_SURFACE2,
        textAlign: "center", flexShrink: 0,
      }}>
        <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: isToday ? ACCENT_TEXT : N_MUTED, fontFamily: N_FONT }}>
          {dayShort}
        </div>
        <div style={{
          width: "32px", height: "32px", borderRadius: "50%",
          background: isToday ? ACCENT : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "4px auto 0", fontFamily: N_FONT,
          fontSize: "16px", fontWeight: 700,
          color: isToday ? "white" : N_FG,
        }}>
          {date.getDate()}
        </div>
      </div>

      {/* Entries + Add */}
      <div style={{ flex: 1, padding: "8px", overflowY: "auto", minHeight: 0 }}>
        {sorted.map(e =>
          editId === e.id ? (
            <EntryForm
              key={e.id}
              initial={{ timeStart: e.timeStart, timeEnd: e.timeEnd, classYear: e.classYear, subject: e.subject, topic: e.topic, links: e.links, notes: e.notes }}
              overlapError={overlapErr}
              onSave={data => { setOverlapErr(false); handleEdit(e.id, data); }}
              onCancel={() => { setEditId(null); setOverlapErr(false); }}
            />
          ) : (
            <EntryCard
              key={e.id}
              entry={e}
              onEdit={() => { setEditId(e.id); setOverlapErr(false); }}
              onDelete={() => onDelete(e.id)}
            />
          )
        )}

        {adding ? (
          <EntryForm
            initial={{ ...BLANK_FORM, subject: defaultSubject, classYear: defaultClassYear }}
            overlapError={overlapErr}
            onSave={handleAdd}
            onCancel={() => { setAdding(false); setOverlapErr(false); }}
          />
        ) : (
          <button type="button" onClick={() => { setAdding(true); setOverlapErr(false); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
              width: "100%", padding: "6px",
              borderRadius: "6px", border: `1px dashed ${N_BORDER_MED}`,
              background: "none", cursor: "pointer",
              fontSize: "11px", color: N_MUTED, fontFamily: N_FONT,
            }}>
            <Plus size={11} /> Add
          </button>
        )}
      </div>
    </div>
  );
}

// ── Day colours for copy selector ─────────────────────────────────────────────
const DAY_COLORS: Record<string, { bg: string; text: string; border: string; active: string }> = {
  Mon: { bg: "rgba(37,99,235,0.08)",  text: "#2563eb", border: "rgba(37,99,235,0.3)",  active: "#2563eb" },
  Tue: { bg: "rgba(22,163,74,0.08)",  text: "#16a34a", border: "rgba(22,163,74,0.3)",  active: "#16a34a" },
  Wed: { bg: "rgba(234,88,12,0.08)",  text: "#ea580c", border: "rgba(234,88,12,0.3)",  active: "#ea580c" },
  Thu: { bg: "rgba(147,51,234,0.08)", text: "#9333ea", border: "rgba(147,51,234,0.3)", active: "#9333ea" },
  Fri: { bg: "rgba(13,148,136,0.08)", text: "#0d9488", border: "rgba(13,148,136,0.3)", active: "#0d9488" },
};

// ── Main ──────────────────────────────────────────────────────────────────────
export function TeacherLessonPlanner({
  criteria,
}: {
  criteria: Record<string, unknown> | null;
}) {
  const [entries,           setEntries]           = useState<LessonEntry[]>(() => loadEntries());
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => getMonday(new Date()));

  // Copy/clear state
  const [copyMode,     setCopyMode]     = useState<"week" | "day">("week");
  const [copyDay,      setCopyDay]      = useState<string>("Mon");
  const [copyWeeks,    setCopyWeeks]    = useState(12);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [copyDone,     setCopyDone]     = useState<string | null>(null);

  const activeClass      = criteria?.["_activeClass"] as { subject?: string; name?: string } | undefined;
  const defaultSubject   = activeClass?.subject ?? "";
  const defaultClassYear = activeClass?.name ?? "";

  const weekDays = [0, 1, 2, 3, 4].map(i => addDays(selectedWeekStart, i));

  const weekEntries = useMemo(() => {
    const ymdSet = new Set(weekDays.map(toYMD));
    return entries.filter(e => ymdSet.has(e.date));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, selectedWeekStart]);

  function addEntry(date: Date, data: Omit<LessonEntry, "id" | "date">) {
    const next = [...entries, { id: uid(), date: toYMD(date), ...data }];
    setEntries(next); saveEntries(next);
  }
  function editEntry(id: string, data: Omit<LessonEntry, "id" | "date">) {
    const next = entries.map(e => e.id === id ? { ...e, ...data } : e);
    setEntries(next); saveEntries(next);
  }
  function deleteEntry(id: string) {
    const next = entries.filter(e => e.id !== id);
    setEntries(next); saveEntries(next);
  }

  function doCopy() {
    // Determine source YMDs
    let srcYMDs: string[];
    if (copyMode === "week") {
      srcYMDs = weekDays.map(toYMD);
    } else {
      // Find the matching day of week in the selected week
      const dayIndexMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 };
      const idx = dayIndexMap[copyDay] ?? 0;
      srcYMDs = [toYMD(weekDays[idx]!)];
    }

    const toCopy = entries.filter(e => srcYMDs.includes(e.date));
    if (toCopy.length === 0) {
      setCopyDone("No lessons found to copy on the selected day/week.");
      setTimeout(() => setCopyDone(null), 3500);
      return;
    }

    const existing = new Set(entries.map(e => `${e.date}|${e.timeStart}|${e.timeEnd}`));
    const newEntries: LessonEntry[] = [];

    for (let w = 1; w <= copyWeeks; w++) {
      for (const entry of toCopy) {
        const orig    = ymdToDate(entry.date);
        const newDate = addDays(orig, w * 7);
        const newYMD  = toYMD(newDate);
        const key     = `${newYMD}|${entry.timeStart}|${entry.timeEnd}`;
        if (!existing.has(key)) {
          newEntries.push({ ...entry, id: uid(), date: newYMD });
          existing.add(key);
        }
      }
    }

    const next = [...entries, ...newEntries];
    setEntries(next); saveEntries(next);
    setCopyDone(`✓ Copied ${newEntries.length} lesson${newEntries.length !== 1 ? "s" : ""} across ${copyWeeks} week${copyWeeks !== 1 ? "s" : ""}.`);
    setTimeout(() => setCopyDone(null), 4000);
  }

  function clearWeek() {
    const ymdSet = new Set(weekDays.map(toYMD));
    const next   = entries.filter(e => !ymdSet.has(e.date));
    setEntries(next); saveEntries(next);
    setClearConfirm(false);
    setCopyDone("✓ Week cleared.");
    setTimeout(() => setCopyDone(null), 2500);
  }

  function exportPDF() {
    const win = window.open("", "_blank");
    if (!win) return;

    const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
    const DAY_FULL = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday" };
    const COLORS: Record<string, string> = {
      Mon: "#2563eb", Tue: "#16a34a", Wed: "#ea580c", Thu: "#9333ea", Fri: "#0d9488",
    };

    // Group entries by day
    const byDay: Record<string, LessonEntry[]> = {};
    for (const day of DAYS) {
      const idx = DAYS.indexOf(day);
      const ymd = toYMD(weekDays[idx]!);
      byDay[day] = weekEntries
        .filter(e => e.date === ymd)
        .sort((a, b) => timeToMin(a.timeStart) - timeToMin(b.timeStart));
    }

    // Build subject colour map for the print output (solid versions)
    const SUBJ_COLORS: Record<string, string> = {
      maths: "#ea580c", math: "#ea580c", mathematics: "#ea580c",
      english: "#16a34a", literacy: "#16a34a",
      science: "#0891b2", physics: "#2563eb",
      biology: "#0d9488", chemistry: "#ca8a04",
      pe: "#dc2626", "physical education": "#dc2626", sport: "#dc2626",
      art: "#9333ea", music: "#9333ea", drama: "#9333ea",
      history: "#ca8a04", geography: "#0d9488",
      computing: "#0891b2", "computer science": "#0891b2",
    };
    function subjectHex(s: string): string {
      return SUBJ_COLORS[s.toLowerCase().trim()] ?? "#2563eb";
    }

    const colsHtml = DAYS.map(day => {
      const lessons = byDay[day] ?? [];
      const color = COLORS[day]!;
      const lessonHtml = lessons.length === 0
        ? `<p style="color:#aaa;font-size:12px;margin:8px 0;text-align:center;">No lessons</p>`
        : lessons.map(l => {
            const hex = subjectHex(l.subject);
            return `
              <div style="margin-bottom:8px;padding:8px 10px;border-radius:6px;border-left:3px solid ${hex};background:${hex}12;">
                <div style="font-size:10px;font-weight:700;color:${hex};margin-bottom:2px;">${l.timeStart}${l.timeEnd ? `–${l.timeEnd}` : ""}</div>
                ${l.classYear ? `<div style="font-size:10px;color:#666;margin-bottom:2px;">${l.classYear}</div>` : ""}
                ${l.subject ? `<div style="font-size:12px;font-weight:700;color:#1e293b;">${l.subject}</div>` : ""}
                ${l.topic ? `<div style="font-size:11px;color:#475569;margin-top:2px;">${l.topic}</div>` : ""}
                ${l.notes ? `<div style="font-size:10px;color:#94a3b8;margin-top:3px;">${l.notes}</div>` : ""}
              </div>`;
          }).join("");
      const dateIdx = DAYS.indexOf(day);
      const date = weekDays[dateIdx]!;
      const dateLabel = `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
      return `
        <div style="flex:1;min-width:0;border-right:1px solid #e2e8f0;padding:0 10px 10px;">
          <div style="padding:8px 0 10px;border-bottom:2px solid ${color};margin-bottom:10px;">
            <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:${color};">${DAY_FULL[day]}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:1px;">${dateLabel}</div>
          </div>
          ${lessonHtml}
        </div>`;
    }).join("");

    win.document.write(`<!DOCTYPE html>
<html><head><title>Timetable – ${weekLabel}</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
  @media print { body { padding: 10px; } @page { margin: 15mm; } }
</style>
</head><body>
  <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #1e293b;">
    <div>
      <h1 style="margin:0;font-size:18px;font-weight:800;color:#1e293b;">Weekly Timetable</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#64748b;">${weekLabel}</p>
    </div>
    <div style="font-size:11px;color:#94a3b8;">Printed ${new Date().toLocaleDateString("en-GB")}</div>
  </div>
  <div style="display:flex;gap:0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
    ${colsHtml}
  </div>
</body></html>`);
    win.document.close();
    win.print();
  }

  const w0 = weekDays[0]!;
  const w4 = weekDays[4]!;
  const weekLabel = w0.getMonth() === w4.getMonth()
    ? `${w0.getDate()}–${w4.getDate()} ${MONTH_NAMES[w0.getMonth()]} ${w4.getFullYear()}`
    : `${w0.getDate()} ${MONTH_NAMES[w0.getMonth()]} – ${w4.getDate()} ${MONTH_NAMES[w4.getMonth()]} ${w4.getFullYear()}`;

  const navBtn: CSSProperties = {
    background: "none", border: `1px solid ${N_BORDER_MED}`, cursor: "pointer",
    color: N_MUTED, padding: "4px 7px", borderRadius: "6px",
    display: "flex", alignItems: "center",
  };

  const dayCol = copyMode === "day" ? (DAY_COLORS[copyDay] ?? DAY_COLORS["Mon"]!) : DAY_COLORS["Mon"]!;

  return (
    <div style={{ fontFamily: N_FONT, display: "flex", gap: "14px", minHeight: "500px" }}>

      {/* ── Left column: calendar + copy panel ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "210px", flexShrink: 0 }}>
        <MiniCalendar selectedWeekStart={selectedWeekStart} onSelectWeek={setSelectedWeekStart} />

        {/* Copy / Clear panel */}
        <div style={{
          background: T_SURFACE, borderRadius: "12px",
          border: `1px solid ${N_BORDER_MED}`, padding: "14px",
          display: "flex", flexDirection: "column", gap: "12px",
        }}>
          <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: N_MUTED }}>
            Copy &amp; Clear
          </p>

          {/* Mode toggle */}
          <div style={{ display: "flex", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, overflow: "hidden" }}>
            {(["week", "day"] as const).map(m => (
              <button key={m} type="button" onClick={() => setCopyMode(m)}
                style={{
                  flex: 1, padding: "6px 4px", border: "none", cursor: "pointer",
                  fontFamily: N_FONT, fontSize: "11px", fontWeight: 700,
                  background: copyMode === m ? ACCENT : T_SURFACE2,
                  color: copyMode === m ? "white" : N_MUTED,
                  transition: "all 0.15s",
                }}>
                {m === "week" ? "Full Week" : "One Day"}
              </button>
            ))}
          </div>

          {/* Day selector (only when mode = day) */}
          {copyMode === "day" && (
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {(["Mon", "Tue", "Wed", "Thu", "Fri"] as const).map(d => {
                const col = DAY_COLORS[d]!;
                const isSelected = copyDay === d;
                return (
                  <button key={d} type="button" onClick={() => setCopyDay(d)}
                    style={{
                      flex: "1 1 auto", padding: "5px 4px",
                      borderRadius: "6px", border: `1px solid ${isSelected ? col.active : col.border}`,
                      background: isSelected ? col.active : col.bg,
                      color: isSelected ? "white" : col.text,
                      fontWeight: 700, fontSize: "11px", cursor: "pointer",
                      fontFamily: N_FONT, transition: "all 0.15s",
                    }}>
                    {d}
                  </button>
                );
              })}
            </div>
          )}

          {/* Weeks input */}
          <div>
            <label style={{ display: "block", fontSize: "10px", fontWeight: 700, color: N_MUTED, marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Repeat for
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <input
                type="number" min={1} max={52} value={copyWeeks}
                onChange={e => setCopyWeeks(Math.max(1, Math.min(52, Number(e.target.value))))}
                style={{
                  width: "52px", padding: "6px 8px", borderRadius: "7px",
                  border: `1px solid ${N_BORDER_MED}`, fontSize: "13px",
                  fontFamily: N_FONT, textAlign: "center",
                }}
              />
              <span style={{ fontSize: "12px", color: N_MUTED }}>week{copyWeeks !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Copy button */}
          <button type="button" onClick={doCopy}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              width: "100%", padding: "8px", borderRadius: "8px",
              background: copyMode === "day" ? dayCol.active : ACCENT,
              border: "none", color: "white", fontWeight: 700, fontSize: "12px",
              cursor: "pointer", fontFamily: N_FONT,
            }}>
            <Copy size={13} />
            {copyMode === "week" ? "Copy Week" : `Copy ${copyDay}s`}
          </button>

          {/* Divider */}
          <div style={{ borderTop: `1px solid ${N_BORDER_MED}`, margin: "0 -14px", paddingTop: "0" }} />

          {/* Clear week */}
          {!clearConfirm ? (
            <button type="button" onClick={() => setClearConfirm(true)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                width: "100%", padding: "7px", borderRadius: "8px",
                background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.25)",
                color: "#dc2626", fontWeight: 700, fontSize: "12px",
                cursor: "pointer", fontFamily: N_FONT,
              }}>
              <Trash size={13} /> Clear This Week
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <p style={{ margin: 0, fontSize: "11px", color: "#dc2626", fontWeight: 600, textAlign: "center" }}>
                Remove all lessons this week?
              </p>
              <div style={{ display: "flex", gap: "6px" }}>
                <button type="button" onClick={clearWeek}
                  style={{ flex: 1, padding: "6px", borderRadius: "7px", background: "#dc2626", border: "none", color: "white", fontWeight: 700, fontSize: "11px", cursor: "pointer", fontFamily: N_FONT }}>
                  Yes, clear
                </button>
                <button type="button" onClick={() => setClearConfirm(false)}
                  style={{ flex: 1, padding: "6px", borderRadius: "7px", background: T_SURFACE2, border: `1px solid ${N_BORDER_MED}`, color: N_MUTED, fontSize: "11px", cursor: "pointer", fontFamily: N_FONT }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Feedback message */}
          {copyDone && (
            <p style={{ margin: 0, fontSize: "11px", color: "#15803d", fontWeight: 600, fontFamily: N_FONT, textAlign: "center" }}>
              {copyDone}
            </p>
          )}
        </div>
      </div>

      {/* ── Right: week view ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", minWidth: 0,
        background: T_SURFACE, borderRadius: "12px",
        border: `1px solid ${N_BORDER_MED}`, overflow: "hidden", boxShadow: T_SHADOW,
      }}>
        {/* Week header */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "11px 14px", borderBottom: `1px solid ${N_BORDER_MED}`,
          flexShrink: 0, background: T_SURFACE2,
        }}>
          <button type="button" onClick={() => setSelectedWeekStart(d => addDays(d, -7))} style={navBtn}>
            <ChevronLeft size={13} />
          </button>
          <span style={{ flex: 1, textAlign: "center", fontSize: "13px", fontWeight: 700, color: N_FG }}>{weekLabel}</span>
          <button type="button" onClick={() => setSelectedWeekStart(d => addDays(d, 7))} style={navBtn}>
            <ChevronRight size={13} />
          </button>
          <button type="button" onClick={exportPDF}
            title="Export this week as PDF"
            style={{ ...navBtn, gap: "4px", fontSize: "11px", fontWeight: 600, color: ACCENT_TEXT, background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, padding: "4px 10px" }}>
            <Download size={12} /> PDF
          </button>
        </div>

        {/* Day columns */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {weekDays.map(date => {
            const ymd = toYMD(date);
            return (
              <DayColumn
                key={ymd}
                date={date}
                entries={weekEntries.filter(e => e.date === ymd)}
                defaultSubject={defaultSubject}
                defaultClassYear={defaultClassYear}
                onAdd={data => addEntry(date, data)}
                onEdit={editEntry}
                onDelete={deleteEntry}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
