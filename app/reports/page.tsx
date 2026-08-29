"use client";

import { useMemo } from "react";
import { isOpenJob } from "@/lib/format";
import { STATUSES, useOperations } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MailboxNotice } from "@/components/mailbox-notice";

export default function ReportsPage() {
  const { jobs, properties, hydrated } = useOperations();

  const byStatus = useMemo(
    () =>
      STATUSES.map((status) => ({
        label: status,
        value: jobs.filter((job) => job.status === status).length,
      })),
    [jobs]
  );

  const byOrg = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of jobs) {
      counts.set(job.organisation, (counts.get(job.organisation) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [jobs]);

  const maxStatus = Math.max(1, ...byStatus.map((row) => row.value));
  const maxOrg = Math.max(1, ...byOrg.map((row) => row.value));
  const open = jobs.filter(isOpenJob).length;
  const p1 = jobs.filter((job) => job.priority === "P1" && isOpenJob(job)).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
          Reports
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Workload snapshot from mailbox-synced jobs.
        </p>
      </div>

      <MailboxNotice />

      {!hydrated ? (
        <div className="h-72 animate-pulse rounded-xl border border-white/8 bg-[#0c0c0c]" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Open workload" value={open} hint="Jobs still live" />
            <Stat label="Emergency P1s" value={p1} hint="Need same-day attendance" />
            <Stat
              label="Properties"
              value={properties.length}
              hint="Addresses on contract"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Jobs by status">
              {byStatus.map((row) => (
                <Bar
                  key={row.label}
                  label={row.label}
                  value={row.value}
                  max={maxStatus}
                  color="bg-[#e11d2e]"
                />
              ))}
            </ChartCard>
            <ChartCard title="Jobs by organisation">
              {byOrg.length === 0 ? (
                <p className="text-sm text-zinc-500">No job data yet.</p>
              ) : (
                byOrg.map((row) => (
                  <Bar
                    key={row.label}
                    label={row.label}
                    value={row.value}
                    max={maxOrg}
                    color="bg-blue-500"
                  />
                ))
              )}
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <article className="rounded-xl border border-white/8 bg-[#0c0c0c] p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-600">{hint}</p>
    </article>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/8 bg-[#0c0c0c] p-5">
      <h3 className="mb-5 text-sm font-medium text-white">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${Math.max(value === 0 ? 0 : 8, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}
