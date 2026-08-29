"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CategoryBadge, PriorityBadge, StatusBadge } from "@/components/jobs/badges";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { PRIORITIES, STATUSES, useOperations } from "@/lib/store";
import type { JobStatus, Priority } from "@/lib/types";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { jobs, properties, notes, emails, updateJob, addNote, hydrated } =
    useOperations();
  const [note, setNote] = useState("");

  const job = jobs.find((item) => item.id === id);
  const property = properties.find((item) => item.id === job?.propertyId);
  const jobNotes = notes.filter((item) => item.jobId === id);
  const jobEmails = emails.filter((item) => item.jobId === id);

  if (!hydrated) {
    return (
      <div className="h-72 animate-pulse rounded-xl border border-white/8 bg-[#0c0c0c]" />
    );
  }

  if (!job) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#0c0c0c] px-6 py-16 text-center">
        <p className="text-white">That job is not in the system.</p>
        <Link
          href="/jobs"
          className="mt-3 inline-block text-sm text-zinc-500 hover:text-white"
        >
          Back to jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white"
      >
        <ArrowLeft className="size-4" />
        All jobs
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Job {job.jobNo}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            {job.address}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge value={job.priority} />
          <StatusBadge value={job.status} />
          <CategoryBadge value={job.category} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="space-y-4 rounded-xl border border-white/8 bg-[#0c0c0c] p-5">
          <h3 className="text-sm font-medium text-white">Job details</h3>
          {job.description ? (
            <div className="rounded-lg border border-white/10 bg-black/50 p-4">
              <p className="text-[11px] font-medium tracking-[0.14em] text-zinc-300 uppercase">
                Fault
              </p>
              <p className="mt-2 text-base leading-relaxed text-zinc-50">
                {job.description}
              </p>
            </div>
          ) : null}
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Tenant" value={job.tenant} />
            <Field label="Organisation" value={job.organisation} />
            <Field label="Phone" value={job.tenantPhone} />
            <Field label="Email" value={job.tenantEmail} />
            <Field label="Category" value={job.category} />
            <Field label="Raised" value={formatDateTime(job.createdAt)} />
            <Field label="Last updated" value={formatDateTime(job.updatedAt)} />
            {property && (
              <div>
                <dt className="text-[11px] font-medium tracking-[0.14em] text-zinc-300 uppercase">
                  Property
                </dt>
                <dd className="mt-1">
                  <Link
                    href={`/properties/${property.id}`}
                    className="text-sm text-white hover:underline"
                  >
                    {property.address}
                  </Link>
                </dd>
              </div>
            )}
          </dl>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={job.status}
                onChange={(event) =>
                  updateJob(job.id, { status: event.target.value as JobStatus })
                }
                className="h-9 rounded-lg border border-white/10 bg-[#161616] px-3 text-sm text-white"
              >
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={job.priority}
                onChange={(event) =>
                  updateJob(job.id, {
                    priority: event.target.value as Priority,
                  })
                }
                className="h-9 rounded-lg border border-white/10 bg-[#161616] px-3 text-sm text-white"
              >
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {value === "P1" ? "P1" : "Normal"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-white/8 bg-[#0c0c0c] p-5">
          <h3 className="text-sm font-medium text-white">Notes</h3>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add an operations note..."
            className="min-h-24 border-white/10 bg-[#161616]"
          />
          <Button
            className="bg-[#e11d2e] text-white hover:bg-[#c41626]"
            onClick={() => {
              addNote(job.id, note);
              setNote("");
            }}
          >
            Save note
          </Button>
          <div className="space-y-3">
            {jobNotes.length === 0 && (
              <p className="text-sm text-zinc-500">
                No notes yet. Record engineer updates or access details here.
              </p>
            )}
            {jobNotes.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-white/8 bg-black/40 p-3"
              >
                <p className="text-xs text-zinc-500">
                  {item.author} · {formatDateTime(item.createdAt)}
                </p>
                <p className="mt-1 text-sm text-zinc-200">{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-white/8 bg-[#0c0c0c] p-5">
        <h3 className="text-sm font-medium text-white">Related emails</h3>
        {jobEmails.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No emails linked to this job.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-white/8">
            {jobEmails.map((email) => (
              <li key={email.id} className="py-3">
                <Link href="/emails" className="block hover:text-white">
                  <p className="text-sm text-zinc-200">{email.subject}</p>
                  <p className="text-xs text-zinc-500">
                    {email.fromName} · {formatDateTime(email.receivedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-[0.14em] text-zinc-300 uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-white">{value}</dd>
    </div>
  );
}
