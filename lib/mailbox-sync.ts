import { after } from "next/server";
import { loadMailboxCache, resultFromEmails, saveMailboxCache } from "@/lib/mailbox-cache";
import type { InboxSource, JobsFetchResult } from "@/lib/types";
import {
  fetchYahooInbox,
  getYahooImapConfig,
  sanitizeImapError,
} from "@/lib/yahoo-imap";

export function emptyMailboxResult(
  source: InboxSource,
  configured: boolean,
  mailbox: string | null,
  error: string | null
): JobsFetchResult {
  return {
    source,
    configured,
    mailbox,
    error,
    jobs: [],
    properties: [],
    emails: [],
    notifications: [],
  };
}

async function liveSync(fresh: boolean) {
  const fetched = await fetchYahooInbox(undefined, { fresh });
  return fetched;
}

export async function syncMailboxFromYahoo(options?: {
  fresh?: boolean;
}): Promise<JobsFetchResult> {
  const config = getYahooImapConfig();
  if (!config) {
    return emptyMailboxResult("unconfigured", false, null, null);
  }

  const fresh = Boolean(options?.fresh);
  const cached = await loadMailboxCache();

  if (cached && !fresh) {
    try {
      after(() => {
        void liveSync(true)
          .then((emails) => saveMailboxCache(config.user, emails))
          .catch(() => {
            // Keep serving the last good inbox.
          });
      });
    } catch {
      void liveSync(true)
        .then((emails) => saveMailboxCache(config.user, emails))
        .catch(() => undefined);
    }
    return resultFromEmails(cached.mailbox || config.user, cached.emails, null);
  }

  try {
    const fetched = await liveSync(true);
    await saveMailboxCache(config.user, fetched);
    return resultFromEmails(config.user, fetched, null);
  } catch (err) {
    if (cached) {
      return resultFromEmails(cached.mailbox || config.user, cached.emails, null);
    }
    return emptyMailboxResult(
      "error",
      true,
      config.user,
      sanitizeImapError(err)
    );
  }
}

export function wantsFresh(request: Request): boolean {
  const url = new URL(request.url);
  const raw = url.searchParams.get("fresh");
  return raw === "1" || raw === "true";
}
