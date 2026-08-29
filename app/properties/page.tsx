"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useOperations } from "@/lib/store";
import { isOpenJob } from "@/lib/format";
import { MailboxNotice } from "@/components/mailbox-notice";

export default function PropertiesPage() {
  const { properties, jobs, hydrated } = useOperations();

  const rows = useMemo(
    () =>
      properties.map((property) => {
        const linked = jobs.filter((job) => job.propertyId === property.id);
        return {
          property,
          open: linked.filter(isOpenJob).length,
          total: linked.length,
        };
      }),
    [jobs, properties]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
          Properties
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Addresses taken from jobsheets in the connected mailbox.
        </p>
      </div>

      <MailboxNotice />

      {!hydrated ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-xl border border-white/8 bg-[#0c0c0c]"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-[#0c0c0c] px-6 py-16 text-center text-sm text-zinc-500">
          No properties yet. Addresses appear here once jobsheets in the mailbox
          include a parseable address.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map(({ property, open, total }) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="rounded-xl border border-white/8 bg-[#0c0c0c] p-5 transition-colors hover:border-white/20"
            >
              <p className="text-xs tracking-wide text-zinc-500 uppercase">
                {property.organisation}
              </p>
              <h3 className="mt-2 text-lg font-medium text-white">
                {property.address}
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                {property.tenant} · {property.type} · {property.bedrooms} bed ·{" "}
                {property.postcode}
              </p>
              <div className="mt-4 flex gap-4 text-sm">
                <span className="text-amber-400">{open} open</span>
                <span className="text-zinc-500">{total} jobs</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
