"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { N_FG, N_MUTED, N_SUBTLE, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";
import { asText, ACCENT, ACCENT_LIGHT, ACCENT_BORDER } from "./utils";

const CATEGORIES = ["Registration", "Certificate", "Licence", "Insurance", "Labelling", "Inspection"] as const;
type Category = typeof CATEGORIES[number];

interface ComplianceItem {
  name:        string;
  category:    Category;
  required:    boolean;
  description: string;
  authority:   string;
  timescale:   string;
  cost:        string;
}

interface ComplianceResult {
  items:   ComplianceItem[];
  summary: string;
}

const CATEGORY_COLORS: Record<Category, { bg: string; color: string }> = {
  Registration: { bg: "rgba(59,130,246,0.09)",  color: "#1d4ed8" },
  Certificate:  { bg: "rgba(5,150,105,0.09)",   color: "#065f46" },
  Licence:      { bg: "rgba(245,158,11,0.09)",  color: "#92400e" },
  Insurance:    { bg: "rgba(124,58,237,0.09)",  color: "#4c1d95" },
  Labelling:    { bg: "rgba(219,39,119,0.09)",  color: "#9f1239" },
  Inspection:   { bg: "rgba(220,38,38,0.09)",   color: "#b91c1c" },
};

export function CakeComplianceChecklist({
  criteria,
  complianceDb,
  onRowAdded,
}: {
  criteria:     Record<string, unknown> | null;
  complianceDb: WorkspaceDatabase | null;
  onRowAdded:   (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [result,     setResult]     = useState<ComplianceResult | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const [filter,     setFilter]     = useState<Category | "All">("All");

  const businessName  = String(criteria?.["business-name"]  ?? "").trim();
  const operationType = String(criteria?.["operation-type"] ?? "Home kitchen").trim();
  const speciality    = String(criteria?.["speciality"]     ?? "").trim();
  const country       = String(criteria?.["country"]        ?? "United Kingdom").trim();

  async function generate() {
    if (!businessName) return;
    setLoading(true); setError(null); setResult(null); setSaveResult(null);
    try {
      const res = await fetch("/api/members/cake-compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, operationType, speciality, country }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json() as ComplianceResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveToNotion() {
    if (!result || !complianceDb) return;
    setSaving(true); setSaveResult(null);
    let added = 0;
    try {
      for (const item of result.items) {
        const properties: Record<string, string | number | boolean | null> = {
          "Requirement": item.name,
          "Category":    item.category,
          "Status":      "Not started",
          "Authority":   item.authority,
          "Cost":        item.cost,
          "Notes":       `${item.description}${item.timescale ? ` Timescale: ${item.timescale}` : ""}`,
        };
        const propertyTypes = {
          "Requirement": "title", "Category": "select", "Status": "select",
          "Authority": "rich_text", "Cost": "rich_text", "Notes": "rich_text",
        };
        const res = await fetch("/api/members/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ databaseId: complianceDb.notionId, properties, propertyTypes }),
        });
        if (res.ok) {
          const data = await res.json() as { pageId?: string };
          if (data.pageId) { onRowAdded(complianceDb.notionId, { pageId: data.pageId, properties }); added++; }
        }
      }
      setSaveResult(`✓ Saved ${added} items to Licences & Compliance`);
    } catch {
      setSaveResult("Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  const existingItems = new Set(
    (complianceDb?.rows ?? []).map((r) => asText(r.properties["Requirement"]).toLowerCase()),
  );

  const missingSetup = !businessName;
  const filtered     = result ? (filter === "All" ? result.items : result.items.filter((i) => i.category === filter)) : [];

  return (
    <div style={{ maxWidth: "720px", fontFamily: N_FONT }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "20px", fontWeight: 800, color: N_FG }}>Compliance Checklist</h1>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED, lineHeight: 1.6 }}>
          Every licence, registration, certificate and legal requirement to run a cake business legally — tailored to your country and operation type.
          Includes Natasha&apos;s Law allergen labelling, food business registration and more.
        </p>
      </div>

      {missingSetup && (
        <div style={{ padding: "12px 14px", borderRadius: "8px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)", fontSize: "13px", color: "#92400e", marginBottom: "20px" }}>
          Complete your onboarding (business name) to generate your compliance checklist.
        </div>
      )}

      {!missingSetup && (
        <div style={{ padding: "12px 16px", borderRadius: "10px", background: "rgba(55,53,47,0.04)", border: `1px solid ${N_BORDER}`, marginBottom: "20px", fontSize: "13px", color: N_MUTED }}>
          <strong style={{ color: N_FG }}>{businessName}</strong> · {operationType}{speciality ? ` · ${speciality}` : ""} · {country}
        </div>
      )}

      <button
        onClick={() => void generate()}
        disabled={loading || missingSetup}
        style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "11px 26px", borderRadius: "6px", border: "none",
          background: loading || missingSetup ? "rgba(55,53,47,0.12)" : ACCENT,
          color: loading || missingSetup ? N_MUTED : "white",
          fontSize: "14px", fontWeight: 600, cursor: loading || missingSetup ? "default" : "pointer",
          fontFamily: N_FONT, marginBottom: "28px",
        }}
      >
        {loading
          ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Generating checklist…</>
          : "✅ Generate compliance checklist (1 credit)"}
      </button>

      {error && (
        <div style={{ padding: "12px 14px", borderRadius: "6px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", fontSize: "13px", color: "#b91c1c", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {result && (
        <div>
          <div style={{ padding: "12px 16px", borderRadius: "10px", background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, marginBottom: "20px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: N_FG, lineHeight: 1.7 }}>{result.summary}</p>
          </div>

          {/* Category filter */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
            {(["All", ...CATEGORIES] as const).map((cat) => {
              const isActive = filter === cat;
              const c = cat !== "All" ? CATEGORY_COLORS[cat] : null;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilter(cat)}
                  style={{
                    padding: "5px 12px", borderRadius: "99px",
                    border: `1px solid ${isActive ? (c?.color ?? ACCENT) : N_BORDER}`,
                    background: isActive ? (c?.bg ?? ACCENT_LIGHT) : "white",
                    color: isActive ? (c?.color ?? "#9f1239") : N_SUBTLE,
                    fontSize: "12px", fontWeight: isActive ? 700 : 400,
                    cursor: "pointer", fontFamily: N_FONT,
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {filtered.map((item) => {
              const colors    = CATEGORY_COLORS[item.category];
              const alreadyIn = existingItems.has(item.name.toLowerCase());
              return (
                <div
                  key={item.name}
                  style={{ borderRadius: "12px", border: `1px solid ${N_BORDER_MED}`, background: alreadyIn ? "rgba(5,150,105,0.04)" : "white", overflow: "hidden" }}
                >
                  <div style={{ padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: N_FG }}>{item.name}</p>
                        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: colors.bg, color: colors.color, fontWeight: 600 }}>
                          {item.category}
                        </span>
                        {!item.required && (
                          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: "rgba(55,53,47,0.06)", color: N_SUBTLE, fontWeight: 600 }}>
                            Recommended
                          </span>
                        )}
                        {alreadyIn && (
                          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: "rgba(5,150,105,0.09)", color: "#065f46", fontWeight: 600 }}>
                            In tracker
                          </span>
                        )}
                      </div>
                      <p style={{ margin: "0 0 8px", fontSize: "12px", color: N_MUTED, lineHeight: 1.6 }}>{item.description}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "11px" }}>
                        {item.authority && (
                          <span><strong style={{ color: N_FG }}>Authority:</strong> <span style={{ color: N_MUTED }}>{item.authority}</span></span>
                        )}
                        {item.timescale && (
                          <span><strong style={{ color: N_FG }}>When:</strong> <span style={{ color: N_MUTED }}>{item.timescale}</span></span>
                        )}
                        {item.cost && (
                          <span><strong style={{ color: N_FG }}>Cost:</strong> <span style={{ color: N_MUTED }}>{item.cost}</span></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {saveResult && (
            <div style={{ marginBottom: "12px", padding: "10px 14px", borderRadius: "6px", background: saveResult.startsWith("✓") ? "rgba(5,150,105,0.07)" : "rgba(220,38,38,0.07)", border: `1px solid ${saveResult.startsWith("✓") ? "rgba(5,150,105,0.2)" : "rgba(220,38,38,0.2)"}`, fontSize: "13px", color: saveResult.startsWith("✓") ? "#065f46" : "#b91c1c" }}>
              {saveResult}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            {complianceDb ? (
              <button
                onClick={() => void saveToNotion()}
                disabled={saving}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 22px", borderRadius: "6px", border: "none", background: saving ? "rgba(55,53,47,0.12)" : ACCENT, color: saving ? N_MUTED : "white", fontSize: "14px", fontWeight: 600, cursor: saving ? "default" : "pointer", fontFamily: N_FONT }}
              >
                {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : "Save to Licences & Compliance"}
              </button>
            ) : (
              <p style={{ fontSize: "12px", color: N_MUTED }}>Deploy Licences & Compliance database to save.</p>
            )}
            <button
              onClick={() => void generate()}
              disabled={loading}
              style={{ padding: "10px 22px", borderRadius: "6px", border: `1px solid ${N_BORDER}`, background: "white", color: N_FG, fontSize: "14px", fontWeight: 500, cursor: loading ? "default" : "pointer", fontFamily: N_FONT }}
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
