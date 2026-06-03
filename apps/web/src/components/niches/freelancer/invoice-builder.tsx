"use client";
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { N_FG, N_MUTED, N_BORDER, N_BORDER_MED, N_FONT } from "@/lib/workspace-tokens";
import { ACCENT, ACCENT_LIGHT, ACCENT_BORDER, ACCENT_TEXT } from "./utils";
import type { WorkspaceDatabase, WorkspaceRow } from "@/app/api/members/workspace/route";

const PAYMENT_TERMS = ["7 days", "14 days", "21 days", "30 days", "Due on receipt", "50% upfront, 50% on completion"];

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "7px", border: `1px solid ${N_BORDER}`, fontSize: "13px", color: N_FG, fontFamily: N_FONT, background: "white", boxSizing: "border-box" };
const sel: React.CSSProperties = { ...inp, appearance: "none" as const };
const num: React.CSSProperties = { ...inp, width: "80px" };

interface LineItem { description: string; quantity: number; rate: number; }

export function FreelancerInvoiceBuilder({
  criteria,
  documentsDb,
  onRowAdded,
}: {
  criteria:    Record<string, unknown> | null;
  documentsDb: WorkspaceDatabase | null;
  onRowAdded:  (dbNotionId: string, row: WorkspaceRow) => void;
}) {
  const yourName  = String(criteria?.["your-name"] ?? "").trim();
  const country   = String(criteria?.["country"]   ?? "").trim();
  const currency  = country.toLowerCase().includes("united states") ? "$" : country.toLowerCase().includes("australia") || country.toLowerCase().includes("canada") ? "A$" : country.toLowerCase().includes("europe") ? "€" : "£";

  const [clientName,    setClientName]    = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("INV-001");
  const [projectName,   setProjectName]   = useState("");
  const [paymentTerms,  setPaymentTerms]  = useState("30 days");
  const [yourEmail,     setYourEmail]     = useState("");
  const [notes,         setNotes]         = useState("");
  const [lineItems,     setLineItems]     = useState<LineItem[]>([
    { description: "Professional services", quantity: 1, rate: 0 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [result,  setResult]  = useState<{ invoice: string; title: string; clientName: string } | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.rate, 0);

  function updateItem(i: number, field: keyof LineItem, val: string | number) {
    setLineItems((prev) => prev.map((li, idx) => idx === i ? { ...li, [field]: val } : li));
  }
  function addItem()    { setLineItems((p) => [...p, { description: "", quantity: 1, rate: 0 }]); }
  function removeItem(i: number) { setLineItems((p) => p.filter((_, idx) => idx !== i)); }

  async function generate() {
    if (!clientName.trim()) { setError("Enter a client name first."); return; }
    setLoading(true); setError(null); setResult(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/freelancer-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, invoiceNumber, projectName, lineItems, paymentTerms, yourName, yourEmail, notes, country }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      setResult(await res.json() as { invoice: string; title: string; clientName: string });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!result || !documentsDb) return;
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch("/api/members/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseId:    documentsDb.notionId,
          properties:    { Title: result.title, Type: "Invoice", Client: result.clientName, Content: result.invoice },
          propertyTypes: { Title: "title", Type: "select", Client: "rich_text", Content: "rich_text" },
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      onRowAdded(documentsDb.notionId, await res.json() as WorkspaceRow);
      setSaveMsg("Saved to Documents");
    } catch { setSaveMsg("Save failed — try again"); }
    finally  { setSaving(false); }
  }

  function exportPdf() {
    if (!result) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${result.title}</title><style>
      body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 24px;color:#111;line-height:1.8;}
      h1{font-size:22px;}strong{color:#3730a3;}pre{white-space:pre-wrap;font-family:inherit;}
    </style></head><body><h1>${result.title}</h1><pre>${result.invoice.replace(/</g, "&lt;")}</pre></body></html>`);
    w.document.close(); w.print();
  }

  const label = (t: string) => <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>{t}</label>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", fontFamily: N_FONT, maxWidth: "720px" }}>
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700, color: N_FG }}>Invoice Builder</h2>
        <p style={{ margin: 0, fontSize: "13px", color: N_MUTED }}>Generate a professional invoice — add your line items and get a formatted document ready to send.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div>
          {label("Client Name *")}
          <input style={inp} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Acme Ltd" />
        </div>
        <div>
          {label("Invoice Number")}
          <input style={inp} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-001" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          {label("Project / Description")}
          <input style={inp} value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Website redesign — Phase 1" />
        </div>
        <div>
          {label("Your Name / Business")}
          <input style={{ ...inp, background: yourName ? "#f9fafb" : "white" }} value={yourName} readOnly placeholder={yourName || "From onboarding"} />
        </div>
        <div>
          {label("Your Email")}
          <input style={inp} type="email" value={yourEmail} onChange={(e) => setYourEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          {label("Payment Terms")}
          <select style={sel} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
            {PAYMENT_TERMS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Line items */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG }}>Line Items</label>
          <button onClick={addItem} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
            <Plus size={12} /> Add item
          </button>
        </div>
        <div style={{ borderRadius: "8px", border: `1px solid ${N_BORDER}`, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px 80px 32px", gap: "0", background: "#f9fafb", padding: "6px 10px", borderBottom: `1px solid ${N_BORDER}` }}>
            {["Description", "Qty", "Rate", "Amount", ""].map((h) => (
              <span key={h} style={{ fontSize: "11px", fontWeight: 700, color: N_MUTED }}>{h}</span>
            ))}
          </div>
          {lineItems.map((li, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px 80px 32px", gap: "6px", padding: "6px 10px", borderBottom: i < lineItems.length - 1 ? `1px solid ${N_BORDER}` : "none", alignItems: "center" }}>
              <input style={{ ...inp, padding: "5px 8px" }} value={li.description} onChange={(e) => updateItem(i, "description", e.target.value)} placeholder="Description" />
              <input style={{ ...num, padding: "5px 8px" }} type="number" min={0} value={li.quantity} onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} />
              <input style={{ ...num, padding: "5px 8px", width: "100%" }} type="number" min={0} step={0.01} value={li.rate} onChange={(e) => updateItem(i, "rate", parseFloat(e.target.value) || 0)} placeholder="0.00" />
              <span style={{ fontSize: "13px", fontWeight: 600, color: N_FG, textAlign: "right" }}>{currency}{(li.quantity * li.rate).toFixed(2)}</span>
              <button onClick={() => removeItem(i)} style={{ padding: "4px", borderRadius: "4px", border: "none", background: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center" }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 10px", borderTop: `1px solid ${N_BORDER}`, gap: "24px" }}>
            <span style={{ fontSize: "13px", color: N_MUTED }}>Total</span>
            <span style={{ fontSize: "14px", fontWeight: 800, color: ACCENT_TEXT }}>{currency}{subtotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div>
        <label style={{ fontSize: "12px", fontWeight: 600, color: N_FG, marginBottom: "4px", display: "block" }}>Notes (optional)</label>
        <textarea style={{ ...inp, resize: "vertical", minHeight: "56px" }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Thank you for your business. Late payments incur a 2% monthly fee." />
      </div>

      {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

      <button onClick={generate} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px 20px", borderRadius: "8px", border: "none", background: loading ? "#e0e7ff" : ACCENT, color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Generating invoice…</> : "Generate Invoice"}
      </button>

      {result && (
        <div style={{ borderRadius: "12px", border: `1px solid ${ACCENT_BORDER}`, background: ACCENT_LIGHT, padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: ACCENT_TEXT }}>{result.title}</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={exportPdf} style={{ padding: "6px 14px", borderRadius: "7px", border: `1px solid ${ACCENT_BORDER}`, background: "white", color: ACCENT_TEXT, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Export PDF</button>
              {documentsDb && (
                <button onClick={save} disabled={saving} style={{ padding: "6px 14px", borderRadius: "7px", border: "none", background: ACCENT, color: "white", fontSize: "12px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                  {saving ? "Saving…" : saveMsg ?? "Save to Documents"}
                </button>
              )}
            </div>
          </div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "13px", color: N_FG, lineHeight: "1.8", fontFamily: "Georgia, serif", borderTop: `1px solid ${ACCENT_BORDER}`, paddingTop: "14px" }}>
            {result.invoice}
          </pre>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
