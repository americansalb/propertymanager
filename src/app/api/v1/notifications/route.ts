import { NextResponse } from "next/server";
import { getSession } from "@/lib/authz";
import { listNotifications, unreadCount } from "@/lib/services/notification";

export const dynamic = "force-dynamic";

/** The signed-in user's recent notifications plus their unread count. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const [items, unread] = await Promise.all([
    listNotifications(session.userId, 12),
    unreadCount(session.userId),
  ]);
  return NextResponse.json({ items, unread });
}
