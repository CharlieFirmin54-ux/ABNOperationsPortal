"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Paperclip, RefreshCw } from "lucide-react";
import { MessageAttachments } from "@/components/emails/message-attachments";
import { YahooMailboxLink } from "@/components/emails/yahoo-mailbox-link";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useOperations } from "@/lib/store";
import type { InboxEmail, InboxFetchResult } from "@/lib/types";
import { yahooComposeUrl } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

export default function EmailsPage() {
  const { jobs, markEmailRead, hydrated, refreshMailbox } = useOperations();
  const [inbox, setInbox] = useState<InboxFetchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadInbox = useCallback(async (fresh = false) => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch(
        fresh ? "/api/emails?fresh=1" : "/api/emails",
        { cache: "no-store" }
      );
      const data = (await response.json()) as InboxFetchResult & {
        error?: string;
      };
      if (!response.ok && !data.emails) {
        setFetchError(data.error || "Could not reach the emails API.");
        return;
      }
      setInbox((current) => {
        if (data.source === "error" && current?.emails?.length && !data.emails?.length) {
          return { ...current, error: data.error ?? current.error };
        }
        return data;
      });
      if (fresh) void refreshMailbox(false);
    } catch {
      setFetchError("Could not reach the emails API.");
      setInbox(null);
    } finally {
      setLoading(false);
    }
  }, [refreshMailbox]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadInbox(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadInbox]);

  const live = inbox?.source === "yahoo";
  const displayed = useMemo(() => {
    const list = inbox?.emails ?? [];
    return [...list]
      .map((email) =>
        readIds.has(email.id) ? { ...email, read: true } : email
      )
      .sort(
        (a, b) =>
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      );
  }, [inbox?.emails, readIds]);

  const selected =
    displayed.find((email) => email.id === selectedId) ?? displayed[0] ?? null;

  useEffect(() => {
    if (!selected?.id) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    fetch(`/api/emails/${encodeURIComponent(selected.id)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          email?: InboxEmail;
          error?: string;
        };
        if (!response.ok || !data.email) {
          throw new Error(data.error || "Could not load that message.");
        }
        return data.email;
      })
      .then((email) => {
        if (cancelled) return;
        setInbox((current) => {
          if (!current) return current;
          const emails = current.emails.map((item) =>
            item.id === email.id ? { ...item, ...email, partial: false } : item
          );
          return { ...current, emails };
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDetailError(
            err instanceof Error ? err.message : "Could not load that message."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);
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
            onClick={() => void loadInbox(true)}
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
            <code className="text-zinc-300">npm run dev</code>. Jobs and emails
            stay empty until the mailbox is connected.
          </p>
        </div>
      )}

      {(inbox?.error || fetchError) && (
        <div className="rounded-xl border border-[#e11d2e]/30 bg-[#e11d2e]/5 px-4 py-3 text-sm text-zinc-300">
          <p className="font-medium text-white">Could not load Yahoo Mail</p>
          <p className="mt-1 text-zinc-400">{inbox?.error || fetchError}</p>
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
          <ul className="divide-y divide-white/8 overflow-y-auto border-b border-white/8 lg:max-h-[calc(100vh-16rem)] lg:border-r lg:border-b-0">
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
                    {(!email.read || (email.attachments?.length ?? 0) > 0) && (
                      <div className="mt-2 flex items-center gap-2">
                        {!email.read && (
                          <span className="inline-block size-1.5 rounded-full bg-[#e11d2e]" />
                        )}
                        {(email.attachments?.length ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-600">
                            <Paperclip className="size-3" />
                            {email.attachments?.length}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {selected && (
            <article className="space-y-5 overflow-y-auto p-5 lg:max-h-[calc(100vh-16rem)] lg:p-8">
              <div>
                <h3 className="text-xl font-medium text-white">
                  {selected.subject}
                </h3>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <Detail label="From" value={`${selected.fromName} <${selected.fromEmail}>`} />
                  <Detail label="To" value={selected.to || inbox?.mailbox || "—"} />
                  <Detail label="Date" value={formatDateTime(selected.receivedAt)} />
                  <Detail
                    label="Attachments"
                    value={
                      selected.attachments?.length
                        ? `${selected.attachments.length} file${selected.attachments.length === 1 ? "" : "s"}`
                        : "None"
                    }
                  />
                </dl>
              </div>
              {detailError && (
                <p className="text-sm text-[#fca5a5]">{detailError}</p>
              )}
              {detailLoading && (
                <p className="text-sm text-zinc-500">Loading full message…</p>
              )}
              <MessageAttachments
                key={selected.id}
                messageId={selected.id}
                attachments={selected.attachments}
              />
              <section>
                <h4 className="text-sm font-medium text-white">Message</h4>
                {selected.body ? (
                  <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                    {selected.body}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">
                    {detailLoading
                      ? "Fetching the full Yahoo message…"
                      : "No message text was available."}
                  </p>
                )}
              </section>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1 break-words text-zinc-200">{value}</dd>
    </div>
  );
}
