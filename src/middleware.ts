import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public routes — never block
  const PUBLIC_PREFIXES = ["/", "/login", "/register", "/api/auth", "/api/drops", "/api/webhooks", "/_next", "/sounds", "/favicon.ico"];
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    // Redirect logged-in users away from auth pages
    if (session && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
      return NextResponse.redirect(new URL("/packs", req.url));
    }
    return NextResponse.next();
  }

  // Protected routes — require session
  const PROTECTED = ["/packs", "/inventory", "/wallet", "/profile"];
  if (PROTECTED.some((p) => pathname.startsWith(p)) && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin only
  if (pathname.startsWith("/admin")) {
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sounds/).*)"],
};
