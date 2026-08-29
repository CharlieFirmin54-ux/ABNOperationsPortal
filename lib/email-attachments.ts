const INLINE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "text/plain",
]);

const EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    ".pptx",
  "application/zip": ".zip",
};

export const DEMO_ATTACHMENT_PART_ID = "demo-boiler-report";

export function mediaType(contentType: string): string {
  return contentType.split(";")[0].trim().toLowerCase();
}

export function isInlinePreviewable(
  contentType: string,
  filename = ""
): boolean {
  if (INLINE_TYPES.has(mediaType(contentType))) return true;
  return filename.toLowerCase().endsWith(".pdf");
}

export function isImageAttachment(contentType: string): boolean {
  const type = mediaType(contentType);
  return type.startsWith("image/") && type !== "image/svg+xml";
}

export function isPdfAttachment(contentType: string, filename = ""): boolean {
  if (mediaType(contentType) === "application/pdf") return true;
  return filename.toLowerCase().endsWith(".pdf");
}

export function sniffContentType(
  contentType: string,
  filename: string,
  content: Uint8Array
): string {
  const type = mediaType(contentType);
  if (type && type !== "application/octet-stream") return type;
  if (
    content.length >= 5 &&
    content[0] === 0x25 &&
    content[1] === 0x50 &&
    content[2] === 0x44 &&
    content[3] === 0x46 &&
    content[4] === 0x2d
  ) {
    return "application/pdf";
  }
  if (
    content.length >= 3 &&
    content[0] === 0xff &&
    content[1] === 0xd8 &&
    content[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    content.length >= 8 &&
    content[0] === 0x89 &&
    content[1] === 0x50 &&
    content[2] === 0x4e &&
    content[3] === 0x47
  ) {
    return "image/png";
  }
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return type || "application/octet-stream";
}

export function safeFilename(name: string): string {
  const trimmed = name.replace(/[/\\]/g, "_").replace(/[\r\n"]/g, "").trim();
  return trimmed.slice(0, 180) || "attachment";
}

export function defaultFilename(contentType: string, partId: string): string {
  const ext = EXTENSIONS[mediaType(contentType)] ?? "";
  const slug = partId.replace(/[^\w.-]+/g, "-") || "file";
  return `attachment-${slug}${ext}`;
}

export function attachmentHref(
  messageId: string,
  partId: string,
  download = false
): string {
  const params = new URLSearchParams({ part: partId });
  if (download) params.set("download", "1");
  return `/api/emails/${encodeURIComponent(messageId)}/attachments?${params.toString()}`;
}

export function contentDispositionHeader(
  filename: string,
  inline: boolean
): string {
  const safe = safeFilename(filename);
  const type = inline ? "inline" : "attachment";
  const ascii = Array.from(safe, (char) => {
    const code = char.charCodeAt(0);
    return code >= 32 && code <= 126 ? char : "_";
  }).join("");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
}

export function parseYahooUid(messageId: string): number | null {
  const match = /^yahoo-(\d+)$/.exec(messageId);
  if (!match) return null;
  const uid = Number(match[1]);
  return Number.isInteger(uid) && uid > 0 ? uid : null;
}

export function isValidImapPartId(partId: string): boolean {
  return /^(?:TEXT|\d+(?:\.\d+)*)$/i.test(partId);
}
