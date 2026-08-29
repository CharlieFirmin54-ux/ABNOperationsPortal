"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { YahooMailboxLink } from "@/components/emails/yahoo-mailbox-link";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useOperations } from "@/lib/store";
import type { InboxEmail, InboxFetchResult } from "@/lib/types";
import { yahooComposeUrl } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

export default function EmailsPage() {
  const { emails: demoEmails, jobs, markEmailRead, hydrated } = useOperations();
  const [inbox, setInbox] = useState<InboxFetchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch("/api/emails", { cache: "no-store" });
      const data = (await response.json()) as InboxFetchResult;
      setInbox(data);
    } catch {
      setFetchError("Could not reach the emails API. Showing demo emails instead.");
      setInbox(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadInbox();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadInbox]);

  const live = inbox?.source === "yahoo";
  const displayed = useMemo(() => {
    const list = live ? inbox?.emails ?? [] : demoEmails;
    return [...list]
      .map((email) =>
        readIds.has(email.id) ? { ...email, read: true } : email
      )
      .sort(
        (a, b) =>
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      );
  }, [demoEmails, inbox?.emails, live, readIds]);

  const selected =
    displayed.find((email) => email.id === selectedId) ?? displayed[0] ?? null;
  const linkedJob = jobs.find(
    (job) => job.id === selected?.jobId || job.jobNo === selected?.jobId
  );
  const unread = displayed.filter((email) => !email.read).length;

  function openEmail(email: InboxEmail) {
    setSelectedId(email.id);
    setReadIds((current) => {
      if (current.has(email.id)) return current;
      const next = new Set(current);
      next.add(email.id);
      return next;
    });
    markEmailRead(email.id);
  }

  if (!hydrated) {
    return (
      <div className="h-96 animate-pulse rounded-xl border border-white/8 bg-[#0c0c0c]" />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Emails
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Repair reports from tenants and letting agents.
            {unread > 0 ? ` ${unread} unread.` : ""}
          </p>
          {live && inbox?.mailbox && (
            <p className="mt-1 text-xs text-zinc-600">
              Live Yahoo inbox · {inbox.mailbox}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-lg border-white/10 bg-[#161616] text-white hover:bg-[#1f1f1f]"
            onClick={() => void loadInbox()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refresh
          </Button>
          <YahooMailboxLink />
        </div>
      </div>

      {loading && (
        <p className="text-sm text-zinc-500">
          {inbox?.configured
            ? "Connecting to Yahoo Mail…"
            : "Checking Yahoo inbox…"}
        </p>
      )}

      {inbox?.source === "unconfigured" && (
        <div className="rounded-xl border border-white/10 bg-[#0c0c0c] px-4 py-3 text-sm text-zinc-400">
          <p className="font-medium text-white">Yahoo inbox is not connected</p>
          <p className="mt-1">
            Create a Yahoo app password, then set{" "}
            <code className="text-zinc-300">YAHOO_EMAIL</code> and{" "}
            <code className="text-zinc-300">YAHOO_APP_PASSWORD</code> in{" "}
            <code className="text-zinc-300">.env.local</code> and restart{" "}
            <code className="text-zinc-300">npm run dev</code>. Demo repair
            emails are shown below so this page stays usable.
          </p>
        </div>
      )}

      {(inbox?.error || fetchError) && (
        <div className="rounded-xl border border-[#e11d2e]/30 bg-[#e11d2e]/5 px-4 py-3 text-sm text-zinc-300">
          <p className="font-medium text-white">Could not load Yahoo Mail</p>
          <p className="mt-1 text-zinc-400">{inbox?.error || fetchError}</p>
          <p className="mt-1 text-zinc-500">
            Showing demo emails so the inbox stays usable.
          </p>
        </div>
      )}

      {displayed.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-[#0c0c0c] px-6 py-16 text-center">
          <p className="text-sm text-zinc-500">The inbox is empty.</p>
          <div className="mt-4 flex justify-center">
            <YahooMailboxLink />
          </div>
        </div>
      ) : (
        <div className="grid overflow-hidden rounded-xl border border-white/8 bg-[#0c0c0c] lg:grid-cols-[320px_1fr]">
          <ul className="divide-y divide-white/8 border-b border-white/8 lg:border-r lg:border-b-0">
            {displayed.map((email) => {
              const active = selected?.id === email.id;
              return (
                <li key={email.id}>
                  <button
                    type="button"
                    onClick={() => openEmail(email)}
                    className={cn(
                      "w-full px-4 py-4 text-left hover:bg-white/4",
                      active && "bg-white/6"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "truncate text-sm",
                          email.read
                            ? "text-zinc-400"
                            : "font-medium text-white"
                        )}
                      >
                        {email.fromName}
                      </p>
                      <span className="shrink-0 text-[11px] text-zinc-600">
                        {formatRelative(email.receivedAt)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-zinc-300">
                      {email.subject}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-600">
                      {email.preview}
                    </p>
                    {!email.read && (
                      <span className="mt-2 inline-block size-1.5 rounded-full bg-[#e11d2e]" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {selected && (
            <article className="space-y-4 p-5 lg:p-8">
              <div>
                <h3 className="text-xl font-medium text-white">
                  {selected.subject}
                </h3>
                <p className="mt-2 text-sm text-zinc-400">
                  {selected.fromName}{" "}
                  <span className="text-zinc-600">
                    &lt;{selected.fromEmail}&gt;
                  </span>
                </p>
                <p className="text-xs text-zinc-600">
                  {formatDateTime(selected.receivedAt)}
                </p>
              </div>
              <p className="max-w-2xl whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                {selected.body}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {linkedJob && (
                  <p className="text-sm text-zinc-500">
                    Linked job{" "}
                    <Link
                      href={`/jobs/${linkedJob.id}`}
                      className="text-white hover:underline"
                    >
                      {linkedJob.jobNo}
                    </Link>
                  </p>
                )}
                <a
                  href={yahooComposeUrl({
                    to: selected.fromEmail,
                    subject: `Re: ${selected.subject}`,
                    body: `\n\n---\nOn ${formatDateTime(selected.receivedAt)}, ${selected.fromName} wrote:\n${selected.body}`,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[#9f7aea] hover:text-white"
                >
                  Reply in Yahoo Mail
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
