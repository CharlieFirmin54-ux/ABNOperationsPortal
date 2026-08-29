import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { safeInternalPath } from "@/lib/auth/paths";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/auth/me"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/api/auth/logout") {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    if (pathname === "/login" && session) {
      const next = safeInternalPath(request.nextUrl.searchParams.get("from"));
      return NextResponse.redirect(new URL(next, request.url));
    }
    return NextResponse.next();
  }

  if (session) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Sign in to continue." },
      { status: 401 }
    );
  }

  const login = new URL("/login", request.url);
  const from = `${pathname}${request.nextUrl.search}`;
  if (from && from !== "/") {
    login.searchParams.set("from", from);
  }
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|abn-logo.png|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.webp$|.*\\.ico$).*)",
  ],
};
