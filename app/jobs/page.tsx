"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { CreateJobDialog } from "@/components/jobs/create-job-dialog";
import { JobsTable } from "@/components/jobs/jobs-table";
import { MailboxNotice } from "@/components/mailbox-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { jobMatchesQuery, useOperations } from "@/lib/store";
import type { JobStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type JobListFilter = "All" | "P1" | JobStatus;

const JOB_FILTERS: JobListFilter[] = [
  "All",
  "P1",
  "Open",
  "TT Contacted",
  "Completed",
];

export default function JobsPage() {
  const { jobs, hydrated, source } = useOperations();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [flag, setFlag] = useState<JobListFilter>("All");

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (!jobMatchesQuery(job, query)) return false;
      if (flag === "All") return true;
      if (flag === "P1") return job.priority === "P1";
      return job.status === flag;
    });
  }, [flag, jobs, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Jobs
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Works orders parsed from the connected mailbox.
          </p>
        </div>
        <Button
          className="h-10 rounded-lg bg-[#e11d2e] px-4 text-white hover:bg-[#c41626]"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-4" />
          New Job
        </Button>
      </div>

      <MailboxNotice />

      <div className="flex flex-col gap-3 rounded-xl border border-white/8 bg-[#0c0c0c] p-4">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by job number, tenant, address..."
          className="h-10 border-white/10 bg-[#161616]"
        />
        <div className="flex flex-wrap gap-2">
          {JOB_FILTERS.map((value) => (
            <FilterChip
              key={value}
              active={flag === value}
              onClick={() => setFlag(value)}
            >
              {value === "All" ? "All jobs" : value}
            </FilterChip>
          ))}
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-white/8 bg-[#0c0c0c]">
        {!hydrated ? (
          <div className="h-48 animate-pulse" />
        ) : (
          <JobsTable
            jobs={filtered}
            emptyMessage={
              source === "yahoo"
                ? "No jobs match those filters. Clear the search or raise a new job."
                : "No jobs yet. Connect the Yahoo mailbox to import jobsheets."
            }
          />
        )}
      </section>

      <CreateJobDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-[#e11d2e] bg-[#e11d2e] text-white"
          : "border-white/10 bg-transparent text-zinc-400 hover:border-white/20 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}
