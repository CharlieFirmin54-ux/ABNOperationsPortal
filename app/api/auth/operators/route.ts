import { NextResponse } from "next/server";
import {
  createFileOperator,
  listPublicOperators,
} from "@/lib/auth/operators";
import { requireAdministrator, requireSession } from "@/lib/auth/guard";
import { isOperatorRole } from "@/lib/auth/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  try {
    const operators = await listPublicOperators();
    return NextResponse.json({
      operators,
      canManage: session.operator.role === "Administrator",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load people.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireAdministrator();
  if (!session.ok) return session.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send name, email, role, and password." }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = typeof record.name === "string" ? record.name : "";
  const email = typeof record.email === "string" ? record.email : "";
  const roleRaw = typeof record.role === "string" ? record.role : "";
  const password = typeof record.password === "string" ? record.password : "";
  if (!isOperatorRole(roleRaw)) {
    return NextResponse.json(
      { error: "Choose Administrator or Operator." },
      { status: 400 }
    );
  }

  try {
    const result = await createFileOperator({
      name,
      email,
      role: roleRaw,
      password,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ operator: result.operator }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not add that login.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
