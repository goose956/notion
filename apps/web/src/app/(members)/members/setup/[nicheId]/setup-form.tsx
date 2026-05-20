"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { NichePack, OnboardingQuestion } from "@niche-factory/schema";
import { ArrowRight, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

const N_FG = "#37352F";
const N_MUTED = "rgba(55,53,47,0.65)";
const N_SUBTLE = "rgba(55,53,47,0.45)";
const N_BORDER = "rgba(55,53,47,0.09)";
const N_BORDER_MED = "rgba(55,53,47,0.16)";
const N_BLUE = "rgb(35,131,226)";
const N_BLUE_BG = "rgba(35,131,226,0.08)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

/** Extract a 32-char hex Notion page ID from a URL or raw input. */
function extractPageId(input: string): string | null {
  const s = input.trim();
  // Already a UUID with dashes
  const uuid = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(s);
  if (uuid) return uuid[1]!.replace(/-/g, "");
  // 32 bare hex chars
  if (/^[0-9a-f]{32}$/i.test(s)) return s.toLowerCase();
  // URL — last 32 hex chars before optional query string
  const fromUrl = /([0-9a-f]{32})(?:\?.*)?$/i.exec(s);
  if (fromUrl) return fromUrl[1]!.toLowerCase();
  // UUID inside URL
  const uuidUrl = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\?.*)?$/i.exec(s);
  if (uuidUrl) return uuidUrl[1]!.replace(/-/g, "").toLowerCase();
  return null;
}

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

export function SetupForm({ pack }: { pack: NichePack }) {
  const router = useRouter();
  const questions: OnboardingQuestion[] = pack.onboardingQuestions ?? [];

  const [notionUrl, setNotionUrl] = useState("");
  const [answers, setAnswers] = useState<AnswerMap>(() => {
    const init: AnswerMap = {};
    for (const q of questions) {
      init[q.id] = q.type === "multi_select" ? [] : "";
    }
    return init;
  });
  const [status, setStatus] = useState<"idle" | "deploying" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pageId = extractPageId(notionUrl);
  const pageIdValid = pageId !== null;

  function handleAnswerChange(id: string, val: string | string[]) {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pageIdValid) return;

    // Build onboardingAnswers — skip empty optional fields
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

    setStatus("deploying");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pack,
          parentPageId: pageId,
          onboardingAnswers,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Deploy failed (${res.status})`);
      }

      setStatus("done");
      // Brief pause so user sees the success state, then go to chat
      setTimeout(() => {
        router.push(`/members/chat?nicheId=${encodeURIComponent(pack.id)}`);
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Deploy failed");
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
          Set up: {pack.name}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: N_MUTED,
            lineHeight: 1.6,
          }}
        >
          {pack.description}
        </p>
      </div>

      {/* What will be created */}
      <div
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
          This will create in your Notion workspace:
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
      </div>

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
              Workspace created!
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>
              Taking you to the Research Assistant…
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)}>
          {/* Notion page URL */}
          <div style={{ marginBottom: "28px" }}>
            <label
              htmlFor="notion-url"
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: 600,
                color: N_FG,
                marginBottom: "6px",
              }}
            >
              Your Notion page URL{" "}
              <span style={{ color: N_BLUE }}>*</span>
            </label>
            <p
              style={{
                fontSize: "13px",
                color: N_MUTED,
                marginBottom: "8px",
                lineHeight: 1.5,
              }}
            >
              Paste the URL of the Notion page where you want your workspace
              created. Open the page in Notion, click the{" "}
              <strong style={{ color: N_FG }}>Share</strong> button, and copy the
              link.
            </p>
            <input
              id="notion-url"
              type="text"
              value={notionUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setNotionUrl(e.target.value)
              }
              placeholder="https://www.notion.so/My-Research-Workspace-abc123..."
              required
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: "14px",
                color: N_FG,
                background: "white",
                border: `1px solid ${notionUrl && !pageIdValid ? "rgb(220,38,38)" : N_BORDER_MED}`,
                borderRadius: "4px",
                fontFamily: N_FONT,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            {notionUrl && pageIdValid && (
              <p
                style={{
                  fontSize: "12px",
                  color: "rgb(15,123,108)",
                  marginTop: "5px",
                }}
              >
                ✓ Page ID: {pageId}
              </p>
            )}
            {notionUrl && !pageIdValid && (
              <p
                style={{
                  fontSize: "12px",
                  color: "rgb(220,38,38)",
                  marginTop: "5px",
                }}
              >
                Couldn&apos;t find a Notion page ID in that URL. Make sure
                you&apos;re copying the full page link.
              </p>
            )}
            <a
              href="https://www.notion.so/new"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                marginTop: "8px",
                fontSize: "12px",
                color: N_BLUE,
                textDecoration: "none",
              }}
            >
              Create a new Notion page first
              <ExternalLink size={11} />
            </a>
          </div>

          {/* Onboarding questions */}
          {questions.length > 0 && (
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
                Creating your workspace…
              </>
            ) : (
              <>
                Create My Workspace
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
              This usually takes 10–30 seconds. Notion databases are being
              created in your workspace…
            </p>
          )}
        </form>
      )}
    </div>
  );
}
