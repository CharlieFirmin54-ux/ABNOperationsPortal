"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { YahooMailboxLink } from "@/components/emails/yahoo-mailbox-link";
import { formatDateTime, formatRelative } from "@/lib/format";
import { useOperations } from "@/lib/store";
import { yahooComposeUrl } from "@/lib/yahoo";
import { cn } from "@/lib/utils";

export default function EmailsPage() {
  const { emails, jobs, markEmailRead, hydrated } = useOperations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    emails.find((email) => email.id === selectedId) ?? emails[0] ?? null;
  const linkedJob = jobs.find((job) => job.id === selected?.jobId);
  const unread = emails.filter((email) => !email.read).length;

  const sorted = useMemo(
    () =>
      [...emails].sort(
        (a, b) =>
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      ),
    [emails]
  );

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
        </div>
        <YahooMailboxLink />
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-[#0c0c0c] px-6 py-16 text-center">
          <p className="text-sm text-zinc-500">The inbox is empty.</p>
          <div className="mt-4 flex justify-center">
            <YahooMailboxLink />
          </div>
        </div>
      ) : (
        <div className="grid overflow-hidden rounded-xl border border-white/8 bg-[#0c0c0c] lg:grid-cols-[320px_1fr]">
          <ul className="divide-y divide-white/8 border-b border-white/8 lg:border-r lg:border-b-0">
            {sorted.map((email) => {
              const active = selected?.id === email.id;
              return (
                <li key={email.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(email.id);
                      markEmailRead(email.id);
                    }}
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
              <p className="max-w-2xl text-sm leading-6 text-zinc-300">
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
