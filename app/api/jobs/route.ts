import { NextResponse } from "next/server";
import { syncMailboxFromYahoo, wantsFresh } from "@/lib/mailbox-sync";
import type { JobsFetchResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function payload(result: JobsFetchResult, status = 200) {
  return NextResponse.json(result, { status });
}

export async function GET(request: Request) {
  const result = await syncMailboxFromYahoo({ fresh: wantsFresh(request) });
  return payload(result);
}
