"use client";

/**
 * ConfirmModal — a reusable confirmation dialog using inline styles so it works
 * in both Tailwind-based admin pages and Notion-style member pages.
 */

export type PendingConfirm = {
  title: string;
  message: string;
  confirmLabel?: string;
  dangerous?: boolean;
  onConfirm: () => void;
};

const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  dangerous = true,
  onConfirm,
  onCancel,
}: PendingConfirm & { onCancel: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: N_FONT,
      }}
    >
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }}
        onClick={onCancel}
      />
      {/* Card */}
      <div
        style={{
          position: "relative",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid rgba(55,53,47,0.12)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          padding: "24px 28px",
          width: "100%",
          maxWidth: 400,
          margin: "0 16px",
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#37352F", margin: "0 0 8px" }}>
          {title}
        </h2>
        <p style={{ fontSize: 14, color: "rgba(55,53,47,0.65)", margin: "0 0 24px", lineHeight: 1.6 }}>
          {message}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid rgba(55,53,47,0.2)",
              background: "#fff",
              fontSize: 14,
              fontWeight: 500,
              color: "#37352F",
              cursor: "pointer",
              fontFamily: N_FONT,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: dangerous ? "rgb(235,87,87)" : "rgb(35,131,226)",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
              fontFamily: N_FONT,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
