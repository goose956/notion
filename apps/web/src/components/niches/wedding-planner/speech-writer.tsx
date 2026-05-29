"use client";
import { useState, useEffect } from "react";
import { Loader2, WandSparkles } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { DraftPayload } from "./utils";
import { asText, findPropertyName } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
export function WeddingSpeechWriter({
  weddingCriteria,
  onWeddingCriteriaUpdated,
  documentsDb,
  onDocumentSaved,
}: {
  weddingCriteria: Record<string, unknown> | null;
  onWeddingCriteriaUpdated: (criteria: Record<string, unknown>) => void;
  documentsDb: WorkspaceDatabase | null;
  onDocumentSaved: (row: WorkspaceRow) => void;
}) {
  const SPEECH_STATE_KEY = "speech-writer-state-v1";
  const coupleNames = asText(weddingCriteria?.["couple-names"]) ?? "the couple";
  const [whoToThank, setWhoToThank] = useState("");
  const [howTheyMet, setHowTheyMet] = useState("");
  const [whatBrideMeans, setWhatBrideMeans] = useState("");
  const [specialMemory, setSpecialMemory] = useState("");
  const [closingToast, setClosingToast] = useState("");
  const [tone, setTone] = useState("Warm, funny, and heartfelt");
  const [speechLength, setSpeechLength] = useState("5-7 minutes");
  const [extraInstructions, setExtraInstructions] = useState("");

  const [draft, setDraft] = useState<DraftPayload | null>(null);
  const [locked, setLocked] = useState(false);
  const [passwordHash, setPasswordHash] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);

  useEffect(() => {
    const saved = weddingCriteria?.[SPEECH_STATE_KEY];
    if (!saved || typeof saved !== "object") return;
    const state = saved as Record<string, unknown>;

    setWhoToThank(asText(state["whoToThank"]) ?? "Parents, bridal party, and everyone who travelled to be here.");
    setHowTheyMet(asText(state["howTheyMet"]) ?? "");
    setWhatBrideMeans(asText(state["whatBrideMeans"]) ?? "");
    setSpecialMemory(asText(state["specialMemory"]) ?? "");
    setClosingToast(asText(state["closingToast"]) ?? "Please raise a glass to the happy couple.");
    setTone(asText(state["tone"]) ?? "Warm, funny, and heartfelt");
    setSpeechLength(asText(state["speechLength"]) ?? "5-7 minutes");
    setExtraInstructions(asText(state["extraInstructions"]) ?? "");

    const savedDraft = state["draft"];
    if (savedDraft && typeof savedDraft === "object") {
      const draftObj = savedDraft as Record<string, unknown>;
      const body = asText(draftObj["body"]) ?? "";
      if (body) {
        setDraft({
          title: asText(draftObj["title"]) ?? "Wedding Speech Draft",
          subject: asText(draftObj["subject"]) ?? `Wedding speech for ${coupleNames}`,
          body,
          summary: asText(draftObj["summary"]) ?? body.slice(0, 220),
          type: asText(draftObj["type"]) ?? "Speech Draft",
        });
      }
    }

    const lockedValue = state["locked"] === true;
    const hashValue = asText(state["passwordHash"]);
    setLocked(lockedValue && Boolean(hashValue));
    setPasswordHash(hashValue);
    setUnlocked(!(lockedValue && Boolean(hashValue)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weddingCriteria?.[SPEECH_STATE_KEY]]);

  async function hashPassword(value: string): Promise<string> {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function handleUnlock() {
    if (!passwordHash) return;
    const nextHash = await hashPassword(unlockPassword.trim());
    if (nextHash !== passwordHash) {
      setError("Incorrect password.");
      return;
    }
    setUnlocked(true);
    setUnlockPassword("");
    setError(null);
    setSuccess("Speech unlocked.");
  }

  async function generateSpeech() {
    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/members/speech-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coupleNames,
          whoToThank,
          howTheyMet,
          whatBrideMeans,
          specialMemory,
          closingToast,
          tone,
          speechLength,
          extraInstructions,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        draft?: DraftPayload;
        credits?: number | null;
        error?: string;
      };

      if (!res.ok || !body.draft) {
        throw new Error(body.error ?? "Failed to generate speech");
      }

      setDraft(body.draft);
      setCreditsLeft(typeof body.credits === "number" ? body.credits : null);
      setUnlocked(true);
      setSuccess("Speech draft generated. Edit it, then save when you are ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate speech");
    } finally {
      setGenerating(false);
    }
  }

  async function saveSpeechDraft() {
    if (!draft) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let nextHash = passwordHash;
      if (locked) {
        if (!passwordHash) {
          const password = newPassword.trim();
          const confirm = confirmPassword.trim();
          if (!password || password.length < 4) {
            throw new Error("Set a password with at least 4 characters.");
          }
          if (password !== confirm) {
            throw new Error("Password and confirmation do not match.");
          }
          nextHash = await hashPassword(password);
        }
      } else {
        nextHash = null;
      }

      const nextState = {
        whoToThank,
        howTheyMet,
        whatBrideMeans,
        specialMemory,
        closingToast,
        tone,
        speechLength,
        extraInstructions,
        draft: {
          title: draft.title.trim() || "Wedding Speech Draft",
          subject: draft.subject.trim() || `Wedding speech for ${coupleNames}`,
          body: draft.body,
          summary: draft.summary?.trim() || draft.body.slice(0, 240),
          type: "Speech Draft",
        },
        locked: locked && Boolean(nextHash),
        passwordHash: nextHash,
      };

      const payload = {
        ...(weddingCriteria ?? {}),
        [SPEECH_STATE_KEY]: nextState,
      };

      const res = await fetch("/api/members/criteria/wedding-planner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria: payload }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        criteria?: Record<string, unknown>;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to save speech section");
      }

      onWeddingCriteriaUpdated((body.criteria as Record<string, unknown>) ?? payload);
      setPasswordHash(nextHash);
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Speech saved in the Speech section.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save speech draft");
    } finally {
      setSaving(false);
    }
  }

  async function saveToDocuments() {
    if (!draft || !documentsDb) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const properties: Record<string, string | number | boolean | null> = {};
    const propertyTypes: Record<string, string> = {};

    const titleName = findPropertyName(documentsDb.properties, ["Title"]);
    const typeName = findPropertyName(documentsDb.properties, ["Type"]);
    const createdName = findPropertyName(documentsDb.properties, ["Created"]);
    const bodyName = findPropertyName(documentsDb.properties, ["Body", "Content", "Draft"]);
    const summaryName = findPropertyName(documentsDb.properties, ["Summary"]);
    const subjectName = findPropertyName(documentsDb.properties, ["Subject"]);

    if (titleName) { properties[titleName] = draft.title.trim() || "Wedding Speech Draft"; propertyTypes[titleName] = "title"; }
    if (typeName) { properties[typeName] = "Speech Draft"; propertyTypes[typeName] = "select"; }
    if (createdName) { properties[createdName] = new Date().toISOString().slice(0, 10); propertyTypes[createdName] = "date"; }
    if (bodyName) { properties[bodyName] = draft.body; propertyTypes[bodyName] = "rich_text"; }
    if (summaryName) { properties[summaryName] = draft.summary?.trim() || draft.body.slice(0, 240); propertyTypes[summaryName] = "rich_text"; }
    if (subjectName) { properties[subjectName] = draft.subject; propertyTypes[subjectName] = "rich_text"; }

    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: documentsDb.notionId, properties, propertyTypes }),
      });
      const body = (await res.json().catch(() => ({}))) as { pageId?: string; error?: string };
      if (!res.ok || !body.pageId) throw new Error(body.error ?? "Failed to save to Documents");
      onDocumentSaved({ pageId: body.pageId, properties });
      setSuccess("Speech saved to Documents.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save to Documents");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        marginTop: "14px",
        border: `1px solid ${N_BORDER}`,
        borderRadius: "12px",
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${N_BORDER}`, background: "#fff8f1" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#7c2d12" }}>AI Speech Writer</h3>
        <p style={{ margin: "4px 0 0", fontSize: "12px", color: N_MUTED }}>
          Answer a few prompts, generate a first draft, then edit and save progress so you can come back later.
        </p>
      </div>

      <div style={{ padding: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "12px" }}>
        <section style={{ border: `1px solid ${N_BORDER}`, borderRadius: "10px", background: "#fffcf9", padding: "12px", display: "grid", gap: "8px", alignContent: "start" }}>
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "#9a3412", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Speech Planner
          </p>
          <textarea
            value={whoToThank}
            onChange={(e) => setWhoToThank(e.target.value)}
            rows={2}
            placeholder="Who would you like to thank?"
            style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, resize: "vertical" }}
          />
          <textarea
            value={howTheyMet}
            onChange={(e) => setHowTheyMet(e.target.value)}
            rows={2}
            placeholder="Story about the bride/couple and how they met"
            style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, resize: "vertical" }}
          />
          <textarea
            value={whatBrideMeans}
            onChange={(e) => setWhatBrideMeans(e.target.value)}
            rows={2}
            placeholder="What does the bride mean to you?"
            style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, resize: "vertical" }}
          />
          <textarea
            value={specialMemory}
            onChange={(e) => setSpecialMemory(e.target.value)}
            rows={2}
            placeholder="A funny or emotional memory to include"
            style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, resize: "vertical" }}
          />
          <textarea
            value={closingToast}
            onChange={(e) => setClosingToast(e.target.value)}
            rows={2}
            placeholder="How do you want to close the speech?"
            style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, resize: "vertical" }}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <input
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="Tone"
              style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
            />
            <input
              value={speechLength}
              onChange={(e) => setSpeechLength(e.target.value)}
              placeholder="Length"
              style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
            />
          </div>

          <textarea
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
            rows={2}
            placeholder="Anything else to include or avoid"
            style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, resize: "vertical" }}
          />

          <button
            type="button"
            onClick={() => void generateSpeech()}
            disabled={generating}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              height: "36px",
              borderRadius: "8px",
              border: "none",
              background: generating ? "rgba(124,45,18,0.25)" : "linear-gradient(135deg, #7c2d12, #c2410c)",
              color: "white",
              fontSize: "13px",
              fontWeight: 700,
              fontFamily: N_FONT,
              cursor: generating ? "default" : "pointer",
            }}
          >
            {generating ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <WandSparkles size={14} />}
            {generating ? "Generating" : "Generate speech"}
          </button>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: N_FG }}>
            <input
              type="checkbox"
              checked={locked}
              onChange={(e) => {
                const next = e.target.checked;
                setLocked(next);
                if (!next) {
                  setUnlocked(true);
                  setPasswordHash(null);
                  setNewPassword("");
                  setConfirmPassword("");
                  setUnlockPassword("");
                } else {
                  setUnlocked(false);
                }
              }}
            />
            Password protect speech text
          </label>

          {locked && !passwordHash && (
            <div style={{ display: "grid", gap: "6px" }}>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Set password"
                style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
              />
              <p style={{ margin: 0, color: N_MUTED, fontSize: "12px" }}>Password will be required to view/edit speech words in this section.</p>
            </div>
          )}

          {locked && passwordHash && !unlocked && (
            <div style={{ display: "grid", gap: "6px" }}>
              <input
                type="password"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                placeholder="Enter password to view speech"
                style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
              />
              <button
                type="button"
                onClick={() => void handleUnlock()}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${N_BORDER_MED}`,
                  background: "white",
                  color: N_FG,
                  fontSize: "12px",
                  fontWeight: 600,
                  fontFamily: N_FONT,
                  cursor: "pointer",
                }}
              >
                Unlock speech
              </button>
            </div>
          )}

          {locked && passwordHash && unlocked && (
            <button
              type="button"
              onClick={() => {
                setUnlocked(false);
                setUnlockPassword("");
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: `1px solid ${N_BORDER_MED}`,
                background: "white",
                color: N_FG,
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: N_FONT,
                cursor: "pointer",
              }}
            >
              Lock speech now
            </button>
          )}

          {creditsLeft !== null && <p style={{ margin: 0, color: "#166534", fontSize: "12px", fontWeight: 600 }}>Credits remaining: {creditsLeft}</p>}
          {error && <p style={{ margin: 0, color: "rgb(220,38,38)", fontSize: "12px" }}>{error}</p>}
          {success && <p style={{ margin: 0, color: "rgb(21,128,61)", fontSize: "12px" }}>{success}</p>}
        </section>

        <section style={{ border: `1px solid ${N_BORDER}`, borderRadius: "10px", background: "#ffffff", padding: "12px", display: "grid", gap: "8px", alignContent: "start" }}>
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Draft Editor
          </p>

          <p style={{ margin: 0, fontSize: "12px", color: N_MUTED }}>This draft is stored only in the Speech section (not Documents).</p>

          <input
            value={draft?.title ?? ""}
            onChange={(e) => setDraft((prev) => ({
              title: e.target.value,
              subject: prev?.subject ?? `Wedding speech for ${coupleNames}`,
              body: prev?.body ?? "",
              summary: prev?.summary ?? "",
              type: prev?.type ?? "Speech Draft",
            }))}
            placeholder="Title"
            style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
          />

          <input
            value={draft?.subject ?? ""}
            onChange={(e) => setDraft((prev) => ({
              title: prev?.title ?? "Wedding Speech Draft",
              subject: e.target.value,
              body: prev?.body ?? "",
              summary: prev?.summary ?? "",
              type: prev?.type ?? "Speech Draft",
            }))}
            placeholder="Subject"
            style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
          />

          {locked && !unlocked ? (
            <div style={{ padding: "14px", borderRadius: "8px", border: `1px dashed ${N_BORDER_MED}`, background: "#fafafa", fontSize: "13px", color: N_MUTED }}>
              Speech content is locked. Enter password in the left panel to view or edit.
            </div>
          ) : (
            <textarea
              value={draft?.body ?? ""}
              onChange={(e) => setDraft((prev) => ({
                title: prev?.title ?? "Wedding Speech Draft",
                subject: prev?.subject ?? `Wedding speech for ${coupleNames}`,
                body: e.target.value,
                summary: prev?.summary ?? "",
                type: prev?.type ?? "Speech Draft",
              }))}
              placeholder="Your speech draft"
              rows={14}
              style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, lineHeight: 1.5, resize: "vertical" }}
            />
          )}

          <textarea
            value={draft?.summary ?? ""}
            onChange={(e) => setDraft((prev) => ({
              title: prev?.title ?? "Wedding Speech Draft",
              subject: prev?.subject ?? `Wedding speech for ${coupleNames}`,
              body: prev?.body ?? "",
              summary: e.target.value,
              type: prev?.type ?? "Speech Draft",
            }))}
            placeholder="Short summary"
            rows={2}
            style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, resize: "vertical" }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
            {documentsDb && (
              <button
                type="button"
                onClick={() => void saveToDocuments()}
                disabled={saving || !draft?.body?.trim()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  borderRadius: "7px",
                  border: "none",
                  background: saving ? "rgba(124,45,18,0.2)" : "linear-gradient(135deg, #7c2d12, #c2410c)",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 700,
                  fontFamily: N_FONT,
                  cursor: saving ? "default" : "pointer",
                }}
              >
                {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                {saving ? "Saving..." : "Save to Documents"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void saveSpeechDraft()}
              disabled={saving || !draft?.body?.trim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "7px",
                border: `1px solid ${N_BORDER_MED}`,
                background: "white",
                color: "#7c2d12",
                fontSize: "13px",
                fontWeight: 700,
                fontFamily: N_FONT,
                cursor: saving ? "default" : "pointer",
              }}
            >
              {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              {saving ? "Saving..." : "Save Progress"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

