import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticateOperator } from "@/lib/auth/operators";
import { authenticateSharedLogin } from "@/lib/auth/shared-login";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send username and password." },
      { status: 400 }
    );
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const usernameRaw =
    (typeof record.username === "string" && record.username) ||
    (typeof record.email === "string" && record.email) ||
    "";
  const username = usernameRaw.trim();
  const password = typeof record.password === "string" ? record.password : "";
  if (!username || !password) {
    return NextResponse.json(
      { error: "Enter the team username and password." },
      { status: 400 }
    );
  }

  let operator = authenticateSharedLogin(username, password);
  if (!operator) {
    try {
      operator = await authenticateOperator(username, password);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not check that login.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (!operator) {
    return NextResponse.json(
      { error: "That username or password is not right." },
      { status: 401 }
    );
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(operator), sessionCookieOptions());
  return NextResponse.json({ operator });
}
