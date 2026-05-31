"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { NichePack, OnboardingQuestion } from "@niche-factory/schema";
import type { NotionPageResult } from "@/app/api/members/notion-pages/route";
import { ArrowRight, CheckCircle2, ExternalLink, Loader2, Search, ChevronDown, X } from "lucide-react";

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_BORDER_MED = "rgba(55,53,47,0.16)";
const N_BLUE = "rgb(35,131,226)";
const N_BLUE_BG = "rgba(35,131,226,0.08)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

function fieldLabel(q: OnboardingQuestion) {
  return (
    <label
      key={q.id + "-label"}
      htmlFor={q.id}
      style={{
        display: "block",
        fontSize: "14px",
        fontWeight: 500,
        color: N_FG,
        marginBottom: "6px",
      }}
    >
      {q.question}
      {q.required && (
        <span style={{ color: N_BLUE, marginLeft: "3px" }}>*</span>
      )}
    </label>
  );
}

function QuestionField({
  q,
  value,
  onChange,
}: {
  q: OnboardingQuestion;
  value: string | string[];
  onChange: (id: string, val: string | string[]) => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "7px 10px",
    fontSize: "14px",
    color: N_FG,
    background: "white",
    border: `1px solid ${N_BORDER_MED}`,
    borderRadius: "4px",
    fontFamily: N_FONT,
    boxSizing: "border-box",
    outline: "none",
  };

  if (q.type === "text") {
    return (
      <div style={{ marginBottom: "20px" }}>
        {fieldLabel(q)}
        {q.hint && (
          <p style={{ fontSize: "12px", color: N_SUBTLE, marginBottom: "6px" }}>
            {q.hint}
          </p>
        )}
        <input
          id={q.id}
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(q.id, e.target.value)
          }
          placeholder={q.hint}
          style={inputStyle}
          required={q.required}
        />
      </div>
    );
  }

  if (q.type === "number") {
    return (
      <div style={{ marginBottom: "20px" }}>
        {fieldLabel(q)}
        {q.hint && (
          <p style={{ fontSize: "12px", color: N_SUBTLE, marginBottom: "6px" }}>
            {q.hint}
          </p>
        )}
        <input
          id={q.id}
          type="number"
          value={typeof value === "string" ? value : ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(q.id, e.target.value)
          }
          placeholder={q.hint}
          style={inputStyle}
          required={q.required}
        />
      </div>
    );
  }

  if (q.type === "select") {
    return (
      <div style={{ marginBottom: "20px" }}>
        {fieldLabel(q)}
        <select
          id={q.id}
          value={typeof value === "string" ? value : ""}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            onChange(q.id, e.target.value)
          }
          style={{ ...inputStyle, appearance: "auto" }}
          required={q.required}
        >
          <option value="">— Select —</option>
          {(q.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (q.type === "multi_select") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div style={{ marginBottom: "20px" }}>
        {fieldLabel(q)}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "4px",
          }}
        >
          {(q.options ?? []).map((opt) => {
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const next = active
                    ? selected.filter((s) => s !== opt)
                    : [...selected, opt];
                  onChange(q.id, next);
                }}
                style={{
                  padding: "5px 12px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: N_FONT,
                  border: `1px solid ${active ? N_BLUE : N_BORDER_MED}`,
                  background: active ? N_BLUE_BG : "white",
                  color: active ? N_BLUE : N_FG,
                  transition: "all 0.1s ease",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (q.type === "boolean") {
    const checked = value === "true";
    return (
      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "14px",
            color: N_FG,
            cursor: "pointer",
          }}
        >
          <input
            id={q.id}
            type="checkbox"
            checked={checked}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChange(q.id, e.target.checked ? "true" : "false")
            }
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          {q.question}
        </label>
        {q.hint && (
          <p
            style={{
              fontSize: "12px",
              color: N_SUBTLE,
              marginTop: "4px",
              paddingLeft: "26px",
            }}
          >
            {q.hint}
          </p>
        )}
      </div>
    );
  }

  return null;
}

type AnswerMap = Record<string, string | string[]>;

