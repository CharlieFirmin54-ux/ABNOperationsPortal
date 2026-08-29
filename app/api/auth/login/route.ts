import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticateOperator, countOperators } from "@/lib/auth/operators";
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
    return NextResponse.json({ error: "Send email and password." }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const email = typeof record.email === "string" ? record.email.trim() : "";
  const password = typeof record.password === "string" ? record.password : "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Enter your email and password." },
      { status: 400 }
    );
  }

  let configured = 0;
  try {
    configured = await countOperators();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load operator logins.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (configured === 0) {
    return NextResponse.json(
      {
        error:
          "No operator logins yet. Create the first administrator on this page.",
        configured: false,
      },
      { status: 403 }
    );
  }

  let operator;
  try {
    operator = await authenticateOperator(email, password);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not check that login.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!operator) {
    return NextResponse.json(
      { error: "That email or password is not right." },
      { status: 401 }
    );
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(operator), sessionCookieOptions());
  return NextResponse.json({ operator });
}
