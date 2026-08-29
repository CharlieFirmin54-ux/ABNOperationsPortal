import { lookup } from "node:dns/promises";
import { ImapFlow, type MessageStructureObject } from "imapflow";
import { simpleParser } from "mailparser";
import type { EmailAttachment, InboxEmail } from "@/lib/types";
import {
  defaultFilename,
  safeFilename,
  sniffContentType,
} from "@/lib/email-attachments";

const DEFAULT_HOST = "imap.mail.yahoo.com";
const DEFAULT_PORT = 993;
const DEFAULT_LIMIT = process.env.VERCEL ? 15 : 40;
const FETCH_TIMEOUT_MS = process.env.VERCEL ? 8_000 : 25_000;
const CONNECT_TIMEOUT_MS = process.env.VERCEL ? 6_000 : 15_000;
const ATTACHMENT_TIMEOUT_MS = process.env.VERCEL ? 8_000 : 45_000;
const SOURCE_MAX_BYTES = process.env.VERCEL ? 50_000 : 80_000;
const FULL_SOURCE_MAX_BYTES = 400_000;
const BODY_MAX_CHARS = 40_000;
const PREVIEW_MAX_CHARS = 110;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

const SKIP_ATTACHMENT_TYPES = new Set([
  "application/pkcs7-signature",
  "application/x-pkcs7-signature",
  "application/pgp-signature",
  "application/pkcs7-mime",
]);

export type YahooImapConfig = {
  host: string;
  port: number;
  user: string;
};

export type YahooAttachmentPayload = {
  filename: string;
  contentType: string;
  content: Buffer;
};

type YahooImapAuth = YahooImapConfig & { pass: string };

export function getYahooImapConfig(): YahooImapConfig | null {
  const auth = getYahooImapAuth();
  if (!auth) return null;
  return { host: auth.host, port: auth.port, user: auth.user };
}

function getYahooImapAuth(): YahooImapAuth | null {
  const user = process.env.YAHOO_EMAIL?.trim();
  const pass = process.env.YAHOO_APP_PASSWORD?.replace(/\s+/g, "") ?? "";
  if (!user || !pass) return null;
  const portRaw = process.env.YAHOO_IMAP_PORT?.trim();
  const port = portRaw ? Number(portRaw) : DEFAULT_PORT;
  return {
    host: process.env.YAHOO_IMAP_HOST?.trim() || DEFAULT_HOST,
    port: Number.isFinite(port) && port > 0 ? port : DEFAULT_PORT,
    user,
    pass,
  };
}

export function redactSecret(value: string): string {
  const pass = process.env.YAHOO_APP_PASSWORD?.replace(/\s+/g, "") ?? "";
  const spaced = process.env.YAHOO_APP_PASSWORD?.trim() ?? "";
  let next = value;
  if (pass) next = next.split(pass).join("[redacted]");
  if (spaced && spaced !== pass) next = next.split(spaced).join("[redacted]");
  return next;
}

