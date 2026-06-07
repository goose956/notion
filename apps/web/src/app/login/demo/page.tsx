"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";

export default function DemoLoginPage() {
  useEffect(() => {
    signIn("email", {
      email: "demo@stridivo.com",
      callbackUrl: "/members/workspace",
    });
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif", color: "#666" }}>
      Signing in...
    </div>
  );
}
