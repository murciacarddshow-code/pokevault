// Lightweight middleware — reads JWT cookie only, no DB, no bcrypt, no Prisma.
// Stays well under Vercel's 1 MB Edge Function limit.
//
// Full auth validation (password check, DB lookup) happens in:
//   - src/lib/auth/config.ts  (NextAuth handlers, server-side only)
//   - src/lib/auth/guards.ts  (requireAuth helper used in server components/pages)

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED = ["/packs", "/inventory", "/wallet", "/profile", "/opening"];
const AUTH_ONLY = ["/login", "/register"]; // redirect away if already logged in
const ADMIN     = ["/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let Next internals, static files and public API routes through immediately
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/drops") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/sounds") ||
    pathname.startsWith("/packs/") && pathname.endsWith(".webp") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.png" ||
    pathname === "/favicon.svg"
  ) {
    return NextResponse.next();
  }

  // Read JWT — only verifies signature, never hits DB
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  const isLoggedIn = !!token;
  const role       = (token?.role as string | undefined) ?? "USER";

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && AUTH_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/packs", req.url));
  }

  // Protect dashboard routes
  if (!isLoggedIn && PROTECTED.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin only
  if (ADMIN.some((p) => pathname.startsWith(p))) {
    if (!isLoggedIn || role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Only run on pages that need auth checks — skip static/image/font requests
  matcher: [
    "/packs/:path*",
    "/inventory/:path*",
    "/wallet/:path*",
    "/profile/:path*",
    "/opening/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