function imapErrorText(err: unknown): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    const extra = err as Error & {
      code?: string;
      responseText?: string;
      serverResponseCode?: string;
      authenticationFailed?: boolean;
      response?: string;
    };
    return [
      extra.message,
      extra.code,
      extra.responseText,
      extra.serverResponseCode,
      extra.response,
      extra.authenticationFailed ? "authenticationFailed" : "",
    ]
      .filter((part) => typeof part === "string" && part.trim())
      .join(" ");
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function sanitizeImapError(
  err: unknown,
  fallback = "Could not load Yahoo Mail right now."
): string {
  const message = redactSecret(imapErrorText(err));
  const lower = message.toLowerCase();

  if (
    lower.includes("auth") ||
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    lower.includes("login failed") ||
    lower.includes("login denied") ||
    lower.includes("application-specific password") ||
    lower.includes("app password")
  ) {
    return "Yahoo IMAP sign-in failed. Confirm YAHOO_EMAIL is the full mailbox address and YAHOO_APP_PASSWORD is a Yahoo app password, not the account password.";
  }

  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("etimeout") ||
    lower.includes("enotfound") ||
    lower.includes("econnrefused") ||
    lower.includes("econnreset") ||
    lower.includes("enetunreach") ||
    lower.includes("ehostunreach") ||
    lower.includes("eai_again") ||
    lower.includes("certificate") ||
    lower.includes("socket") ||
    lower.includes("closed") ||
    lower.includes("aborted") ||
    lower.includes("destroyed") ||
    lower.includes("noconnection") ||
    lower.includes("not available") ||
    lower.includes("function_invocation")
  ) {
    const host = process.env.YAHOO_IMAP_HOST?.trim() || DEFAULT_HOST;
    return `Could not reach Yahoo IMAP (${host}:993). Check that IMAP is enabled for the mailbox and this network allows outbound mail.`;
  }

  if (lower.includes("too large")) {
    return "That attachment is too large to open in the portal.";
  }

  const detail = message.replace(/\s+/g, " ").trim().slice(0, 180);
  return detail ? `${fallback} ${detail}` : fallback;
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function collapsePreview(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= PREVIEW_MAX_CHARS) return collapsed;
  return `${collapsed.slice(0, PREVIEW_MAX_CHARS - 1)}…`;
}

