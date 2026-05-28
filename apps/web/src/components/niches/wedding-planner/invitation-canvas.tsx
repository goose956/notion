"use client";
import { useState, useEffect, useRef } from "react";
import { Loader2, WandSparkles, Download, Palette } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { asText, findPropertyName } from "./utils";
export function WeddingInvitationCanvas({
  weddingCriteria,
  documentsDb,
  onDocumentSaved,
}: {
  weddingCriteria: Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onDocumentSaved: (row: WorkspaceRow) => void;
}) {
  const [userPrompt, setUserPrompt] = useState("Create a romantic floral invitation with soft watercolor accents.");
  const [style, setStyle] = useState(asText(weddingCriteria?.["invitation-style"]) ?? "Romantic");
  const [colours, setColours] = useState(asText(weddingCriteria?.["invitation-colours"]) ?? "Blush pink, sage green, ivory");
  const [mode, setMode] = useState<"invitation" | "thank-you">("invitation");
  const [canvasSize, setCanvasSize] = useState<"a5-portrait" | "five-by-seven" | "square-social">("a5-portrait");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invitationText, setInvitationText] = useState("");
  const [thankYouText, setThankYouText] = useState("");
  const [palette, setPalette] = useState<string[]>([]);
  const [svgMarkup, setSvgMarkup] = useState<string>("");
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);
  const [chatLog, setChatLog] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const coupleNames = asText(weddingCriteria?.["couple-names"]) ?? "Couple Names";
  const weddingDate = asText(weddingCriteria?.["wedding-date"]) ?? "Wedding Date";
  const venue = asText(weddingCriteria?.["wedding-location"]) ?? "Wedding Venue";
  const [namesField, setNamesField] = useState(coupleNames);
  const [dateField, setDateField] = useState(weddingDate);
  const [venueField, setVenueField] = useState(venue);

  useEffect(() => {
    setNamesField(coupleNames);
    setDateField(weddingDate);
    setVenueField(venue);
  }, [coupleNames, weddingDate, venue]);

  const canvasDimensions: Record<"a5-portrait" | "five-by-seven" | "square-social", { width: number; height: number; label: string }> = {
    "a5-portrait": { width: 1200, height: 1800, label: "A5 Portrait" },
    "five-by-seven": { width: 1400, height: 1960, label: "5x7 Card" },
    "square-social": { width: 1400, height: 1400, label: "Square Social" },
  };
  const activeSize = canvasDimensions[canvasSize];

  useEffect(() => {
    if (!svgMarkup) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
    img.onload = () => {
      canvas.width = activeSize.width;
      canvas.height = activeSize.height;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.onerror = () => {
      setError("Generated artwork could not be rendered. Please try again.");
    };
    img.src = svgUrl;
  }, [activeSize.height, activeSize.width, svgMarkup]);

  async function saveGeneratedDesignToDocuments(
    invitation: string,
    thankYou: string,
    svg: string,
    generationPrompt: string,
  ): Promise<void> {
    if (!documentsDb) return;

    const properties: Record<string, string | number | boolean | null> = {};
    const propertyTypes: Record<string, string> = {};

    const titleName = findPropertyName(documentsDb.properties, ["Title"]);
    const typeName = findPropertyName(documentsDb.properties, ["Type"]);
    const createdName = findPropertyName(documentsDb.properties, ["Created"]);
    const recipientName = findPropertyName(documentsDb.properties, ["Recipient"]);
    const summaryName = findPropertyName(documentsDb.properties, ["Summary"]);
    const subjectName = findPropertyName(documentsDb.properties, ["Subject", "Email Subject"]);
    const bodyName = findPropertyName(documentsDb.properties, ["Body", "Content", "Draft", "Email Body"]);

    if (titleName) {
      properties[titleName] = `${mode === "thank-you" ? "Thank You" : "Invitation"} Design - ${new Date().toLocaleDateString()}`;
      propertyTypes[titleName] = "title";
    }
    if (typeName) {
      properties[typeName] = mode === "thank-you" ? "Thank You Design" : "Invitation Design";
      propertyTypes[typeName] = "select";
    }
    if (createdName) {
      properties[createdName] = new Date().toISOString().slice(0, 10);
      propertyTypes[createdName] = "date";
    }
    if (recipientName) {
      properties[recipientName] = namesField;
      propertyTypes[recipientName] = "rich_text";
    }
    if (subjectName) {
      properties[subjectName] = `${mode === "thank-you" ? "Thank You" : "Invitation"} | ${namesField}`;
      propertyTypes[subjectName] = "rich_text";
    }
    if (summaryName) {
      properties[summaryName] = `Names: ${namesField}. Date: ${dateField}. Venue: ${venueField}. Style: ${style}. Colours: ${colours}. Size: ${activeSize.label}. Prompt: ${generationPrompt}`;
      propertyTypes[summaryName] = "rich_text";
    }
    if (bodyName) {
      const lines = [
        "Invitation copy:",
        invitation || "",
        "",
        "Thank-you copy:",
        thankYou || "",
        "",
        "SVG asset:",
        svg,
      ];
      properties[bodyName] = lines.join("\n").trim();
      propertyTypes[bodyName] = "rich_text";
    }

    const res = await fetch("/api/members/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        databaseId: documentsDb.notionId,
        properties,
        propertyTypes,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { pageId?: string; error?: string };
    if (!res.ok || !body.pageId) {
      throw new Error(body.error ?? "Failed to auto-save generated design");
    }
    onDocumentSaved({ pageId: body.pageId, properties });
  }

  async function generateDesign() {
    const prompt = userPrompt.trim();
    if (!prompt) return;

    setGenerating(true);
    setError(null);
    setSuccess(null);
    setChatLog((prev) => [...prev, { role: "user", content: prompt }]);

    try {
      const res = await fetch("/api/members/invitation-canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          style,
          colours,
          mode,
          canvasSize,
          coupleNames: namesField.trim() || "Couple Names",
          weddingDate: dateField.trim() || "Wedding Date",
          venue: venueField.trim() || "Wedding Venue",
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        invitationText?: string;
        thankYouText?: string;
        colorPalette?: string[];
        svg?: string;
        credits?: number | null;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate invitation design");
      }

      const nextInvitation = data.invitationText ?? "";
      const nextThankYou = data.thankYouText ?? "";
      const nextSvg = data.svg ?? "";

      setInvitationText(nextInvitation);
      setThankYouText(nextThankYou);
      setPalette(Array.isArray(data.colorPalette) ? data.colorPalette : []);
      setSvgMarkup(nextSvg);
      setCreditsLeft(typeof data.credits === "number" ? data.credits : null);

      await saveGeneratedDesignToDocuments(nextInvitation, nextThankYou, nextSvg, prompt);
      setSuccess("Design generated and saved to Documents.");

      setChatLog((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Design generated and saved. You can now export the canvas as an image.",
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function exportCanvasPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "wedding-invitation-design.png";
    a.click();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) 1fr", gap: "14px" }}>
      <section
        style={{
          border: `1px solid ${N_BORDER}`,
          borderRadius: "12px",
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minHeight: "520px",
        }}
      >
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${N_BORDER}`, background: "#fff7fb" }}>
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#9d174d" }}>Invitation Assistant</h3>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: N_MUTED }}>Fill in names, date, and venue, then describe your preferred look. Cost: 5 credits.</p>
        </div>

        <div style={{ padding: "12px 14px", display: "grid", gap: "8px", borderBottom: `1px solid ${N_BORDER}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "invitation" | "thank-you")}
              style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, background: "white" }}
            >
              <option value="invitation">Invitation</option>
              <option value="thank-you">Thank You</option>
            </select>
            <input
              value={namesField}
              onChange={(e) => setNamesField(e.target.value)}
              placeholder="Names (e.g. Olivia & James)"
              style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
            />
            <select
              value={canvasSize}
              onChange={(e) => setCanvasSize(e.target.value as "a5-portrait" | "five-by-seven" | "square-social")}
              style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, background: "white" }}
            >
              <option value="a5-portrait">A5 Portrait</option>
              <option value="five-by-seven">5x7 Card</option>
              <option value="square-social">Square Social</option>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <input
              value={dateField}
              onChange={(e) => setDateField(e.target.value)}
              placeholder="Date (e.g. Saturday, 14 June 2026)"
              style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
            />
            <input
              value={venueField}
              onChange={(e) => setVenueField(e.target.value)}
              placeholder="Venue (e.g. The Barn, Cotswolds)"
              style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
            />
          </div>
          <input
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="Style (e.g. romantic, modern, minimalist)"
            style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
          />
          <input
            value={colours}
            onChange={(e) => setColours(e.target.value)}
            placeholder="Colours (e.g. blush, ivory, sage)"
            style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT }}
          />
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={4}
            placeholder="What should this invitation feel like?"
            style={{ padding: "8px 10px", borderRadius: "6px", border: `1px solid ${N_BORDER_MED}`, fontSize: "13px", fontFamily: N_FONT, resize: "vertical" }}
          />
          <button
            type="button"
            onClick={() => void generateDesign()}
            disabled={generating || !userPrompt.trim()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              height: "36px",
              borderRadius: "8px",
              border: "none",
              background: generating ? "rgba(190,24,93,0.25)" : "linear-gradient(135deg, #6b2040, #be185d)",
              color: "white",
              fontSize: "13px",
              fontWeight: 700,
              fontFamily: N_FONT,
              cursor: generating ? "default" : "pointer",
            }}
          >
            {generating ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <WandSparkles size={14} />}
            {generating ? "Generating" : "Generate design"}
          </button>
        </div>

        <div style={{ padding: "12px 14px", overflowY: "auto", display: "grid", gap: "6px", flex: 1 }}>
          {creditsLeft !== null && (
            <p style={{ margin: 0, fontSize: "12px", color: "#166534", fontWeight: 600 }}>
              Credits remaining: {creditsLeft}
            </p>
          )}
          {chatLog.length === 0 ? (
            <p style={{ margin: 0, fontSize: "12px", color: N_MUTED }}>No prompts yet.</p>
          ) : (
            chatLog.map((m, idx) => (
              <div
                key={`${m.role}-${idx}`}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  background: m.role === "user" ? "#fef2f8" : "#f8fafc",
                  border: `1px solid ${N_BORDER}`,
                  fontSize: "12px",
                  color: N_FG,
                }}
              >
                <strong style={{ textTransform: "capitalize" }}>{m.role}:</strong> {m.content}
              </div>
            ))
          )}
          {error && <p style={{ margin: 0, color: "rgb(220,38,38)", fontSize: "12px" }}>{error}</p>}
          {success && <p style={{ margin: 0, color: "rgb(21,128,61)", fontSize: "12px" }}>{success}</p>}
          {!documentsDb && <p style={{ margin: 0, color: N_MUTED, fontSize: "12px" }}>Documents database not available, so auto-save is disabled.</p>}
        </div>
      </section>

      <section style={{ border: `1px solid ${N_BORDER}`, borderRadius: "12px", overflow: "hidden", background: "white", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${N_BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", background: "#fffdfc" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: N_FG }}>Invitation Canvas</h3>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: N_MUTED }}>{namesField || "Couple Names"} ┬À {dateField || "Wedding Date"} ┬À {venueField || "Wedding Venue"}</p>
          </div>
          <button
            type="button"
            onClick={exportCanvasPng}
            disabled={!svgMarkup}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 10px",
              borderRadius: "7px",
              border: `1px solid ${N_BORDER_MED}`,
              background: svgMarkup ? "white" : "#f8fafc",
              color: svgMarkup ? N_FG : N_SUBTLE,
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: N_FONT,
              cursor: svgMarkup ? "pointer" : "default",
            }}
          >
            <Download size={13} /> Export PNG
          </button>
        </div>

        <div style={{ padding: "12px", display: "grid", gap: "10px", overflowY: "auto" }}>
          {palette.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: N_MUTED }}><Palette size={12} /> Palette</span>
              {palette.map((color) => (
                <span key={color} style={{ width: "16px", height: "16px", borderRadius: "999px", border: `1px solid ${N_BORDER_MED}`, background: color }} title={color} />
              ))}
            </div>
          )}

          <div style={{ border: `1px solid ${N_BORDER}`, borderRadius: "8px", background: "#f8fafc", display: "flex", justifyContent: "center", padding: "10px" }}>
            <canvas
              ref={canvasRef}
              width={activeSize.width}
              height={activeSize.height}
              style={{ width: "100%", maxWidth: "460px", height: "auto", borderRadius: "4px", background: "white" }}
            />
          </div>

          {(invitationText || thankYouText) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px" }}>
              <div style={{ border: `1px solid ${N_BORDER}`, borderRadius: "8px", background: "#fff", padding: "10px" }}>
                <p style={{ margin: "0 0 6px", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: N_SUBTLE, fontWeight: 700 }}>Invitation Copy</p>
                <p style={{ margin: 0, fontSize: "13px", color: N_FG, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{invitationText || "No invitation text generated yet."}</p>
              </div>
              <div style={{ border: `1px solid ${N_BORDER}`, borderRadius: "8px", background: "#fff", padding: "10px" }}>
                <p style={{ margin: "0 0 6px", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: N_SUBTLE, fontWeight: 700 }}>Thank You Copy</p>
                <p style={{ margin: 0, fontSize: "13px", color: N_FG, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{thankYouText || "No thank-you text generated yet."}</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

