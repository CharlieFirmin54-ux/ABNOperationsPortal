import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { InboxEmail } from "@/lib/types";

const DEFAULT_HOST = "imap.mail.yahoo.com";
const DEFAULT_PORT = 993;
const DEFAULT_LIMIT = 40;
const FETCH_TIMEOUT_MS = 25_000;
const SOURCE_MAX_BYTES = 150_000;
const BODY_MAX_CHARS = 8_000;
const PREVIEW_MAX_CHARS = 110;

export type YahooImapConfig = {
  host: string;
  port: number;
  user: string;
};

type YahooImapAuth = YahooImapConfig & { pass: string };

export function getYahooImapConfig(): YahooImapConfig | null {
  const auth = getYahooImapAuth();
  if (!auth) return null;
  return { host: auth.host, port: auth.port, user: auth.user };
}

function getYahooImapAuth(): YahooImapAuth | null {
  const user = process.env.YAHOO_EMAIL?.trim();
  const pass = process.env.YAHOO_APP_PASSWORD?.trim();
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
  const pass = process.env.YAHOO_APP_PASSWORD?.trim();
  if (!pass) return value;
  return value.split(pass).join("[redacted]");
}

export function sanitizeImapError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const message = redactSecret(raw);
  const lower = message.toLowerCase();

  if (
    lower.includes("auth") ||
    lower.includes("invalid login") ||
    lower.includes("authenticationfailed") ||
    lower.includes("invalid credentials") ||
    lower.includes("login failed")
  ) {
    return "Yahoo IMAP sign-in failed. Confirm YAHOO_EMAIL is the full mailbox address and YAHOO_APP_PASSWORD is a Yahoo app password, not the account password.";
  }

  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("enotfound") ||
    lower.includes("econnrefused") ||
    lower.includes("econnreset") ||
    lower.includes("eai_again") ||
    lower.includes("certificate") ||
    lower.includes("socket") ||
    lower.includes("closed")
  ) {
    const host = process.env.YAHOO_IMAP_HOST?.trim() || DEFAULT_HOST;
    return `Could not reach Yahoo IMAP (${host}:993). Check that IMAP is enabled for the mailbox and this network allows outbound mail.`;
  }

  return "Could not load Yahoo Mail right now. Showing demo emails instead.";
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

async function mapImapMessage(message: {
  uid: number;
  flags?: Set<string>;
  envelope?: {
    date?: Date | string | null;
    subject?: string | null;
    from?: { name?: string | null; address?: string | null }[];
  };
  internalDate?: Date | string;
  source?: Buffer;
}): Promise<InboxEmail> {
  const fromHeader = message.envelope?.from?.[0];
  let fromEmail = fromHeader?.address?.trim() || "unknown@email";
  let fromName = fromHeader?.name?.trim() || localPart(fromEmail);
  let subject = message.envelope?.subject?.trim() || "(no subject)";
  let body = "";

  if (message.source && message.source.length > 0) {
    try {
      const parsed = await simpleParser(message.source);
      const parsedFrom = parsed.from?.value?.[0];
      if (parsedFrom?.address) fromEmail = parsedFrom.address;
      if (parsedFrom?.name) fromName = parsedFrom.name;
      if (parsed.subject) subject = parsed.subject;
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

  return {
    id: `yahoo-${message.uid}`,
    fromName: fromName || localPart(fromEmail),
    fromEmail,
    subject,
    preview: collapsePreview(body) || subject,
    body: body || subject,
    receivedAt: Number.isNaN(Date.parse(receivedAt))
      ? new Date().toISOString()
      : receivedAt,
    read: message.flags?.has("\\Seen") ?? false,
  };
}

export async function fetchYahooInbox(
  limit = DEFAULT_LIMIT
): Promise<InboxEmail[]> {
  const auth = getYahooImapAuth();
  if (!auth) {
    throw new Error("Yahoo IMAP is not configured.");
  }

  const client = new ImapFlow({
    host: auth.host,
    port: auth.port,
    secure: true,
    auth: {
      user: auth.user,
      pass: auth.pass,
    },
    logger: false,
    emitLogs: false,
    logRaw: false,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });

  const timer = setTimeout(() => {
    client.close();
  }, FETCH_TIMEOUT_MS);

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const exists = client.mailbox?.exists ?? 0;
      if (exists === 0) return [];

      const start = Math.max(1, exists - Math.max(1, limit) + 1);
      const emails: InboxEmail[] = [];

      for await (const message of client.fetch(`${start}:${exists}`, {
        uid: true,
        envelope: true,
        flags: true,
        internalDate: true,
        source: { maxLength: SOURCE_MAX_BYTES },
      })) {
        emails.push(await mapImapMessage(message));
      }

      emails.sort(
        (a, b) =>
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      );
      return emails;
    } finally {
      lock.release();
    }
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
}
