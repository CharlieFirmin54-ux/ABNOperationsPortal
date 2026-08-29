"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PriorityBadge, StatusBadge } from "@/components/jobs/badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Job } from "@/lib/types";

export function JobsTable({
  jobs,
  emptyMessage = "No jobs match the current filters.",
}: {
  jobs: Job[];
  emptyMessage?: string;
}) {
  const router = useRouter();

  if (jobs.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-white/8 hover:bg-transparent">
          <TableHead className="h-11 px-4 text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
            Job No
          </TableHead>
          <TableHead className="h-11 px-4 text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
            Tenant
          </TableHead>
          <TableHead className="h-11 px-4 text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
            Address
          </TableHead>
          <TableHead className="hidden h-11 px-4 text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase md:table-cell">
            Organisation
          </TableHead>
          <TableHead className="h-11 px-4 text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
            Priority
          </TableHead>
          <TableHead className="h-11 px-4 text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
            Status
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow
            key={job.id}
            className="cursor-pointer border-white/8 bg-transparent hover:bg-white/4"
            onClick={() => router.push(`/jobs/${job.id}`)}
          >
            <TableCell className="px-4 py-4 font-medium text-white">
              <Link href={`/jobs/${job.id}`} className="hover:underline">
                {job.jobNo}
              </Link>
            </TableCell>
            <TableCell className="px-4 py-4 text-zinc-200">{job.tenant}</TableCell>
            <TableCell className="px-4 py-4 text-zinc-300">{job.address}</TableCell>
            <TableCell className="hidden px-4 py-4 text-zinc-300 md:table-cell">
              {job.organisation}
            </TableCell>
            <TableCell className="px-4 py-4">
              {job.priority === "P1" ? (
                <PriorityBadge value={job.priority} />
              ) : (
                <span className="text-zinc-600">—</span>
              )}
            </TableCell>
            <TableCell className="px-4 py-4">
              <StatusBadge value={job.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
