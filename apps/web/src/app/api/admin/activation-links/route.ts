import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  createActivationLink,
  listActivationLinks,
} from "@niche-factory/db";

function isAdminEmail(email: string | null | undefined): boolean {
  const raw = process.env["ADMIN_EMAIL"] ?? "";
  if (!raw.trim()) return true;
  const allowed = raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes((email ?? "").toLowerCase());
}

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/** GET /api/admin/activation-links — list all activation links */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const links = await listActivationLinks();
  return NextResponse.json({ links });
}

const CreateSchema = z.object({
  nichePackId: z.string().min(1),
  credits: z.number().int().min(1).max(100_000),
  label: z.string().max(200).default(""),
});

/** POST /api/admin/activation-links — create a new activation link */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { nichePackId, credits, label } = parsed.data;
  const link = await createActivationLink(nichePackId, credits, label);

  const baseUrl =
    process.env["NEXT_PUBLIC_APP_URL"] ??
    process.env["NEXTAUTH_URL"] ??
    "";
  const url = `${baseUrl}/activate/${link.token}`;

  return NextResponse.json({ link, url }, { status: 201 });
}
