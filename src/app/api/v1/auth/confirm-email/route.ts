import { NextResponse } from "next/server";
import { getSession } from "@/lib/authz";
import { sendEmailConfirmation } from "@/lib/services/email-verify";
import { rateLimit } from "@/lib/rate-limit";

/** Send (again) the link that confirms the signed-in person's email. */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!rateLimit(`confirm-email:${session.userId}`, 3, 15 * 60_000)) {
    return NextResponse.json({ error: "We just sent one. Wait a few minutes." }, { status: 429 });
  }
  const result = await sendEmailConfirmation(session.userId);
  return NextResponse.json(result);
}
