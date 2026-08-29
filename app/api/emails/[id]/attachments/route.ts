import { NextResponse } from "next/server";
import { getDemoAttachment } from "@/lib/demo-attachment";
import {
  contentDispositionHeader,
  isInlinePreviewable,
  isValidImapPartId,
  parseYahooUid,
} from "@/lib/email-attachments";
import {
  fetchYahooAttachment,
  getYahooImapConfig,
  sanitizeImapError,
  YahooAttachmentNotFoundError,
} from "@/lib/yahoo-imap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function fileResponse(
  filename: string,
  contentType: string,
  content: Buffer,
  download: boolean
) {
  const inline = !download && isInlinePreviewable(contentType);
  return new NextResponse(new Uint8Array(content), {
    status: 200,
    headers: {
      "Content-Type": contentType || "application/octet-stream",
      "Content-Length": String(content.length),
      "Content-Disposition": contentDispositionHeader(filename, inline),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await context.params;
  const messageId = decodeURIComponent(rawId ?? "");
  const url = new URL(request.url);
  const partId = url.searchParams.get("part")?.trim() || "";
  const download = url.searchParams.get("download") === "1";

  if (!messageId || !partId) {
    return jsonError("Missing message or attachment.", 400);
  }

  const demo = getDemoAttachment(messageId, partId);
  if (demo) {
    return fileResponse(
      demo.filename,
      demo.contentType,
      demo.content,
      download
    );
  }

  const uid = parseYahooUid(messageId);
  if (!uid || !isValidImapPartId(partId)) {
    return jsonError("That attachment is not available.", 404);
  }

  const config = getYahooImapConfig();
  if (!config) {
    return jsonError("Yahoo IMAP is not configured.", 503);
  }

  try {
    const attachment = await fetchYahooAttachment(uid, partId);
    return fileResponse(
      attachment.filename,
      attachment.contentType,
      attachment.content,
      download
    );
  } catch (err) {
    if (err instanceof YahooAttachmentNotFoundError) {
      return jsonError(err.message, 404);
    }
    return jsonError(
      sanitizeImapError(err, "Could not open that attachment."),
      502
    );
  }
}
