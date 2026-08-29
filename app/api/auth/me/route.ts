import { NextResponse } from "next/server";
import { countOperators, suggestedLoginEmail } from "@/lib/auth/operators";
import { readSession } from "@/lib/auth/guard";
import { getAuthSecret } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let operatorCount = 0;
  let configured = false;
  let configError: string | null = null;
  try {
    operatorCount = await countOperators();
    configured = operatorCount > 0;
  } catch (error) {
    configError =
      error instanceof Error ? error.message : "Could not load operator logins.";
  }
  const operator = await readSession();
  return NextResponse.json({
    operator,
    configured,
    secretConfigured: Boolean(getAuthSecret()),
    configError,
    canSetup: !configured && !configError,
    suggestedEmail: suggestedLoginEmail(),
    operatorCount,
  });
}
