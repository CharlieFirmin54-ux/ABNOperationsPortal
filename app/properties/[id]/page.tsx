"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { JobsTable } from "@/components/jobs/jobs-table";
import { useOperations } from "@/lib/store";

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const { properties, jobs, hydrated } = useOperations();
  const property = properties.find((item) => item.id === params.id);
  const linked = jobs.filter((job) => job.propertyId === params.id);

  if (!hydrated) {
    return (
      <div className="h-72 animate-pulse rounded-xl border border-white/8 bg-[#0c0c0c]" />
    );
  }

  if (!property) {
    return (
      <div className="rounded-xl border border-white/8 bg-[#0c0c0c] px-6 py-16 text-center">
        <p className="text-white">That property is not on the contract.</p>
        <Link
          href="/properties"
          className="mt-3 inline-block text-sm text-zinc-500 hover:text-white"
        >
          Back to properties
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/properties"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white"
      >
        <ArrowLeft className="size-4" />
        All properties
      </Link>

      <div>
        <p className="text-sm text-zinc-500">{property.organisation}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
          {property.address}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {property.postcode} · {property.type} · {property.bedrooms} bedroom
        </p>
      </div>

      <section className="grid gap-4 rounded-xl border border-white/8 bg-[#0c0c0c] p-5 sm:grid-cols-3">
        <Info label="Current tenant" value={property.tenant} />
        <Info label="Letting agent / landlord" value={property.organisation} />
        <Info label="Jobs on file" value={String(linked.length)} />
      </section>

      <section className="overflow-hidden rounded-xl border border-white/8 bg-[#0c0c0c]">
        <div className="px-6 pt-5 pb-3">
          <h3 className="text-lg font-medium text-white">Property jobs</h3>
          <p className="text-sm text-zinc-500">
            Maintenance history for this address.
          </p>
        </div>
        <JobsTable
          jobs={linked}
          emptyMessage="No jobs have been raised for this property yet."
        />
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-zinc-500 uppercase">{label}</p>
      <p className="mt-1 text-sm text-white">{value}</p>
    </div>
  );
}
