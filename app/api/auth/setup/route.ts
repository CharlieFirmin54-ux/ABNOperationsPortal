import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createFirstAdministrator } from "@/lib/auth/operators";
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
      { error: "Send name, email, and password." },
      { status: 400 }
    );
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = typeof record.name === "string" ? record.name : "";
  const email = typeof record.email === "string" ? record.email : "";
  const password = typeof record.password === "string" ? record.password : "";
  const confirm =
    typeof record.confirmPassword === "string" ? record.confirmPassword : null;
  if (confirm !== null && password !== confirm) {
    return NextResponse.json(
      { error: "Those passwords do not match." },
      { status: 400 }
    );
  }

  try {
    const result = await createFirstAdministrator({ name, email, password });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const store = await cookies();
    store.set(
      SESSION_COOKIE,
      createSessionToken(result.operator),
      sessionCookieOptions()
    );
    return NextResponse.json(
      { ok: true, operator: result.operator },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create that admin.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
