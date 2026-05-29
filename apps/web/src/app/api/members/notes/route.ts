/**
 * /api/members/notes — save, list, and delete research notes.
 *
 * Notes are stored in app_settings with the key pattern:
 *   note:{userEmail}:{uuid}
 *
 * The value is a JSON string: { id, title, content, nicheId, savedAt }
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertSetting, deleteSetting, listSettingsByPrefix } from "@niche-factory/db";

export interface ResearchNote {
  id: string;
  title: string;
  content: string;
  nicheId?: string;
  nicheName?: string;
  savedAt: string;
}

function noteKey(userEmail: string, id: string) {
  return `note:${userEmail}:${id}`;
}

function notePrefix(userEmail: string) {
  return `note:${userEmail}:`;
}

// ─── GET /api/members/notes — list all saved notes ────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await listSettingsByPrefix(notePrefix(session.user.email)).catch(() => []);
  const notes: ResearchNote[] = rows
    .map((row) => {
      try {
        return JSON.parse(row.value) as ResearchNote;
      } catch {
        return null;
      }
    })
    .filter((n): n is ResearchNote => n !== null)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

  return NextResponse.json({ notes });
}

// ─── POST /api/members/notes — save a note ────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    title?: string;
    content?: string;
    nicheId?: string;
    nicheName?: string;
  };

  if (!body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: "title and content are required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const note: ResearchNote = {
    id,
    title: body.title.trim(),
    content: body.content.trim(),
    ...(body.nicheId ? { nicheId: body.nicheId } : {}),
    ...(body.nicheName ? { nicheName: body.nicheName } : {}),
    savedAt: new Date().toISOString(),
  };

  await upsertSetting(noteKey(session.user.email, id), JSON.stringify(note));
  return NextResponse.json({ ok: true, note });
}

// ─── DELETE /api/members/notes?id=xxx ─────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await deleteSetting(noteKey(session.user.email, id));
  return NextResponse.json({ ok: true });
}
