"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT, asText } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

type LibrarySection = "outline" | "characters" | "scenes" | "covers";

const SECTION_LABELS: Record<LibrarySection, { label: string; icon: string; emptyMsg: string }> = {
  outline:    { label: "Outline",    icon: "📜", emptyMsg: "No outline sections saved yet. Use Story Planner to generate and save." },
  characters: { label: "Characters", icon: "🧑‍🎨", emptyMsg: "No characters saved yet. Use Character Builder to create profiles." },
  scenes:     { label: "Scenes",     icon: "✍️", emptyMsg: "No scenes saved yet. Use Scene Writer to write and save prose." },
  covers:     { label: "Cover Briefs", icon: "🎨", emptyMsg: "No cover briefs saved yet. Use Cover Studio to generate and save." },
};

function BookBadge({ book }: { book: string }) {
  return (
    <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: ACCENT_LIGHT, color: ACCENT_TEXT, fontWeight: 600, border: `1px solid ${ACCENT_BORDER}`, flexShrink: 0 }}>
      {book}
    </span>
  );
}

function ExpandableRow({ row, titleKey, subtitleKey, contentKey, bookKey }: {
  row: WorkspaceRow;
  titleKey: string;
  subtitleKey?: string;
  contentKey: string;
  bookKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const title    = asText(row.properties[titleKey]);
  const subtitle = subtitleKey ? asText(row.properties[subtitleKey]) : null;
  const content  = asText(row.properties[contentKey]);
  const book     = bookKey ? asText(row.properties[bookKey]) : null;

  return (
    <div style={{ borderBottom: `1px solid ${N_BORDER}` }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "11px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: N_FONT }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: N_FG, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Untitled"}</span>
          {subtitle && <span style={{ fontSize: "11px", color: N_SUBTLE }}>{subtitle}</span>}
        </span>
        {book && <BookBadge book={book} />}
        {open ? <ChevronUp size={14} color={N_SUBTLE} /> : <ChevronDown size={14} color={N_SUBTLE} />}
      </button>
      {open && content && (
        <div style={{ padding: "0 16px 16px", fontSize: "13px", color: N_FG, lineHeight: 1.75, whiteSpace: "pre-wrap", borderTop: `1px solid ${N_BORDER}`, paddingTop: "12px" }}>
          {content}
        </div>
      )}
      {open && !content && (
        <div style={{ padding: "8px 16px 12px", fontSize: "12px", color: N_MUTED, fontStyle: "italic" }}>No content saved.</div>
      )}
    </div>
  );
}

function SectionPanel({ rows, titleKey, subtitleKey, contentKey, bookKey, emptyMsg, bookFilter }: {
  rows: WorkspaceRow[];
  titleKey: string;
  subtitleKey?: string;
  contentKey: string;
  bookKey?: string;
  emptyMsg: string;
  bookFilter: string;
}) {
  const filtered = bookFilter === "__all__"
    ? rows
    : rows.filter((r) => asText(r.properties[bookKey ?? "Book"]) === bookFilter);

  if (filtered.length === 0) {
    return (
      <div style={{ padding: "24px 16px", textAlign: "center", fontSize: "13px", color: N_MUTED }}>{emptyMsg}</div>
    );
  }

  return (
    <div>
      {filtered.map((row) => (
        <ExpandableRow key={row.pageId} row={row} titleKey={titleKey} subtitleKey={subtitleKey} contentKey={contentKey} bookKey={bookKey} />
      ))}
    </div>
  );
}

export function AuthorLibrary({
  databases,
}: {
  databases: WorkspaceDatabase[];
}) {
  const [activeSection, setActiveSection] = useState<LibrarySection>("outline");
  const [bookFilter,    setBookFilter]    = useState("__all__");

  const nicheId    = "author";
  const docsDb     = databases.find((d) => d.nicheId === nicheId && d.dbId === "documents")  ?? null;
  const charsDb    = databases.find((d) => d.nicheId === nicheId && d.dbId === "characters") ?? null;
  const scenesDb   = databases.find((d) => d.nicheId === nicheId && d.dbId === "scenes")     ?? null;

  const allDocs    = docsDb?.rows ?? [];
  const allChars   = charsDb?.rows ?? [];
  const allScenes  = scenesDb?.rows ?? [];

  // Outline = docs where Section != "Cover Brief"
  const outlineRows = allDocs.filter((r) => asText(r.properties["Section"]) !== "Cover Brief");
  // Cover briefs = docs where Section == "Cover Brief"
  const coverRows   = allDocs.filter((r) => asText(r.properties["Section"]) === "Cover Brief");

  // Collect all book names across all databases
  const allBooks = Array.from(new Set(
    [...allDocs, ...allChars, ...allScenes]
      .map((r) => asText(r.properties["Book"]))
      .filter(Boolean)
  )).sort();

  const sectionRows: Record<LibrarySection, WorkspaceRow[]> = {
    outline:    outlineRows,
    characters: allChars,
    scenes:     allScenes,
    covers:     coverRows,
  };

  const totalItems = outlineRows.length + allChars.length + allScenes.length + coverRows.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: N_FONT }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: N_FG }}>My Library</h2>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
            All saved content across your books — {totalItems} item{totalItems !== 1 ? "s" : ""} total.
          </p>
        </div>

        {/* Book filter */}
        {allBooks.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: N_MUTED }}>Book:</label>
            <select
              value={bookFilter}
              onChange={(e) => setBookFilter(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "8px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white" }}
            >
              <option value="__all__">All books</option>
              {allBooks.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}
      </div>

      {totalItems === 0 ? (
        <div style={{ padding: "32px", textAlign: "center", borderRadius: "12px", border: `1px dashed ${N_BORDER_MED}` }}>
          <p style={{ margin: "0 0 6px", fontSize: "15px", color: N_FG, fontWeight: 600 }}>Your library is empty</p>
          <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Use Story Planner, Character Builder, Scene Writer and Cover Studio to generate and save content here.</p>
        </div>
      ) : (
        <div style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: "white", overflow: "hidden" }}>
          {/* Section tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${N_BORDER_MED}`, overflowX: "auto" }}>
            {(Object.entries(SECTION_LABELS) as [LibrarySection, typeof SECTION_LABELS[LibrarySection]][]).map(([id, meta]) => {
              const count = sectionRows[id].length;
              const active = activeSection === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "12px 16px", border: "none", background: "none",
                    borderBottom: active ? `2px solid ${ACCENT}` : "2px solid transparent",
                    color: active ? ACCENT_TEXT : N_MUTED,
                    fontWeight: active ? 700 : 400,
                    fontSize: "13px", cursor: "pointer", fontFamily: N_FONT,
                    whiteSpace: "nowrap", flexShrink: 0,
                  }}
                >
                  <span>{meta.icon}</span>
                  {meta.label}
                  {count > 0 && (
                    <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "99px", background: active ? ACCENT_LIGHT : "rgba(148,163,184,0.15)", color: active ? ACCENT_TEXT : N_SUBTLE, fontWeight: 700 }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Section content */}
          {activeSection === "outline" && (
            <SectionPanel rows={outlineRows} titleKey="Section" contentKey="Content" bookKey="Book" emptyMsg={SECTION_LABELS.outline.emptyMsg} bookFilter={bookFilter} />
          )}
          {activeSection === "characters" && (
            <SectionPanel rows={allChars} titleKey="Title" subtitleKey="Role" contentKey="Profile" bookKey="Book" emptyMsg={SECTION_LABELS.characters.emptyMsg} bookFilter={bookFilter} />
          )}
          {activeSection === "scenes" && (
            <SectionPanel rows={allScenes} titleKey="Title" subtitleKey="Mode" contentKey="Content" bookKey="Book" emptyMsg={SECTION_LABELS.scenes.emptyMsg} bookFilter={bookFilter} />
          )}
          {activeSection === "covers" && (
            <SectionPanel rows={coverRows} titleKey="Title" contentKey="Content" bookKey="Book" emptyMsg={SECTION_LABELS.covers.emptyMsg} bookFilter={bookFilter} />
          )}
        </div>
      )}
    </div>
  );
}
