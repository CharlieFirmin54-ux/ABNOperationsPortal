"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { CreateJobDialog } from "@/components/jobs/create-job-dialog";
import { JobsTable } from "@/components/jobs/jobs-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { jobMatchesQuery, STATUSES, useOperations } from "@/lib/store";
import type { JobStatus, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRIORITY_FILTERS: Array<Priority | "All"> = ["All", "P1", "P2", "P3", "P4"];

export default function JobsPage() {
  const { jobs, hydrated } = useOperations();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<Priority | "All">("All");
  const [status, setStatus] = useState<JobStatus | "All">("All");

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      if (priority !== "All" && job.priority !== priority) return false;
      if (status !== "All" && job.status !== status) return false;
      return jobMatchesQuery(job, query);
    });
  }, [jobs, priority, query, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Jobs
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Works orders across the ABN portfolio.
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

      <div className="flex flex-col gap-3 rounded-xl border border-white/8 bg-[#0c0c0c] p-4">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by job number, tenant, address..."
          className="h-10 border-white/10 bg-[#161616]"
        />
        <div className="flex flex-wrap gap-2">
          {PRIORITY_FILTERS.map((value) => (
            <FilterChip
              key={value}
              active={priority === value}
              onClick={() => setPriority(value)}
            >
              {value === "All" ? "All priorities" : value}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip active={status === "All"} onClick={() => setStatus("All")}>
            All statuses
          </FilterChip>
          {STATUSES.map((value) => (
            <FilterChip
              key={value}
              active={status === value}
              onClick={() => setStatus(value)}
            >
              {value}
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
            emptyMessage="No jobs match those filters. Clear the search or raise a new job."
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
