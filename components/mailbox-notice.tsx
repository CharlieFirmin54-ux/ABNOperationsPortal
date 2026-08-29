"use client";

import { useOperations } from "@/lib/store";
import { cn } from "@/lib/utils";

export function MailboxNotice({ className }: { className?: string }) {
  const { source, configured, error, syncing, jobs, emails } = useOperations();
  const hasWork = jobs.length > 0 || emails.length > 0;

  if (syncing && source === "unconfigured" && !error) {
    return (
      <p className={cn("text-sm text-zinc-500", className)}>
        Syncing jobs from the Yahoo inbox…
      </p>
    );
  }

  if (!syncing && source === "unconfigured" && !configured) {
    return (
      <div
        className={cn(
          "rounded-xl border border-white/10 bg-[#0c0c0c] px-4 py-3 text-sm text-zinc-400",
          className
        )}
      >
        <p className="font-medium text-white">Connect the Yahoo mailbox</p>
        <p className="mt-1">
          Jobs, properties and repair emails come from the live inbox. Set{" "}
          <code className="text-zinc-300">YAHOO_EMAIL</code> and{" "}
          <code className="text-zinc-300">YAHOO_APP_PASSWORD</code> in{" "}
          <code className="text-zinc-300">.env.local</code>, then refresh.
        </p>
      </div>
    );
  }

  if (error && hasWork) {
    return (
      <p className={cn("text-sm text-zinc-500", className)}>
        Showing the last loaded jobs. Yahoo will refresh in the background.
      </p>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "rounded-xl border border-[#e11d2e]/30 bg-[#e11d2e]/5 px-4 py-3 text-sm text-zinc-300",
          className
        )}
      >
        <p className="font-medium text-white">Could not sync the mailbox</p>
        <p className="mt-1 text-zinc-400">{error}</p>
      </div>
    );
  }

  return null;
}
