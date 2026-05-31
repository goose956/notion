"use client";
import { useState, useRef } from "react";
import { Loader2, Sparkles, Upload, Image as ImageIcon, X } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const ACCENT = "#e60023";

interface GeneratedCopy {
  title: string;
  description: string;
  tags: string[];
}

export function PinterestCreatePin({
  pinHistoryDb,
  criteria,
  onRowAdded,
}: {
  pinHistoryDb: WorkspaceDatabase | null;
  criteria: Record<string, unknown> | null;
  onRowAdded: (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const [topic, setTopic] = useState("");
  const [imageMode, setImageMode] = useState<"upload" | "generate">("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string>("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("");
  const [copy, setCopy] = useState<GeneratedCopy | null>(null);
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultTopics = criteria?.["topics"] ? String(criteria["topics"]) : "";
  const boardName = criteria?.["board-name"] ? String(criteria["board-name"]) : "your board";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadedPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setGeneratedImageUrl("");
  }

  function clearImage() {
    setUploadedFile(null);
    setUploadedPreview("");
    setGeneratedImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function generateCopy() {
    if (!topic.trim()) return;
    setGeneratingCopy(true);
    setError(null);
    try {
      const res = await fetch("/api/members/pinterest-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), context: defaultTopics }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as GeneratedCopy;
      setCopy(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGeneratingCopy(false);
    }
  }

  async function generateImage() {
    if (!topic.trim()) return;
    setGeneratingImage(true);
    setError(null);
    try {
      const res = await fetch("/api/members/pinterest-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), title: copy?.title }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as { url: string };
      setGeneratedImageUrl(data.url);
      setUploadedFile(null);
      setUploadedPreview("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setGeneratingImage(false);
    }
  }

  async function postPin() {
    if (!copy || (!uploadedPreview && !generatedImageUrl)) return;
    setPosting(true);
    setError(null);
    setSuccess(null);
    try {
      const imageSource = uploadedPreview || generatedImageUrl;
      const res = await fetch("/api/members/pinterest-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: copy.title,
          description: copy.description,
          tags: copy.tags,
          topic: topic.trim(),
          imageSource,
          isBase64: !!uploadedPreview,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as { pinId?: string; pinUrl?: string; imageUrl?: string };

      // Save to pin history
      if (pinHistoryDb) {
        const saveRes = await fetch("/api/members/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            databaseId: pinHistoryDb.notionId,
            properties: {
              "Title":       copy.title,
              "Description": copy.description,
              "Tags":        copy.tags.join(", "),
              "Board":       boardName,
              "Image URL":   data.imageUrl ?? generatedImageUrl ?? "",
              "Pin URL":     data.pinUrl ?? "",
              "Status":      "Posted",
              "Topic":       topic.trim(),
              "Date":        new Date().toISOString().split("T")[0],
            },
            propertyTypes: {
              "Title": "title", "Description": "rich_text", "Tags": "rich_text",
              "Board": "rich_text", "Image URL": "url", "Pin URL": "url",
              "Status": "select", "Topic": "rich_text", "Date": "rich_text",
            },
          }),
        });
        if (saveRes.ok) {
          const saved = await saveRes.json() as { pageId?: string };
          if (saved.pageId) {
            onRowAdded(pinHistoryDb.notionId, {
              pageId: saved.pageId,
              properties: {
                "Title": copy.title, "Description": copy.description,
                "Tags": copy.tags.join(", "), "Board": boardName,
                "Image URL": data.imageUrl ?? "", "Pin URL": data.pinUrl ?? "",
                "Status": "Posted", "Topic": topic.trim(),
                "Date": new Date().toISOString().split("T")[0] ?? "",
              },
            });
          }
        }
      }

      setSuccess(`✓ Pin posted!${data.pinUrl ? " " : ""}`);
      if (data.pinUrl) setSuccess(`✓ Pin posted! `);
      // Reset form
      setTopic("");
      setCopy(null);
      clearImage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post pin");
    } finally {
      setPosting(false);
    }
  }

  const hasImage = !!(uploadedPreview || generatedImageUrl);
  const canPost = !!copy && hasImage;

  return (
    <div style={{ maxWidth: "720px", fontFamily: N_FONT }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800, color: N_FG }}>Create Pin</h1>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          Describe your pin topic, generate the copy, add an image, and post directly to <strong>{boardName}</strong>.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Left — inputs */}
        <div>
          {/* Topic */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: N_FG, marginBottom: "6px" }}>
              Pin topic
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={`e.g. 5 minimalist desk setups for small spaces${defaultTopics ? `\n\nYour niches: ${defaultTopics}` : ""}`}
              rows={3}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "10px 12px", borderRadius: "6px",
                border: `1px solid ${N_BORDER}`, fontSize: "13px",
                color: N_FG, fontFamily: N_FONT, resize: "vertical", lineHeight: 1.6,
              }}
            />
          </div>

          <button
            onClick={() => void generateCopy()}
            disabled={generatingCopy || !topic.trim()}
            style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              padding: "9px 20px", borderRadius: "6px", border: "none",
              background: generatingCopy || !topic.trim() ? "rgba(55,53,47,0.12)" : ACCENT,
              color: generatingCopy || !topic.trim() ? N_MUTED : "white",
              fontSize: "13px", fontWeight: 600, cursor: generatingCopy || !topic.trim() ? "default" : "pointer",
              fontFamily: N_FONT, marginBottom: "20px", width: "100%", justifyContent: "center",
            }}
          >
            {generatingCopy
              ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Generating copy…</>
              : <><Sparkles size={14} /> Generate pin copy</>
            }
          </button>

          {/* Generated copy */}
          {copy && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Title</label>
                <input
                  value={copy.title}
                  onChange={(e) => setCopy({ ...copy, title: e.target.value })}
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT }}
                />
                <p style={{ margin: "3px 0 0", fontSize: "11px", color: copy.title.length > 100 ? "#dc2626" : N_SUBTLE }}>{copy.title.length}/100</p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Description</label>
                <textarea
                  value={copy.description}
                  onChange={(e) => setCopy({ ...copy, description: e.target.value })}
                  rows={4}
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, resize: "vertical" }}
                />
                <p style={{ margin: "3px 0 0", fontSize: "11px", color: copy.description.length > 500 ? "#dc2626" : N_SUBTLE }}>{copy.description.length}/500</p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: N_SUBTLE, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Tags</label>
                <input
                  value={copy.tags.join(", ")}
                  onChange={(e) => setCopy({ ...copy, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right — image */}
        <div>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: N_FG, marginBottom: "8px" }}>Image</label>
            <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
              {(["upload", "generate"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setImageMode(mode); clearImage(); }}
                  style={{
                    flex: 1, padding: "7px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                    border: `1px solid ${imageMode === mode ? ACCENT : N_BORDER_MED}`,
                    background: imageMode === mode ? "rgba(230,0,35,0.06)" : "white",
                    color: imageMode === mode ? ACCENT : N_SUBTLE,
                    cursor: "pointer", fontFamily: N_FONT,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                  }}
                >
                  {mode === "upload" ? <><Upload size={12} /> Upload</> : <><ImageIcon size={12} /> Generate</>}
                </button>
              ))}
            </div>
          </div>

          {/* Image preview / input */}
          {hasImage ? (
            <div style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedPreview || generatedImageUrl}
                alt="Pin preview"
                style={{ width: "100%", borderRadius: "8px", objectFit: "cover", maxHeight: "280px" }}
              />
              <button
                onClick={clearImage}
                style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <X size={13} color="white" />
              </button>
            </div>
          ) : imageMode === "upload" ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${N_BORDER_MED}`, borderRadius: "8px",
                padding: "40px 20px", textAlign: "center", cursor: "pointer",
                background: "rgba(55,53,47,0.02)",
              }}
            >
              <Upload size={24} style={{ color: N_SUBTLE, margin: "0 auto 8px" }} />
              <p style={{ margin: "0 0 4px", fontSize: "13px", color: N_FG, fontWeight: 500 }}>Click to upload</p>
              <p style={{ margin: 0, fontSize: "11px", color: N_SUBTLE }}>JPG, PNG, WebP — recommended 1000×1500px</p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ border: `2px dashed ${N_BORDER_MED}`, borderRadius: "8px", padding: "40px 20px", textAlign: "center", background: "rgba(55,53,47,0.02)" }}>
                <ImageIcon size={24} style={{ color: N_SUBTLE, margin: "0 auto 8px" }} />
                <p style={{ margin: 0, fontSize: "12px", color: N_SUBTLE }}>Generate a Pinterest-style image with AI</p>
              </div>
              <button
                onClick={() => void generateImage()}
                disabled={generatingImage || !topic.trim()}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "7px",
                  padding: "9px 16px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`,
                  background: generatingImage || !topic.trim() ? "rgba(55,53,47,0.06)" : "white",
                  color: generatingImage || !topic.trim() ? N_SUBTLE : N_FG,
                  fontSize: "13px", fontWeight: 500, cursor: generatingImage || !topic.trim() ? "default" : "pointer",
                  fontFamily: N_FONT, justifyContent: "center",
                }}
              >
                {generatingImage
                  ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Generating…</>
                  : <><Sparkles size={13} /> Generate image</>
                }
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error / success */}
      {error && (
        <div style={{ marginTop: "16px", padding: "10px 14px", borderRadius: "6px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", fontSize: "13px", color: "#b91c1c" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ marginTop: "16px", padding: "10px 14px", borderRadius: "6px", background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.2)", fontSize: "13px", color: "#15803d" }}>
          {success}
        </div>
      )}

      {/* Post button */}
      <button
        onClick={() => void postPin()}
        disabled={!canPost || posting}
        style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "11px 28px", borderRadius: "6px", border: "none",
          background: !canPost || posting ? "rgba(55,53,47,0.12)" : ACCENT,
          color: !canPost || posting ? N_MUTED : "white",
          fontSize: "14px", fontWeight: 700,
          cursor: !canPost || posting ? "default" : "pointer",
          fontFamily: N_FONT, marginTop: "20px",
        }}
      >
        {posting
          ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Posting…</>
          : "📌 Post to Pinterest"
        }
      </button>
      {!canPost && !posting && (
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: N_SUBTLE }}>
          {!copy ? "Generate copy first" : "Add an image to post"}
        </p>
      )}
    </div>
  );
}
