"use client";

import { YahooMailboxLink } from "@/components/emails/yahoo-mailbox-link";
import { Button } from "@/components/ui/button";
import { OPERATOR } from "@/lib/seed-data";
import { useOperations } from "@/lib/store";

export default function SettingsPage() {
  const { resetDemo, jobs, emails, properties } = useOperations();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
          Settings
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Operator profile and demo data for the ABN operations portal.
        </p>
      </div>

      <section className="rounded-xl border border-white/8 bg-[#0c0c0c] p-5">
        <h3 className="text-sm font-medium text-white">Signed-in operator</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Item label="Name" value={OPERATOR.name} />
          <Item label="Role" value={OPERATOR.role} />
          <Item label="Email" value={OPERATOR.email} />
          <Item label="Company" value="ABN Property Maintenance" />
        </dl>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0c0c0c] p-5">
        <h3 className="text-sm font-medium text-white">Yahoo mailbox</h3>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Open Yahoo Mail in a new tab to sign in and use the ABN operations
          inbox directly. Replies from the Emails page also launch Yahoo
          compose.
        </p>
        <div className="mt-4">
          <YahooMailboxLink />
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0c0c0c] p-5">
        <h3 className="text-sm font-medium text-white">Local workspace</h3>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Jobs, emails and notes are stored in this browser so the portal works
          without a database. Connect Supabase later if you want the same
          records shared across devices.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <Item label="Jobs on file" value={String(jobs.length)} />
          <Item label="Properties" value={String(properties.length)} />
          <Item label="Inbox messages" value={String(emails.length)} />
        </dl>
        <Button
          variant="outline"
          className="mt-5 border-white/10 bg-transparent text-white hover:bg-white/5"
          onClick={resetDemo}
        >
          Reset demo data
        </Button>
      </section>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-zinc-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-white">{value}</dd>
    </div>
  );
}
