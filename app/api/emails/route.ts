import { NextResponse } from "next/server";
import { emails as seedEmails } from "@/lib/seed-data";
import type { InboxFetchResult } from "@/lib/types";
import {
  fetchYahooInbox,
  getYahooImapConfig,
  sanitizeImapError,
} from "@/lib/yahoo-imap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function payload(result: InboxFetchResult, status = 200) {
  return NextResponse.json(result, { status });
}

export async function GET() {
  const config = getYahooImapConfig();

  if (!config) {
    return payload({
      source: "unconfigured",
      configured: false,
      mailbox: null,
      error: null,
      emails: seedEmails,
    });
  }

  try {
    const emails = await fetchYahooInbox();
    return payload({
      source: "yahoo",
      configured: true,
      mailbox: config.user,
      error: null,
      emails,
    });
  } catch (err) {
    return payload({
      source: "demo",
      configured: true,
      mailbox: config.user,
      error: sanitizeImapError(err),
      emails: seedEmails,
    });
  }
}
