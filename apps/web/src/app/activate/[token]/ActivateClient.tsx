"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ActivateClientProps {
  token: string;
}

export default function ActivateClient({ token }: ActivateClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"activating" | "success" | "error">("activating");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [nichePackId, setNichePackId] = useState<string>("");
  const [credits, setCredits] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function activate() {
      try {
        const res = await fetch("/api/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          nichePackId?: string;
          credits?: number;
        };

        if (cancelled) return;

        if (!res.ok || !data.ok) {
          setErrorMessage(data.error ?? "Activation failed. Please try again or contact support.");
          setStatus("error");
          return;
        }

        setNichePackId(data.nichePackId ?? "");
        setCredits(data.credits ?? 0);
        setStatus("success");

        // Redirect to members area after a short delay
        setTimeout(() => {
          if (!cancelled) router.push("/members");
        }, 3000);
      } catch {
        if (!cancelled) {
          setErrorMessage("Network error. Please check your connection and try again.");
          setStatus("error");
        }
      }
    }

    void activate();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (status === "activating") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Spinner />
            </div>
          </div>
          <h1 className="text-xl font-semibold">Activating your plan…</h1>
          <p className="text-sm text-muted-foreground">Setting up your workspace, just a moment.</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-semibold text-green-700">You&apos;re all set!</h1>
          <p className="text-sm text-muted-foreground">
            Your account has been upgraded with <strong>{credits} credits</strong>
            {nichePackId ? ` and your ${formatNicheId(nichePackId)} workspace is ready.` : "."}
          </p>
          <p className="text-xs text-muted-foreground">Redirecting you to your dashboard…</p>
          <Link
            href="/members"
            className="inline-block mt-2 px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // error
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-sm px-6">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
        <h1 className="text-xl font-semibold text-red-700">Activation failed</h1>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Link
          href="/members"
          className="inline-block mt-2 px-5 py-2 rounded-md border border-input text-sm font-medium hover:bg-muted transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

function formatNicheId(id: string): string {
  return id
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function Spinner() {
  return (
    <svg
      className="h-6 w-6 animate-spin text-primary"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
