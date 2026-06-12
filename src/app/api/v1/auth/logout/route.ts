import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, revokeSession, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(token);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
