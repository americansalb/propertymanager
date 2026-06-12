import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/landlord", "/tenant", "/pro", "/admin"];

/**
 * Optimistic guard only: checks cookie PRESENCE (no DB in middleware).
 * Real authentication happens in route-group layouts and route handlers.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  if (!req.cookies.get("session")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/landlord/:path*", "/tenant/:path*", "/pro/:path*", "/admin/:path*"],
};
