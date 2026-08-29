import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { parseYahooUid } from "@/lib/email-attachments";
import { patchMailboxCacheEmail } from "@/lib/mailbox-cache";
import {
  fetchYahooMessage,
  getYahooImapConfig,
  sanitizeImapError,
  YahooMessageNotFoundError,
} from "@/lib/yahoo-imap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session.ok) return session.response;

  const { id: rawId } = await context.params;
  const messageId = decodeURIComponent(rawId ?? "");
  const uid = parseYahooUid(messageId);
  if (!uid) {
    return NextResponse.json(
      { error: "That message is not in the mailbox." },
      { status: 404 }
    );
  }

  const config = getYahooImapConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Yahoo IMAP is not configured." },
      { status: 503 }
    );
  }

  try {
    const email = await fetchYahooMessage(uid);
    await patchMailboxCacheEmail(email);
    return NextResponse.json({ email });
  } catch (err) {
    if (err instanceof YahooMessageNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: sanitizeImapError(err, "Could not load that message.") },
      { status: 502 }
    );
  }
}
