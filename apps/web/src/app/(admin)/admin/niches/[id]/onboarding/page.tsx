"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingQuestion {
  id: string;
  question: string;
  type: "text" | "number" | "select" | "multi_select" | "date";
  required: boolean;
  hint?: string;
  options?: string[];
}

interface NichePackSnap {
  id: string;
  name: string;
  onboardingQuestions?: OnboardingQuestion[];
  [key: string]: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function blank(): OnboardingQuestion {
  return { id: "", question: "", type: "text", required: true, hint: "", options: [] };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OnboardingQuestionsPage() {
  const params = useParams<{ id: string }>();
  const nicheId = params.id;

  const [pack, setPack] = useState<NichePackSnap | null>(null);
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<OnboardingQuestion>(blank());
  const [addingNew, setAddingNew] = useState(false);
  const [optionInput, setOptionInput] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/niche/${nicheId}`);
        if (!res.ok) throw new Error("Niche not found");
        const data = (await res.json()) as { nichePack: { schemaSnapshot: NichePackSnap } };
        const snap = data.nichePack.schemaSnapshot;
        setPack(snap);
        setQuestions(snap.onboardingQuestions ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [nicheId]);

  async function save(nextQuestions: OnboardingQuestion[]) {
    if (!pack) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/niche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pack, onboardingQuestions: nextQuestions }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "Save failed");
      }
      const data = (await res.json()) as { nichePack: { schemaSnapshot: NichePackSnap } };
      setPack(data.nichePack.schemaSnapshot);
      setQuestions(nextQuestions);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function deleteQuestion(idx: number) {
    const next = questions.filter((_, i) => i !== idx);
    void save(next);
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...questions];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap]!, next[idx]!];
    void save(next);
  }

  function startEdit(idx: number) {
    setEditingIdx(idx);
    setDraft({ ...questions[idx]! });
    setOptionInput("");
    setAddingNew(false);
  }

  function startAdd() {
    setAddingNew(true);
    setEditingIdx(null);
    setDraft(blank());
    setOptionInput("");
  }

  function cancelEdit() {
    setEditingIdx(null);
    setAddingNew(false);
    setDraft(blank());
    setOptionInput("");
  }

  function saveDraft() {
    const id = draft.id.trim() || slugify(draft.question);
    if (!id || !draft.question.trim()) {
      setError("Question text and ID are required.");
      return;
    }
    const hasOptions = draft.type === "select" || draft.type === "multi_select";
    const q: OnboardingQuestion = {
      ...draft,
      id,
      ...(hasOptions ? { options: draft.options ?? [] } : {}),
    };
    let next: OnboardingQuestion[];
    if (addingNew) {
      next = [...questions, q];
    } else {
      next = questions.map((item, i) => (i === editingIdx ? q : item));
    }
    setEditingIdx(null);
    setAddingNew(false);
    setDraft(blank());
    void save(next);
  }

  function addOption() {
    const opt = optionInput.trim();
    if (!opt) return;
    setDraft((prev) => ({ ...prev, options: [...(prev.options ?? []), opt] }));
    setOptionInput("");
  }

  function removeOption(opt: string) {
    setDraft((prev) => ({ ...prev, options: (prev.options ?? []).filter((o) => o !== opt) }));
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-destructive text-sm">{error ?? "Niche not found"}</p>
        <Link href="/admin/niches" className="text-sm underline underline-offset-4 mt-3 inline-block">
          Back to niches
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/admin/niches/${nicheId}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to {pack.name}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Onboarding Questions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          These questions are shown to new users when they sign up for <strong>{pack.name}</strong>.
          Answers are stored as their workspace criteria and used to personalise the AI.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-4 py-3 mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-300 bg-green-50 text-green-800 text-sm px-4 py-3 mb-4">
          Saved successfully.
        </div>
      )}

      {/* Question list */}
      {questions.length === 0 && !addingNew && (
        <div className="rounded-lg border border-dashed p-10 text-center mb-4">
          <p className="text-muted-foreground text-sm">No onboarding questions yet.</p>
          <p className="text-muted-foreground text-xs mt-1">
            Add questions to collect setup details from new users at signup.
          </p>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {questions.map((q, idx) => (
          <div key={q.id}>
            {editingIdx === idx ? (
              <QuestionForm
                draft={draft}
                optionInput={optionInput}
                saving={saving}
                onChange={setDraft}
                onOptionInput={setOptionInput}
                onAddOption={addOption}
                onRemoveOption={removeOption}
                onSave={saveDraft}
                onCancel={cancelEdit}
              />
            ) : (
              <div className="surface-card flex items-start gap-3 px-4 py-3">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{q.question}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono">{q.id}</span>
                    {" · "}
                    {q.type}
                    {q.required ? " · required" : " · optional"}
                    {q.hint ? ` · hint: "${q.hint}"` : ""}
                  </p>
                  {(q.type === "select" || q.type === "multi_select") && q.options && q.options.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Options: {q.options.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0 || saving}
                    className="p-1 rounded hover:bg-muted disabled:opacity-30"
                    title="Move up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === questions.length - 1 || saving}
                    className="p-1 rounded hover:bg-muted disabled:opacity-30"
                    title="Move down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => startEdit(idx)}
                    className="px-2 py-1 rounded text-xs font-medium hover:bg-muted"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { if (confirm("Delete this question?")) deleteQuestion(idx); }}
                    disabled={saving}
                    className="p-1 rounded hover:bg-destructive/10 text-destructive disabled:opacity-30"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {addingNew && (
          <QuestionForm
            draft={draft}
            optionInput={optionInput}
            saving={saving}
            onChange={setDraft}
            onOptionInput={setOptionInput}
            onAddOption={addOption}
            onRemoveOption={removeOption}
            onSave={saveDraft}
            onCancel={cancelEdit}
          />
        )}
      </div>

      {!addingNew && editingIdx === null && (
        <button
          onClick={startAdd}
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium border border-dashed px-4 py-2 hover:bg-muted transition-colors w-full justify-center"
        >
          <Plus className="h-4 w-4" />
          Add question
        </button>
      )}
    </div>
  );
}

// ─── Question form ─────────────────────────────────────────────────────────────

function QuestionForm({
  draft,
  optionInput,
  saving,
  onChange,
  onOptionInput,
  onAddOption,
  onRemoveOption,
  onSave,
  onCancel,
}: {
  draft: OnboardingQuestion;
  optionInput: string;
  saving: boolean;
  onChange: (q: OnboardingQuestion) => void;
  onOptionInput: (v: string) => void;
  onAddOption: () => void;
  onRemoveOption: (opt: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const needsOptions = draft.type === "select" || draft.type === "multi_select";

  return (
    <div className="surface-card p-4 space-y-3 border-primary/40 border">
      {/* Question text */}
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Question *</label>
        <input
          type="text"
          value={draft.question}
          onChange={(e) => onChange({ ...draft, question: e.target.value, id: draft.id || slugify(e.target.value) })}
          placeholder="e.g. What is your YouTube channel URL?"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* ID */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">ID (key) *</label>
          <input
            type="text"
            value={draft.id}
            onChange={(e) => onChange({ ...draft, id: slugify(e.target.value) })}
            placeholder="e.g. channel-url"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">Auto-filled from question. Used as the criteria key.</p>
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Type</label>
          <select
            value={draft.type}
            onChange={(e) => onChange({ ...draft, type: e.target.value as OnboardingQuestion["type"], options: [] })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="select">Select (single)</option>
            <option value="multi_select">Multi-select</option>
            <option value="date">Date</option>
          </select>
        </div>
      </div>

      {/* Hint */}
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Hint / placeholder</label>
        <input
          type="text"
          value={draft.hint ?? ""}
          onChange={(e) => onChange({ ...draft, hint: e.target.value })}
          placeholder="e.g. https://youtube.com/@yourchannel"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Required toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={draft.required}
          onChange={(e) => onChange({ ...draft, required: e.target.checked })}
          className="rounded"
        />
        <span className="text-sm">Required</span>
      </label>

      {/* Options (select / multi_select) */}
      {needsOptions && (
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Options</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={optionInput}
              onChange={(e) => onOptionInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAddOption(); } }}
              placeholder="Add option…"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={onAddOption}
              className="px-3 py-2 rounded-md border text-sm font-medium hover:bg-muted"
            >
              Add
            </button>
          </div>
          {(draft.options ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(draft.options ?? []).map((opt) => (
                <span key={opt} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs">
                  {opt}
                  <button type="button" onClick={() => onRemoveOption(opt)} className="hover:text-destructive">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save question"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
