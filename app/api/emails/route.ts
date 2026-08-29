import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { syncMailboxFromYahoo, wantsFresh } from "@/lib/mailbox-sync";
import type { InboxFetchResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function payload(result: InboxFetchResult, status = 200) {
  return NextResponse.json(result, { status });
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const synced = await syncMailboxFromYahoo({ fresh: wantsFresh(request) });
  return payload({
    source: synced.source === "error" ? "error" : synced.source,
    configured: synced.configured,
    mailbox: synced.mailbox,
    error: synced.error,
    emails: synced.emails,
  });
}