export function SetupForm({ pack, isInApp = false, criteriaOnly = false, nicheId }: { pack: NichePack; isInApp?: boolean; criteriaOnly?: boolean; nicheId?: string }) {
  const router = useRouter();
  const questions: OnboardingQuestion[] = pack.onboardingQuestions ?? [];

  // Page picker state
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPages, setPickerPages] = useState<NotionPageResult[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedPage, setSelectedPage] = useState<NotionPageResult | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Search Notion pages as user types
  const searchPages = useCallback(async (q: string) => {
    setPickerLoading(true);
    try {
      const res = await fetch(`/api/members/notion-pages?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { pages?: NotionPageResult[]; error?: string };
      setPickerPages(data.pages ?? []);
    } catch {
      setPickerPages([]);
    } finally {
      setPickerLoading(false);
    }
  }, []);

  // Load all pages on first open
  useEffect(() => {
    if (pickerOpen) {
      void searchPages(pickerQuery);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen]);

  // Debounce search as user types
  useEffect(() => {
    if (!pickerOpen) return;
    const t = setTimeout(() => void searchPages(pickerQuery), 300);
    return () => clearTimeout(t);
  }, [pickerQuery, pickerOpen, searchPages]);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const [answers, setAnswers] = useState<AnswerMap>(() => {
    const init: AnswerMap = {};
    for (const q of questions) {
      init[q.id] = q.type === "multi_select" ? [] : "";
    }
    return init;
  });
  const [status, setStatus] = useState<"idle" | "deploying" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pageId = selectedPage?.id.replace(/-/g, "") ?? null;
  // In-app deploys don't require a Notion page selection
  const pageIdValid = isInApp || pageId !== null;

  function handleAnswerChange(id: string, val: string | string[]) {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }

  function buildAnswers() {
    const onboardingAnswers: Record<string, unknown> = {};
    for (const q of questions) {
      const val = answers[q.id];
      if (val === undefined) continue;
      if (typeof val === "string" && val.trim() === "" && !q.required) continue;
      if (Array.isArray(val) && val.length === 0 && !q.required) continue;
      onboardingAnswers[q.id] =
        q.type === "number" && typeof val === "string"
          ? parseFloat(val) || val
          : val;
    }
    return onboardingAnswers;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pageIdValid) return;

    const onboardingAnswers = buildAnswers();
    setStatus("deploying");
    setErrorMsg(null);

    try {
      // Criteria-only mode: workspace already exists, just save the answers.
      if (criteriaOnly) {
        const id = nicheId ?? pack.id;
        const res = await fetch("/api/members/criteria", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nicheId: id, answers: onboardingAnswers }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        setStatus("done");
        setTimeout(() => {
          router.push(`/members/workspace?nicheId=${encodeURIComponent(id)}`);
        }, 1000);
        return;
      }

      // Full deploy mode: create workspace + save criteria.
      const deployBody: Record<string, unknown> = { pack, onboardingAnswers };
      if (!isInApp && pageId) {
        deployBody["parentPageId"] = pageId;
      }

      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deployBody),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Deploy failed (${res.status})`);
      }

      setStatus("done");
      setTimeout(() => {
        router.push(`/members/chat?nicheId=${encodeURIComponent(pack.id)}`);
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div
      style={{
        padding: "40px 60px",
        maxWidth: "680px",
        fontFamily: N_FONT,
        color: N_FG,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <p
          style={{
            margin: "0 0 6px",
            fontSize: "12px",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: N_SUBTLE,
          }}
        >
          Workspace setup
        </p>
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "26px",
            fontWeight: 700,
            color: N_FG,
            lineHeight: 1.2,
          }}
        >
          {criteriaOnly ? "Complete your setup" : `Set up: ${pack.name}`}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: N_MUTED,
            lineHeight: 1.6,
          }}
        >
          {criteriaOnly
            ? "Answer a few quick questions so the AI can give you relevant, personalised results."
            : pack.description}
        </p>
      </div>

      {/* What will be created — hidden in criteria-only mode */}
      {!criteriaOnly && <div
        style={{
          marginBottom: "32px",
          padding: "16px 18px",
          borderRadius: "6px",
          background: "#F7F6F3",
          border: `1px solid ${N_BORDER}`,
        }}
      >
        <p
          style={{
            margin: "0 0 10px",
            fontSize: "12px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: N_SUBTLE,
          }}
        >
          {isInApp ? "This will create in your workspace:" : "This will create in your Notion workspace:"}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {pack.databases.map((db) => (
            <div
              key={db.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                color: N_FG,
              }}
            >
              <span style={{ fontSize: "16px" }}>{db.icon ?? "📋"}</span>
              <span style={{ fontWeight: 500 }}>{db.name}</span>
              {db.description && (
                <span style={{ color: N_MUTED, fontSize: "13px" }}>
                  — {db.description}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>}

      {status === "done" ? (
        <div
          style={{
            padding: "24px",
            borderRadius: "6px",
            background: "rgba(15,123,108,0.06)",
            border: "1px solid rgba(15,123,108,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <CheckCircle2 size={28} color="rgb(15,123,108)" />
          <div>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: "16px",
                fontWeight: 600,
                color: N_FG,
              }}
            >
              {criteriaOnly ? "All set!" : "Workspace created!"}
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
              {criteriaOnly ? "Taking you to your workspace…" : "Taking you to the Research Assistant…"}
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)}>
          {/* Notion page picker — shown only for Notion users */}
          {!isInApp && <div style={{ marginBottom: "28px", position: "relative" }} ref={pickerRef}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 600,
                color: N_FG,
                marginBottom: "6px",
              }}
            >
              Choose a Notion page{" "}
              <span style={{ color: N_BLUE }}>*</span>
            </label>
            <p style={{ fontSize: "13px", color: N_MUTED, marginBottom: "10px", lineHeight: 1.5 }}>
              Pick which page in your Notion workspace to add the databases to.
              Don&apos;t have one yet?{" "}
              <a
                href="https://www.notion.so/new"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: N_BLUE, textDecoration: "none" }}
              >
                Create a page in Notion
                <ExternalLink size={10} style={{ marginLeft: "3px", verticalAlign: "middle" }} />
              </a>
              {" "}then come back and it will appear below.
            </p>

            {/* Trigger button */}
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 12px",
                fontSize: "14px",
                color: selectedPage ? N_FG : N_SUBTLE,
                background: "white",
                border: `1px solid ${N_BORDER_MED}`,
                borderRadius: "4px",
                fontFamily: N_FONT,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {selectedPage ? (
                <>
                  <span style={{ fontSize: "16px", flexShrink: 0 }}>{selectedPage.icon ?? "📄"}</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedPage.title}
                  </span>
                  <X
                    size={14}
                    style={{ color: N_SUBTLE, flexShrink: 0 }}
                    onClick={(e) => { e.stopPropagation(); setSelectedPage(null); setPickerOpen(false); }}
                  />
                </>
              ) : (
                <>
                  <Search size={14} style={{ flexShrink: 0 }} />
                  <span>Search your Notion pages…</span>
                  <ChevronDown size={14} style={{ marginLeft: "auto", flexShrink: 0 }} />
                </>
              )}
            </button>

            {/* Dropdown */}
            {pickerOpen && (
              <div
                style={{
                  position: "absolute",
                  zIndex: 50,
                  marginTop: "4px",
                  width: "min(520px, calc(100vw - 48px))",
                  background: "white",
                  border: `1px solid ${N_BORDER_MED}`,
                  borderRadius: "6px",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                  overflow: "hidden",
                }}
              >
                {/* Search input */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    borderBottom: `1px solid ${N_BORDER}`,
                  }}
                >
                  <Search size={14} style={{ color: N_SUBTLE, flexShrink: 0 }} />
                  <input
                    ref={searchRef}
                    type="text"
                    value={pickerQuery}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPickerQuery(e.target.value)}
                    placeholder="Search pages…"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      fontSize: "14px",
                      color: N_FG,
                      fontFamily: N_FONT,
                      background: "transparent",
                    }}
                  />
                  {pickerLoading && <Loader2 size={13} style={{ color: N_SUBTLE, animation: "spin 1s linear infinite", flexShrink: 0 }} />}
                </div>

                {/* Results */}
                <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                  {!pickerLoading && pickerPages.length === 0 && (
                    <div style={{ padding: "20px 16px", textAlign: "center" }}>
                      <p style={{ fontSize: "13px", color: N_MUTED, margin: "0 0 8px" }}>
                        {pickerQuery ? "No pages found" : "No pages in your workspace yet"}
                      </p>
                      <a
                        href="https://www.notion.so/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "13px", color: N_BLUE, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        Create a new page in Notion
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                  {pickerPages.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => { setSelectedPage(page); setPickerOpen(false); setPickerQuery(""); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "8px 14px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: N_FONT,
                        textAlign: "left",
                      }}
                      className="hover:bg-[rgba(55,53,47,0.06)]"
                    >
                      <span style={{ fontSize: "17px", flexShrink: 0, width: "22px", textAlign: "center" }}>{page.icon ?? "📄"}</span>
                      <span style={{ fontSize: "14px", color: N_FG, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {page.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>}

          {/* Onboarding questions — shown for in-app flow only; Notion deploy skips them */}
          {isInApp && questions.length > 0 && (
            <>
              <div
                style={{
                  height: "1px",
                  background: N_BORDER,
                  margin: "0 0 24px",
                }}
              />
              <h2
                style={{
                  margin: "0 0 18px",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: N_FG,
                }}
              >
                Tell us about your setup
              </h2>
              {questions.map((q) => (
                <QuestionField
                  key={q.id}
                  q={q}
                  value={answers[q.id] ?? (q.type === "multi_select" ? [] : "")}
                  onChange={handleAnswerChange}
                />
              ))}
            </>
          )}

          {/* Error */}
          {status === "error" && errorMsg && (
            <div
              style={{
                marginBottom: "16px",
                padding: "10px 14px",
                borderRadius: "4px",
                background: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.2)",
                fontSize: "13px",
                color: "rgb(220,38,38)",
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!pageIdValid || status === "deploying"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              borderRadius: "5px",
              border: "none",
              cursor: !pageIdValid || status === "deploying" ? "default" : "pointer",
              background: !pageIdValid || status === "deploying"
                ? "rgba(55,53,47,0.12)"
                : N_FG,
              color: !pageIdValid || status === "deploying" ? N_MUTED : "white",
              fontSize: "15px",
              fontWeight: 600,
              fontFamily: N_FONT,
              transition: "background 0.1s ease",
            }}
          >
            {status === "deploying" ? (
              <>
                <Loader2
                  size={16}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                {criteriaOnly ? "Saving…" : "Creating your workspace…"}
              </>
            ) : (
              <>
                {criteriaOnly ? "Save & Continue" : "Create My Workspace"}
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {status === "deploying" && (
            <p
              style={{
                marginTop: "10px",
                fontSize: "13px",
                color: N_MUTED,
                lineHeight: 1.5,
              }}
            >
              {isInApp
                ? "Setting up your workspace…"
                : "This usually takes 10–30 seconds. Notion databases are being created in your workspace…"}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
