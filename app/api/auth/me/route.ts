import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth/guard";
import { getAuthSecret } from "@/lib/auth/session";
import { isSharedLoginConfigured } from "@/lib/auth/shared-login";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const operator = await readSession();
  const secretConfigured = Boolean(getAuthSecret());
  const configured = isSharedLoginConfigured() && secretConfigured;
  return NextResponse.json(
    {
      operator,
      configured,
      secretConfigured,
      configError: configured
        ? null
        : "This portal is not configured for sign-in.",
      canSetup: false,
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}
