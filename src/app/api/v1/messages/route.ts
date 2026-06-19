import { NextResponse } from "next/server";
import { getSession } from "@/lib/authz";
import { handleServiceError } from "@/lib/authz/api";
import { messageSchema } from "@/lib/validation/message";
import { getThread, sendMessage } from "@/lib/services/message";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const leaseId = new URL(req.url).searchParams.get("leaseId");
  if (!leaseId) return NextResponse.json({ error: "Missing leaseId." }, { status: 400 });
  try {
    const thread = await getThread(session.userId, leaseId);
    return NextResponse.json({ thread });
  } catch (e) {
    return handleServiceError(e);
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  try {
    const message = await sendMessage(session.userId, parsed.data);
    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    return handleServiceError(e);
  }
}
