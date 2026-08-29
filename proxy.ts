import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSameOrigin } from "@/lib/auth/origin";
import { safeInternalPath } from "@/lib/auth/paths";
import { applySecurityHeaders } from "@/lib/auth/security-headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth/login",
  "/api/auth/me",
]);

function finish(request: NextRequest, response: NextResponse) {
  return applySecurityHeaders(response, request);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const mutating =
    request.method === "POST" ||
    request.method === "PUT" ||
    request.method === "PATCH" ||
    request.method === "DELETE";

  if (mutating && pathname.startsWith("/api/") && !isSameOrigin(request)) {
    return finish(
      request,
      NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
    );
  }

  if (pathname === "/api/auth/logout") {
    return finish(request, NextResponse.next());
  }

  if (PUBLIC_PATHS.has(pathname)) {
    if (pathname === "/login" && session) {
      const next = safeInternalPath(request.nextUrl.searchParams.get("from"));
      return finish(request, NextResponse.redirect(new URL(next, request.url)));
    }
    return finish(request, NextResponse.next());
  }

  if (session) {
    return finish(request, NextResponse.next());
  }

  if (pathname.startsWith("/api/")) {
    return finish(
      request,
      NextResponse.json({ error: "Sign in to continue." }, { status: 401 })
    );
  }

  const login = new URL("/login", request.url);
  const from = `${pathname}${request.nextUrl.search}`;
  if (from && from !== "/") {
    login.searchParams.set("from", from);
  }
  return finish(request, NextResponse.redirect(login));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|abn-logo.png|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.webp$|.*\\.ico$).*)",
  ],
};
