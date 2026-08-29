import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildMailboxFromEmails } from "@/lib/parse-jobs";
import type { InboxEmail, JobsFetchResult } from "@/lib/types";

const TMP_PATH = path.join("/tmp", "abn-yahoo-mailbox.json");
const MAX_AGE_MS = 1000 * 60 * 60 * 24;

type CachedMailbox = {
  savedAt: number;
  mailbox: string;
  emails: InboxEmail[];
};

let memoryCache: CachedMailbox | null = null;

export function resultFromEmails(
  mailbox: string,
  emails: InboxEmail[],
  error: string | null
): JobsFetchResult {
  const built = buildMailboxFromEmails(emails);
  return {
    source: "yahoo",
    configured: true,
    mailbox,
    error,
    jobs: built.jobs,
    properties: built.properties,
    emails: built.emails,
    notifications: built.notifications,
  };
}

export async function saveMailboxCache(
  mailbox: string,
  emails: InboxEmail[]
): Promise<void> {
  const payload: CachedMailbox = {
    savedAt: Date.now(),
    mailbox,
    emails,
  };
  memoryCache = payload;
  try {
    await mkdir(path.dirname(TMP_PATH), { recursive: true });
    await writeFile(TMP_PATH, `${JSON.stringify(payload)}\n`, "utf8");
  } catch {
    // /tmp is best-effort on serverless; memory still holds this instance.
  }
}

export async function loadMailboxCache(): Promise<CachedMailbox | null> {
  if (memoryCache && Date.now() - memoryCache.savedAt < MAX_AGE_MS) {
    return memoryCache;
  }
  try {
    const raw = await readFile(TMP_PATH, "utf8");
    const parsed = JSON.parse(raw) as CachedMailbox;
    if (
      parsed &&
      typeof parsed.savedAt === "number" &&
      Date.now() - parsed.savedAt < MAX_AGE_MS &&
      Array.isArray(parsed.emails) &&
      parsed.emails.length > 0
    ) {
      memoryCache = parsed;
      return parsed;
    }
  } catch {
    // No cache yet.
  }
  return memoryCache;
}
