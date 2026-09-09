import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticateOperator } from "@/lib/auth/operators";
import { consumeLoginAttempt, clearLoginAttempts, clientAddress } from "@/lib/auth/rate-limit";
import { authenticateSharedLogin } from "@/lib/auth/shared-login";
import {
  SESSION_COOKIE,
  createSessionToken,
  getAuthSecret,
  sessionCookieOptions,
} from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200, extra?: HeadersInit) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      ...extra,
    },
  });
}

export async function POST(request: Request) {
  if (!getAuthSecret()) {
    return json(
      { error: "This portal is not configured for sign-in." },
      503
    );
  }

  const rateKey = clientAddress(request);
  const limited = consumeLoginAttempt(rateKey);
  if (!limited.ok) {
    return json(
      { error: "Too many sign-in attempts. Try again in a few minutes." },
      429,
      { "Retry-After": String(limited.retryAfterSec) }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Send username and password." }, 400);
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const usernameRaw =
    (typeof record.username === "string" && record.username) ||
    (typeof record.email === "string" && record.email) ||
    "";
  const username = usernameRaw.trim();
  const password = typeof record.password === "string" ? record.password : "";
  if (!username || !password) {
    return json({ error: "Enter the team username and password." }, 400);
  }

  let operator = authenticateSharedLogin(username, password);
  if (!operator) {
    try {
      operator = await authenticateOperator(username, password);
    } catch {
      return json({ error: "Could not check that login." }, 500);
    }
  }

  if (!operator) {
    return json({ error: "That username or password is not right." }, 401);
  }

  clearLoginAttempts(rateKey);
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(operator), sessionCookieOptions());
  return json({ operator });
}
