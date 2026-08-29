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
          Operator profile and mailbox sync for the ABN operations portal.
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
          The Emails page and the jobs list load from the Yahoo inbox over IMAP
          when <code className="text-zinc-400">YAHOO_EMAIL</code> and{" "}
          <code className="text-zinc-400">YAHOO_APP_PASSWORD</code> are set in{" "}
          <code className="text-zinc-400">.env.local</code> (Yahoo app password,
          not the account password). Jobsheets and repair reports become jobs;
          Yahoo security mail and supplier marketing are skipped. Until the
          mailbox is connected, jobs and emails stay empty. You can still open
          Yahoo Mail in a new tab; replies launch Yahoo compose.
        </p>
        <div className="mt-4">
          <YahooMailboxLink />
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#0c0c0c] p-5">
        <h3 className="text-sm font-medium text-white">Local workspace</h3>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Jobs are parsed from the connected Yahoo inbox. Status changes and
          notes stay in this browser. Connect Supabase later if you want the
          same records shared across devices.
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
          Clear local notes and status changes
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
