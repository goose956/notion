"use client";

import { useState } from "react";
import { Coins } from "lucide-react";

export function CreditsEditor({ email, initialCredits }: { email: string; initialCredits: number }) {
  const [credits, setCredits] = useState(initialCredits);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(initialCredits));
  const [saving, setSaving] = useState(false);

  async function save() {
    const val = parseInt(draft, 10);
    if (isNaN(val) || val < 0) return;
    setSaving(true);
    const res = await fetch("/api/admin/credits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, credits: val }),
    });
    if (res.ok) {
      setCredits(val);
      setEditing(false);
    }
    setSaving(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          className="w-16 text-xs border rounded px-1.5 py-0.5 text-center font-mono"
          autoFocus
        />
        <button
          onClick={save}
          disabled={saving}
          className="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
        >
          {saving ? "…" : "Save"}
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(String(credits)); setEditing(true); }}
      className="flex items-center gap-1 text-xs font-medium hover:text-primary transition-colors group"
      title="Click to edit credits"
    >
      <Coins className="h-3 w-3 text-amber-500" />
      <span className={credits === 0 ? "text-red-500" : credits <= 5 ? "text-amber-600" : "text-foreground"}>
        {credits}
      </span>
      <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">edit</span>
    </button>
  );
}
