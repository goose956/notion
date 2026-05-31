"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

function adminToken(pw: string) {
  return btoa(pw + "niche-admin-salt").replace(/=/g, "");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const error = searchParams["error"] === "1";

  async function login(formData: FormData) {
    "use server";
    const pw = String(formData.get("password") ?? "");
    const envPw = process.env["ADMIN_PASSWORD"] ?? "changeme";
    if (pw !== envPw) {
      redirect("/admin/login?error=1");
    }
    cookies().set("admin_auth", adminToken(envPw), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    redirect("/admin");
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f8f8f7",
      fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        width: "100%",
        maxWidth: "360px",
        padding: "40px 32px",
        background: "white",
        borderRadius: "12px",
        border: "1px solid rgba(55,53,47,0.1)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        <div style={{ marginBottom: "28px", textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/s-logo.png" alt="Stridivo" style={{ height: "36px", margin: "0 auto 16px" }} />
          <h1 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: 700, color: "#37352F" }}>
            Admin Access
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "rgba(55,53,47,0.55)" }}>
            Enter the admin password to continue.
          </p>
        </div>

        <form action={login}>
          <div style={{ marginBottom: "16px" }}>
            <input
              type="password"
              name="password"
              placeholder="Password"
              autoFocus
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                borderRadius: "6px",
                border: error ? "1px solid rgba(220,38,38,0.6)" : "1px solid rgba(55,53,47,0.2)",
                fontSize: "14px",
                color: "#37352F",
                outline: "none",
                background: "white",
              }}
            />
            {error && (
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#dc2626" }}>
                Incorrect password. Try again.
              </p>
            )}
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "none",
              background: "#37352F",
              color: "white",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
