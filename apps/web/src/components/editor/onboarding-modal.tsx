"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface OnboardingQuestion {
  id: string;
  question: string;
  type: "text" | "number" | "select" | "multi_select" | "boolean";
  options?: string[];
  required?: boolean;
  hint?: string;
}

interface OnboardingModalProps {
  questions: OnboardingQuestion[];
  initialAnswers?: Record<string, unknown>;
  onComplete: (answers: Record<string, string | string[] | boolean | number>) => void;
  onCancel: () => void;
}

export function OnboardingModal({ questions, initialAnswers, onComplete, onCancel }: OnboardingModalProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[] | boolean | number>>(
    (initialAnswers ?? {}) as Record<string, string | string[] | boolean | number>,
  );

  function set(id: string, value: string | string[] | boolean | number) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function toggleMulti(id: string, option: string) {
    const current = (answers[id] as string[] | undefined) ?? [];
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    set(id, next);
  }

  function canSubmit() {
    return questions
      .filter((q) => q.required)
      .every((q) => {
        const v = answers[q.id];
        if (v === undefined || v === "") return false;
        if (Array.isArray(v)) return v.length > 0;
        return true;
      });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-background border shadow-xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Set up your workspace</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Answer a few questions to personalise your niche pack before deploying.
          </p>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {questions.map((q) => (
            <div key={q.id} className="space-y-1.5">
              <Label className="text-sm font-medium">
                {q.question}
                {q.required && <span className="text-destructive ml-1">*</span>}
              </Label>

              {(q.type === "text" || q.type === "number") && (
                <Input
                  type={q.type === "number" ? "number" : "text"}
                  placeholder={q.hint ?? ""}
                  value={(answers[q.id] as string | number | undefined) ?? ""}
                  onChange={(e) =>
                    set(q.id, q.type === "number" ? Number(e.target.value) : e.target.value)
                  }
                />
              )}

              {q.type === "select" && q.options && (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set(q.id, opt)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        answers[q.id] === opt
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted",
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "multi_select" && q.options && (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => {
                    const selected = ((answers[q.id] as string[] | undefined) ?? []).includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleMulti(q.id, opt)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors",
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:bg-muted",
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === "boolean" && (
                <div className="flex gap-3">
                  {["Yes", "No"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set(q.id, opt === "Yes")}
                      className={cn(
                        "rounded-full border px-4 py-1 text-xs transition-colors",
                        answers[q.id] === (opt === "Yes")
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted",
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {q.hint && q.type !== "text" && q.type !== "number" && (
                <p className="text-xs text-muted-foreground">{q.hint}</p>
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!canSubmit()} onClick={() => onComplete(answers)}>
            Deploy workspace
          </Button>
        </div>
      </div>
    </div>
  );
}
