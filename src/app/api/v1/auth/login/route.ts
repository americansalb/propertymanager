import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/auth";
import { AuthError, login } from "@/lib/services/auth";
import { setSessionCookie } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }

  if (!rateLimit(`login:${ip}:${parsed.data.email}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  try {
    const { token, expiresAt, redirect } = await login(parsed.data, {
      ip,
      userAgent: req.headers.get("user-agent"),
    });
    await setSessionCookie(token, expiresAt);
    return NextResponse.json({ redirect });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("login failed", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
