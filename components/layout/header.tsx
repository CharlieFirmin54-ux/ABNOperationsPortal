"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Menu, Search, User } from "lucide-react";
import { YahooMailboxLink } from "@/components/emails/yahoo-mailbox-link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";
import { formatLongDate, formatRelative, greetingForHour } from "@/lib/format";
import { OPERATOR } from "@/lib/seed-data";
import {
  jobMatchesQuery,
  propertyMatchesQuery,
  useOperations,
} from "@/lib/store";

export function Header() {
  const router = useRouter();
  const { jobs, properties, notifications, markNotificationsRead } =
    useOperations();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const unread = notifications.filter((item) => !item.read).length;

  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return { jobs: [], properties: [] };
    return {
      jobs: jobs.filter((job) => jobMatchesQuery(job, q)).slice(0, 5),
      properties: properties
        .filter((property) => propertyMatchesQuery(property, q))
        .slice(0, 4),
    };
  }, [jobs, properties, query]);

  const showResults =
    query.trim().length >= 2 &&
    (results.jobs.length > 0 || results.properties.length > 0);
  const emptyResults =
    query.trim().length >= 2 &&
    results.jobs.length === 0 &&
    results.properties.length === 0;

  return (
    <header className="flex flex-col gap-4 border-b border-white/8 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden border-white/10 bg-[#111] text-white"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-[28px]">
              {greetingForHour()}
            </h1>
            <p className="text-sm text-zinc-500">{formatLongDate()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <UserChip />
        </div>
      </div>

      <div className="flex flex-1 items-center gap-3 lg:max-w-2xl lg:justify-end">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search jobs, properties..."
            className="h-10 rounded-xl border-white/10 bg-[#161616] pl-9 text-sm text-white placeholder:text-zinc-500"
            onKeyDown={(event) => {
              if (event.key === "Enter" && results.jobs[0]) {
                router.push(`/jobs/${results.jobs[0].id}`);
                setQuery("");
              }
            }}
          />
          {(showResults || emptyResults) && (
            <div className="absolute top-[calc(100%+8px)] right-0 left-0 z-40 overflow-hidden rounded-xl border border-white/10 bg-[#111] shadow-2xl">
              {emptyResults && (
                <p className="px-4 py-3 text-sm text-zinc-500">
                  No jobs or properties match “{query}”.
                </p>
              )}
              {results.jobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-white/5"
                  onClick={() => {
                    router.push(`/jobs/${job.id}`);
                    setQuery("");
                  }}
                >
                  <span className="text-sm text-white">
                    Job {job.jobNo} · {job.tenant}
                  </span>
                  <span className="text-xs text-zinc-500">{job.address}</span>
                </button>
              ))}
              {results.properties.map((property) => (
                <button
                  key={property.id}
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-white/5"
                  onClick={() => {
                    router.push(`/properties/${property.id}`);
                    setQuery("");
                  }}
                >
                  <span className="text-sm text-white">{property.address}</span>
                  <span className="text-xs text-zinc-500">
                    {property.organisation} · {property.tenant}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <YahooMailboxLink
          label="Yahoo Mail"
          className="hidden h-10 shrink-0 sm:inline-flex"
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="relative size-10 rounded-xl border-white/10 bg-[#161616] text-zinc-300"
                aria-label="Notifications"
              />
            }
          >
            <Bell className="size-4" />
            {unread > 0 && (
              <span className="absolute top-2 right-2 size-1.5 rounded-full bg-[#e11d2e]" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-[#111] p-0">
            <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
              <p className="text-xs font-medium text-zinc-400">Notifications</p>
              {unread > 0 && (
                <button
                  type="button"
                  className="text-xs text-zinc-500 hover:text-white"
                  onClick={markNotificationsRead}
                >
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="px-3 py-4 text-sm text-zinc-500">
                No notifications yet.
              </p>
            ) : (
              notifications.slice(0, 6).map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className="block items-start rounded-none px-3 py-3"
                  onClick={() => {
                    if (item.href) router.push(item.href);
                    markNotificationsRead();
                  }}
                >
                  <p className="text-sm text-white">{item.title}</p>
                  <p className="text-xs text-zinc-500">{item.body}</p>
                  <p className="mt-1 text-[11px] text-zinc-600">
                    {formatRelative(item.createdAt)}
                  </p>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden lg:block">
          <UserChip />
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="w-60 border-white/10 bg-black p-0"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}

function UserChip() {
  return (
    <Link href="/settings" className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-[#161616] text-zinc-300">
        <User className="size-4" />
      </span>
      <span className="hidden leading-tight sm:block">
        <span className="block text-sm font-medium text-white">
          {OPERATOR.name}
        </span>
        <span className="block text-xs text-zinc-500">{OPERATOR.role}</span>
      </span>
    </Link>
  );
}
