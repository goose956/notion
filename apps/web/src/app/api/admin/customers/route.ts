import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { deleteCustomerByEmail } from "@niche-factory/db";
import { cookies } from "next/headers";

const BodySchema = z.object({
  email: z.string().email(),
});

function adminToken() {
  const pw = process.env["ADMIN_PASSWORD"] ?? "changeme";
  return btoa(pw + "niche-admin-salt").replace(/=/g, "");
}

function isAdminAuthorized(req: NextRequest): boolean {
  // Accept either a valid admin password cookie OR a logged-in admin email
  const adminCookie = req.cookies.get("admin_auth")?.value;
  if (adminCookie && adminCookie === adminToken()) return true;
  return false;
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    // Fallback: check Notion session email
    const session = await auth();
    const raw = process.env["ADMIN_EMAIL"] ?? "";
    const allowed = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    const email = session?.user?.email?.toLowerCase() ?? "";
    if (!email || (allowed.length > 0 && !allowed.includes(email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const deleted = await deleteCustomerByEmail(parsed.data.email);
  return NextResponse.json({ ok: true, deleted, email: parsed.data.email });
}
