"use client";

import { useRouter } from "next/navigation";

const N_BLUE = "rgb(35,131,226)";
const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

export function AddWorkflowButton({ slug }: { slug: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/members/setup/${slug}`)}
      style={{
        fontFamily: N_FONT,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 14px",
        borderRadius: 6,
        background: N_BLUE,
        color: "#fff",
        fontSize: 12,
        fontWeight: 600,
        border: "none",
        cursor: "pointer",
        transition: "background 0.15s",
      }}
    >
      ＋ Add to workspace
    </button>
  );
}
