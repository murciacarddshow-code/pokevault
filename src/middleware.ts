// Lightweight Edge middleware — JWT cookie check only.
// No Prisma, no bcrypt, no heavy imports → stays under Vercel 1 MB limit.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED = ["/packs", "/inventory", "/wallet", "/profile", "/opening"];
const AUTH_ONLY = ["/login", "/register"];
const ADMIN     = ["/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Read JWT using same cookie name as auth config
  const token = await getToken({
    req,
    secret:     process.env.AUTH_SECRET,
    // Match the cookie name set in auth/config.ts
    cookieName: process.env.NODE_ENV === "production"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token",
  });

  const isLoggedIn = !!token;
  const role       = (token?.role as string | undefined) ?? "USER";

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && AUTH_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/packs", req.url));
  }

  // Protect dashboard routes
  if (!isLoggedIn && PROTECTED.some((p) => pathname.startsWith(p))) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
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
