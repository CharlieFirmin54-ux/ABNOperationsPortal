"use client";

import { useMemo, useState } from "react";
import { Box, Circle, Loader2, RefreshCw } from "lucide-react";
import { JobsTable } from "@/components/jobs/jobs-table";
import { Button } from "@/components/ui/button";
import { isOpenJob } from "@/lib/format";
import { useOperations } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { jobs, createTestJob, hydrated } = useOperations();
  const [refreshing, setRefreshing] = useState(false);
  const [flashId, setFlashId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const p1 = jobs.filter(
      (job) => job.priority === "P1" && isOpenJob(job)
    ).length;
    const open = jobs.filter(isOpenJob).length;
    const completed = jobs.filter((job) => job.status === "Completed").length;
    return { p1, open, completed, total: jobs.length };
  }, [jobs]);

  const recent = useMemo(
    () =>
      [...jobs].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [jobs]
  );

  function handleRefresh() {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 500);
  }

  function handleTestJob() {
    const job = createTestJob();
    setFlashId(job.id);
    window.setTimeout(() => setFlashId(null), 1800);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            ABN Operations Dashboard
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Live overview of maintenance jobs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-lg border-white/10 bg-[#161616] text-white hover:bg-[#1f1f1f]"
            onClick={handleRefresh}
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refresh
          </Button>
          <Button
            className="h-10 rounded-lg bg-[#e11d2e] px-4 text-white hover:bg-[#c41626]"
            onClick={handleTestJob}
          >
            Create Test Job
          </Button>
        </div>
      </div>

      {!hydrated ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-xl border border-white/8 bg-[#0c0c0c]"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="P1 Jobs"
            value={stats.p1}
            description="Highest priority jobs requiring immediate action."
            accent="red"
            icon={<Circle className="size-3 fill-current" />}
          />
          <KpiCard
            label="Open Jobs"
            value={stats.open}
            description="Jobs still waiting to be completed."
            accent="gold"
            icon={<Circle className="size-3 fill-current" />}
          />
          <KpiCard
            label="Completed"
            value={stats.completed}
            description="Successfully completed maintenance jobs."
            accent="green"
            icon={<Circle className="size-3 fill-current" />}
          />
          <KpiCard
            label="Total Jobs"
            value={stats.total}
            description="Total jobs currently stored in the system."
            accent="blue"
            icon={<Box className="size-3.5" />}
          />
        </div>
      )}

      <section
        className={cn(
          "overflow-hidden rounded-xl border border-white/8 bg-[#0c0c0c]",
          flashId && "ring-1 ring-[#e11d2e]/40"
        )}
      >
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-lg font-medium text-white">Recent Jobs</h3>
          <p className="text-sm text-zinc-500">
            Latest maintenance requests received.
          </p>
        </div>
        <JobsTable
          jobs={recent}
          emptyMessage="No jobs in the system yet. Create a test job to get started."
        />
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  description,
  accent,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  accent: "red" | "gold" | "green" | "blue";
  icon: React.ReactNode;
}) {
  const styles = {
    red: {
      card: "border-[#e11d2e]/35 shadow-[0_0_28px_rgba(225,29,46,0.12)]",
      icon: "text-[#e11d2e]",
    },
    gold: {
      card: "border-amber-400/35 shadow-[0_0_28px_rgba(251,191,36,0.10)]",
      icon: "text-amber-400",
    },
    green: {
      card: "border-emerald-500/35 shadow-[0_0_28px_rgba(16,185,129,0.10)]",
      icon: "text-emerald-500",
    },
    blue: {
      card: "border-blue-500/35 shadow-[0_0_28px_rgba(59,130,246,0.12)]",
      icon: "text-blue-500",
    },
  }[accent];

  return (
    <article
      className={cn(
        "rounded-xl border bg-[#0c0c0c] px-5 py-5",
        styles.card
      )}
    >
      <div className={cn("flex items-center gap-2 text-sm text-zinc-300", styles.icon)}>
        {icon}
        <span className="text-zinc-300">{label}</span>
      </div>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-2 text-sm leading-5 text-zinc-500">{description}</p>
    </article>
  );
}
