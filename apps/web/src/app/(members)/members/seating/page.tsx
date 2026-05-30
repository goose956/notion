"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { WorkspaceDatabase, WorkspaceResponse } from "@/app/api/members/workspace/route";
import { SeatingPlannerView } from "./SeatingPlannerView";

const N_FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

export default function SeatingPlannerPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [backend, setBackend] = useState<"app" | "notion">("notion");
  const [guestsDb, setGuestsDb] = useState<WorkspaceDatabase | null>(null);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/members/workspace");
        if (!res.ok) throw new Error("Failed to load workspace data");
        const data = (await res.json()) as WorkspaceResponse;
        setBackend(data.backend);

        const db = data.databases.find((d) => d.dbId === "guests") ?? null;
        setGuestsDb(db);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load seating planner");
      } finally {
        setLoading(false);
      }
    }

    void run();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          color: "rgba(55,53,47,0.65)",
          fontFamily: N_FONT,
        }}
      >
        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
        Loading seating planner...
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: "30px", fontFamily: N_FONT }}>
        <p style={{ color: "rgb(220,38,38)", marginBottom: "10px" }}>{loadError}</p>
        <Link href="/members/workspace" style={{ color: "rgb(35,131,226)", textDecoration: "none" }}>
          Back to workspace
        </Link>
      </div>
    );
  }

  if (backend !== "app") {
    return (
      <div style={{ padding: "30px", fontFamily: N_FONT }}>
        <h1 style={{ marginTop: 0, color: "#37352F", fontSize: "22px" }}>Seating Planner</h1>
        <p style={{ color: "rgba(55,53,47,0.65)", maxWidth: "640px" }}>
          This planner is currently available for the in-app wedding workspace only.
        </p>
        <Link href="/members/workspace" style={{ color: "rgb(35,131,226)", textDecoration: "none" }}>
          Back to workspace
        </Link>
      </div>
    );
  }

  if (!guestsDb) {
    return (
      <div style={{ padding: "30px", fontFamily: N_FONT }}>
        <h1 style={{ marginTop: 0, color: "#37352F", fontSize: "22px" }}>Seating Planner</h1>
        <p style={{ color: "rgba(55,53,47,0.65)", maxWidth: "640px" }}>
          Could not find a Guest List database yet. Deploy a wedding niche and open this page again.
        </p>
        <Link
          href="/members/workspace?dbId=guests"
          style={{ color: "rgb(35,131,226)", textDecoration: "none" }}
        >
          Open guest list
        </Link>
      </div>
    );
  }

  return <SeatingPlannerView guestsDb={guestsDb} nicheId={guestsDb?.nicheId} />;
}
