import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/guard";
import { getAuthSecret } from "@/lib/auth/session";
import { getTeamUsername } from "@/lib/auth/shared-login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const operator = await readSession();
  return NextResponse.json({
    operator,
    configured: true,
    secretConfigured: Boolean(getAuthSecret()),
    configError: null,
    canSetup: false,
    suggestedUsername: getTeamUsername(),
  });
}
