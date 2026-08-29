import { buildMailboxFromEmails } from "@/lib/parse-jobs";
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

export async function syncMailboxFromYahoo(options?: {
  fresh?: boolean;
}): Promise<JobsFetchResult> {
  const config = getYahooImapConfig();
  if (!config) {
    return emptyMailboxResult("unconfigured", false, null, null);
  }

  try {
    const fetched = await fetchYahooInbox(undefined, options);
    const built = buildMailboxFromEmails(fetched);
    return {
      source: "yahoo",
      configured: true,
      mailbox: config.user,
      error: null,
      jobs: built.jobs,
      properties: built.properties,
      emails: built.emails,
      notifications: built.notifications,
    };
  } catch (err) {
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