function localPart(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

function decodeRfc2231(value: string): string {
  const encoded = /^[^']*''(.+)$/.exec(value);
  if (!encoded) return value;
  try {
    return decodeURIComponent(encoded[1]);
  } catch {
    return value;
  }
}

function structureFilename(node: MessageStructureObject): string {
  const disposition = node.dispositionParameters ?? {};
  const parameters = node.parameters ?? {};
  const raw =
    disposition.filename ||
    disposition["filename*"] ||
    parameters.name ||
    parameters["name*"] ||
    "";
  return decodeRfc2231(raw).trim();
}

function isBodyTextPart(node: MessageStructureObject, filename: string): boolean {
  const type = (node.type || "").toLowerCase();
  const disposition = (node.disposition || "").toLowerCase();
  return (
    (type === "text/plain" || type === "text/html") &&
    disposition !== "attachment" &&
    !filename
  );
}

function isAttachmentNode(node: MessageStructureObject): boolean {
  const type = (node.type || "").toLowerCase();
  if (!type || type.startsWith("multipart/")) return false;
  if (SKIP_ATTACHMENT_TYPES.has(type)) return false;

  const filename = structureFilename(node);
  if (isBodyTextPart(node, filename)) return false;

  const disposition = (node.disposition || "").toLowerCase();
  if (disposition === "attachment" || filename) return true;
  if (type.startsWith("image/")) return true;
  if (type.startsWith("audio/") || type.startsWith("video/")) return true;
  if (type.startsWith("application/")) return true;
  if (type === "text/csv" || type === "text/calendar") return true;
  return false;
}

export function attachmentsFromStructure(
  node: MessageStructureObject | undefined,
  collected: EmailAttachment[] = []
): EmailAttachment[] {
  if (!node) return collected;

  if (node.childNodes?.length) {
    for (const child of node.childNodes) {
      attachmentsFromStructure(child, collected);
    }
    return collected;
  }

  if (!isAttachmentNode(node)) return collected;

  const contentType = (node.type || "application/octet-stream").toLowerCase();
  const partId = node.part?.trim() || "1";
  const filename = safeFilename(
    structureFilename(node) || defaultFilename(contentType, partId)
  );

  collected.push({
    partId,
    filename,
    contentType,
    size: typeof node.size === "number" && node.size > 0 ? node.size : 0,
  });
  return collected;
}

async function resolveImapHost(hostname: string): Promise<{
  host: string;
  servername: string;
}> {
  try {
    const { address } = await lookup(hostname, { family: 4 });
    if (address) return { host: address, servername: hostname };
  } catch {
    // Fall back to the hostname if IPv4 lookup fails.
  }
  return { host: hostname, servername: hostname };
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withYahooInbox<T>(
  work: (client: ImapFlow) => Promise<T>,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<T> {
  const auth = getYahooImapAuth();
  if (!auth) {
    throw new Error("Yahoo IMAP is not configured.");
  }

  const resolved = await resolveImapHost(auth.host);
  let lastError: unknown = new Error("Could not connect to Yahoo IMAP.");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const client = new ImapFlow({
      host: resolved.host,
      servername: resolved.servername,
      port: auth.port,
      secure: true,
      disableAutoIdle: true,
      disableCompression: true,
      auth: {
        user: auth.user,
        pass: auth.pass,
        loginMethod: "LOGIN",
      },
      tls: {
        servername: resolved.servername,
        minVersion: "TLSv1.2",
      },
      logger: false,
      emitLogs: false,
      logRaw: false,
      connectionTimeout: CONNECT_TIMEOUT_MS,
      greetingTimeout: CONNECT_TIMEOUT_MS,
      socketTimeout: timeoutMs,
    });

    let socketError: Error | null = null;
    client.on("error", (err) => {
      socketError = err instanceof Error ? err : new Error(String(err));
    });

    const timer = setTimeout(() => {
      client.close();
    }, timeoutMs);

    try {
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");
      try {
        return await work(client);
      } finally {
        lock.release();
      }
    } catch (error) {
      lastError = socketError ?? error;
    } finally {
      clearTimeout(timer);
      try {
        await client.logout();
      } catch {
        try {
          client.close();
        } catch {
          // Connection may already be closed after a timeout.
        }
      }
    }

    if (attempt < 2) await sleep(300 * (attempt + 1));
  }

  throw lastError;
}

async function mapImapMessage(message: {
  uid: number;
  flags?: Set<string>;
  envelope?: {
    date?: Date | string | null;
    subject?: string | null;
    from?: { name?: string | null; address?: string | null }[];
    to?: { name?: string | null; address?: string | null }[];
  };
  internalDate?: Date | string;
  source?: Buffer;
  bodyStructure?: MessageStructureObject;
}): Promise<InboxEmail> {
  const fromHeader = message.envelope?.from?.[0];
  let fromEmail = fromHeader?.address?.trim() || "unknown@email";
  let fromName = fromHeader?.name?.trim() || localPart(fromEmail);
  let subject = message.envelope?.subject?.trim() || "(no subject)";
  let to =
    message.envelope?.to
      ?.map((item) => item.address?.trim())
      .filter((address): address is string => Boolean(address))
      .join(", ") || "";
  let body = "";

  if (message.source && message.source.length > 0) {
    try {
      const parsed = await simpleParser(message.source);
      const parsedFrom = parsed.from?.value?.[0];
      if (parsedFrom?.address) fromEmail = parsedFrom.address;
      if (parsedFrom?.name) fromName = parsedFrom.name;
      if (parsed.subject) subject = parsed.subject;
      const toAddresses = [parsed.to].flat().filter(Boolean);
      const parsedTo = toAddresses.flatMap((entry) => {
        if (!entry || typeof entry !== "object" || !("value" in entry)) return [];
        const list = (entry as { value?: { address?: string | null }[] }).value;
        return (list ?? [])
          .map((item) => item.address?.trim())
          .filter((address): address is string => Boolean(address));
      });
      if (parsedTo.length) to = parsedTo.join(", ");
      const text =
        parsed.text?.trim() ||
        (parsed.html ? htmlToPlain(String(parsed.html)) : "");
      body = text;
    } catch {
      body = "";
    }
  }

  body = body.replace(/\u0000/g, "").trim();
  if (body.length > BODY_MAX_CHARS) {
    body = `${body.slice(0, BODY_MAX_CHARS).trimEnd()}…`;
  }

  const received =
    message.envelope?.date || message.internalDate || new Date();
  const receivedAt =
    received instanceof Date
      ? received.toISOString()
      : new Date(received).toISOString();
  const partial = !body;

  return {
    id: `yahoo-${message.uid}`,
    fromName: fromName || localPart(fromEmail),
    fromEmail,
    to: to || undefined,
    subject,
    preview: collapsePreview(body) || (partial ? "Open to load the full message." : subject),
    body,
    receivedAt: Number.isNaN(Date.parse(receivedAt))
      ? new Date().toISOString()
      : receivedAt,
    read: message.flags?.has("\\Seen") ?? false,
    attachments: attachmentsFromStructure(message.bodyStructure),
    partial,
  };
}

let inboxCache: { at: number; emails: InboxEmail[] } | null = null;
let inboxInflight: Promise<InboxEmail[]> | null = null;
const INBOX_CACHE_MS = 60_000;

async function fetchYahooInboxUncached(limit: number): Promise<InboxEmail[]> {
  const emails: InboxEmail[] = [];
  try {
    await withYahooInbox(async (client) => {
      const mailbox = client.mailbox;
      const exists = mailbox ? mailbox.exists : 0;
      if (!mailbox || exists === 0) return;

      const start = Math.max(1, exists - Math.max(1, limit) + 1);

      for await (const message of client.fetch(`${start}:${exists}`, {
        uid: true,
        envelope: true,
        flags: true,
        internalDate: true,
        bodyStructure: true,
        source: { maxLength: SOURCE_MAX_BYTES },
      })) {
        emails.push(await mapImapMessage(message));
      }
    });
  } catch (error) {
    if (emails.length > 0) {
      emails.sort(
        (a, b) =>
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      );
      return emails;
    }
    throw error;
  }

  emails.sort(
    (a, b) =>
      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  );
  return emails;
}

export async function fetchYahooInbox(
  limit = DEFAULT_LIMIT,
  options?: { fresh?: boolean }
): Promise<InboxEmail[]> {
  if (
    !options?.fresh &&
    inboxCache &&
    Date.now() - inboxCache.at < INBOX_CACHE_MS
  ) {
    return inboxCache.emails;
  }
  if (inboxInflight) return inboxInflight;

  inboxInflight = fetchYahooInboxUncached(limit)
    .then((emails) => {
      inboxCache = { at: Date.now(), emails };
      return emails;
    })
    .finally(() => {
      inboxInflight = null;
    });

  return inboxInflight;
}

export class YahooMessageNotFoundError extends Error {
  constructor() {
    super("That message is not in the mailbox.");
    this.name = "YahooMessageNotFoundError";
  }
}

export async function fetchYahooMessage(uid: number): Promise<InboxEmail> {
  return withYahooInbox(async (client) => {
    const message = await client.fetchOne(
      String(uid),
      {
        uid: true,
        envelope: true,
        flags: true,
        internalDate: true,
        bodyStructure: true,
        source: { maxLength: FULL_SOURCE_MAX_BYTES },
      },
      { uid: true }
    );
    if (!message || typeof message === "boolean") {
      throw new YahooMessageNotFoundError();
    }
    return mapImapMessage({
      ...message,
      uid: message.uid ?? uid,
    });
  }, ATTACHMENT_TIMEOUT_MS);
}

export class YahooAttachmentNotFoundError extends Error {
  constructor() {
    super("That attachment is not available.");
    this.name = "YahooAttachmentNotFoundError";
  }
}

export async function fetchYahooAttachment(
  uid: number,
  partId: string
): Promise<YahooAttachmentPayload> {
  return withYahooInbox(async (client) => {
    const parts = await client.downloadMany(String(uid), [partId], {
      uid: true,
    });
    const downloaded = parts[partId];
    const raw = downloaded?.content;
    if (!raw || !raw.length) {
      throw new YahooAttachmentNotFoundError();
    }

    const content = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    if (content.length > MAX_ATTACHMENT_BYTES) {
      throw new Error("That attachment is too large to open in the portal.");
    }

    const filename = safeFilename(
      downloaded.meta?.filename ||
        defaultFilename(
          downloaded.meta?.contentType || "application/octet-stream",
          partId
        )
    );
    const contentType = sniffContentType(
      downloaded.meta?.contentType || "application/octet-stream",
      filename,
      content
    );

    return { filename, contentType, content };
  }, ATTACHMENT_TIMEOUT_MS);
}
