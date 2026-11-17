import { NextResponse } from "next/server";
import { forgotSchema } from "@/lib/validation/auth";
import { requestPasswordReset } from "@/lib/services/password-reset";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

/** Public. Answers the same whether or not the email has an account. */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const parsed = forgotSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Enter your email." },
      { status: 400 },
    );
  }
  if (
    !rateLimit(`forgot:${ip}`, 5, 15 * 60_000) ||
    !rateLimit(`forgot:${parsed.data.email}`, 3, 15 * 60_000)
  ) {
    return NextResponse.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  }
  try {
    await requestPasswordReset(parsed.data.email, ip);
  } catch (e) {
    console.error("password reset request failed", e);
  }
  return NextResponse.json({ ok: true });
}
