import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/auth/session";
import type { SessionOperator } from "@/lib/auth/types";

export async function readSession(): Promise<SessionOperator | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function requireSession(): Promise<
  { ok: true; operator: SessionOperator } | { ok: false; response: NextResponse }
> {
  const operator = await readSession();
  if (!operator) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sign in to continue." },
        { status: 401 }
      ),
    };
  }
  return { ok: true, operator };
}

export async function requireAdministrator(): Promise<
  { ok: true; operator: SessionOperator } | { ok: false; response: NextResponse }
> {
  const session = await requireSession();
  if (!session.ok) return session;
  if (session.operator.role !== "Administrator") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Only administrators can manage logins." },
        { status: 403 }
      ),
    };
  }
  return session;
}
