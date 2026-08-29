import type { Job, JobStatus } from "@/lib/types";

export function formatLongDate(value: Date | string = new Date()) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function formatRelative(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(value);
}

export function greetingForHour(hour = new Date().getHours()) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export const OPEN_STATUSES: JobStatus[] = [
  "New",
  "Allocated",
  "In Progress",
  "On Hold",
];

export function isOpenJob(job: Job) {
  return OPEN_STATUSES.includes(job.status);
}

export function nextJobNumber(jobs: Job[]) {
  const max = jobs.reduce((highest, job) => {
    const n = Number.parseInt(job.jobNo, 10);
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 39200);
  return String(max + 1);
}
