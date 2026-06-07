"use client";
import { useState, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Check } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";

// ── Storage ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = "teacher-lesson-schedule";

interface LessonEntry {
  id:        string;
  date:      string;  // YYYY-MM-DD
  timeStart: string;  // "09:00"
  timeEnd:   string;  // "10:00"
  subject:   string;
  topic:     string;
  links:     string;
  notes:     string;
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
function subjectColor(subject: string) {
  if (!subject) return SUBJECT_PALETTE[0]!;
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = ((h * 31) + subject.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTE[h % SUBJECT_PALETTE.length]!;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

const BLANK_FORM = { timeStart: "09:00", timeEnd: "10:00", subject: "", topic: "", links: "", notes: "" };

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ selectedWeekStart, onSelectWeek }: {
  selectedWeekStart: Date;
  onSelectWeek: (monday: Date) => void;
}) {
  const [calYear,  setCalYear]  = useState(() => selectedWeekStart.getFullYear());
  const [calMonth, setCalMonth] = useState(() => selectedWeekStart.getMonth());

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
      background: "white", borderRadius: "12px",
      border: `1px solid ${N_BORDER_MED}`, padding: "14px",
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
            style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
              borderRadius: "5px", cursor: "pointer", marginBottom: "1px",
              background: isSelected ? ACCENT_LIGHT : "transparent",
              outline: isSelected ? `1px solid ${ACCENT_BORDER}` : "none",
              padding: "1px",
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
          background: "white", cursor: "pointer", fontSize: "11px",
          color: N_MUTED, fontFamily: N_FONT,
        }}
      >
        Today
      </button>
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
      {/* Time + actions row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "5px", marginBottom: "4px" }}>
        <span style={{
          fontSize: "10px", fontWeight: 700, color: col.text,
          background: "white", border: `1px solid ${col.border}`,
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
            style={{ padding: "3px 8px", borderRadius: "5px", background: "white", border: `1px solid ${N_BORDER_MED}`, color: N_MUTED, fontSize: "11px", cursor: "pointer", fontFamily: N_FONT }}>
            No
          </button>
        </div>
      )}
    </div>
  );
}

// ── Entry form ────────────────────────────────────────────────────────────────
function EntryForm({ initial, onSave, onCancel }: {
  initial: Omit<LessonEntry, "id" | "date">;
  onSave:  (data: Omit<LessonEntry, "id" | "date">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const f = (patch: Partial<typeof form>) => setForm(p => ({ ...p, ...patch }));
  const canSave = form.topic.trim() || form.subject.trim();

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "9px", fontWeight: 700, color: N_MUTED,
    marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: N_FONT,
  };
  const inputStyle: React.CSSProperties = {
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
      <div>
        <label style={labelStyle}>Subject</label>
        <input value={form.subject} onChange={e => f({ subject: e.target.value })}
          placeholder="Maths, English…" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Topic / Lesson</label>
        <input value={form.topic} onChange={e => f({ topic: e.target.value })}
          placeholder="What are you teaching?" autoFocus style={inputStyle} />
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
          style={{ padding: "5px 10px", borderRadius: "6px", background: "white", border: `1px solid ${N_BORDER_MED}`, color: N_MUTED, fontSize: "11px", cursor: "pointer", fontFamily: N_FONT }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Day column ────────────────────────────────────────────────────────────────
function DayColumn({ date, entries, defaultSubject, onAdd, onEdit, onDelete }: {
  date:           Date;
  entries:        LessonEntry[];
  defaultSubject: string;
  onAdd:          (data: Omit<LessonEntry, "id" | "date">) => void;
  onEdit:         (id: string, data: Omit<LessonEntry, "id" | "date">) => void;
  onDelete:       (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

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
        background: isToday ? "rgba(37,99,235,0.04)" : "white",
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
              initial={{ timeStart: e.timeStart, timeEnd: e.timeEnd, subject: e.subject, topic: e.topic, links: e.links, notes: e.notes }}
              onSave={data => { onEdit(e.id, data); setEditId(null); }}
              onCancel={() => setEditId(null)}
            />
          ) : (
            <EntryCard
              key={e.id}
              entry={e}
              onEdit={() => setEditId(e.id)}
              onDelete={() => onDelete(e.id)}
            />
          )
        )}

        {adding ? (
          <EntryForm
            initial={{ ...BLANK_FORM, subject: defaultSubject }}
            onSave={data => { onAdd(data); setAdding(false); }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button type="button" onClick={() => setAdding(true)}
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

// ── Main ──────────────────────────────────────────────────────────────────────
export function TeacherLessonPlanner({
  criteria,
}: {
  criteria: Record<string, unknown> | null;
}) {
  const [entries,           setEntries]           = useState<LessonEntry[]>(() => loadEntries());
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => getMonday(new Date()));

  const activeClass = criteria?._activeClass as { subject?: string } | undefined;
  const defaultSubject = activeClass?.subject ?? "";

  // Mon–Fri for the selected week
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

  const w0 = weekDays[0]!;
  const w4 = weekDays[4]!;
  const weekLabel = w0.getMonth() === w4.getMonth()
    ? `${w0.getDate()}–${w4.getDate()} ${MONTH_NAMES[w0.getMonth()]} ${w4.getFullYear()}`
    : `${w0.getDate()} ${MONTH_NAMES[w0.getMonth()]} – ${w4.getDate()} ${MONTH_NAMES[w4.getMonth()]} ${w4.getFullYear()}`;

  return (
    <div style={{ fontFamily: N_FONT, display: "flex", gap: "14px", height: "100%", minHeight: "500px" }}>

      {/* Left: mini calendar */}
      <MiniCalendar
        selectedWeekStart={selectedWeekStart}
        onSelectWeek={setSelectedWeekStart}
      />

      {/* Right: week view */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", minWidth: 0,
        background: "white", borderRadius: "12px",
        border: `1px solid ${N_BORDER_MED}`, overflow: "hidden",
      }}>
        {/* Week header */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "11px 14px", borderBottom: `1px solid ${N_BORDER_MED}`,
          flexShrink: 0, background: "white",
        }}>
          <button type="button" onClick={() => setSelectedWeekStart(d => addDays(d, -7))}
            style={{ background: "none", border: `1px solid ${N_BORDER_MED}`, cursor: "pointer", color: N_MUTED, padding: "4px 7px", borderRadius: "6px", display: "flex", alignItems: "center" }}>
            <ChevronLeft size={13} />
          </button>
          <span style={{ flex: 1, textAlign: "center", fontSize: "13px", fontWeight: 700, color: N_FG }}>{weekLabel}</span>
          <button type="button" onClick={() => setSelectedWeekStart(d => addDays(d, 7))}
            style={{ background: "none", border: `1px solid ${N_BORDER_MED}`, cursor: "pointer", color: N_MUTED, padding: "4px 7px", borderRadius: "6px", display: "flex", alignItems: "center" }}>
            <ChevronRight size={13} />
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
