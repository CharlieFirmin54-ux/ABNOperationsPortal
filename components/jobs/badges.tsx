import { Badge } from "@/components/ui/badge";
import type { JobStatus, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

const priorityClass: Record<Priority, string> = {
  P1: "border-transparent bg-[#e11d2e] text-white",
  P2: "border-transparent bg-orange-500 text-black",
  P3: "border-transparent bg-amber-400 text-black",
  P4: "border-white/10 bg-white/10 text-zinc-200",
};

const statusClass: Record<JobStatus, string> = {
  New: "border-transparent bg-blue-600 text-white",
  Allocated: "border-transparent bg-violet-600 text-white",
  "In Progress": "border-transparent bg-amber-500 text-black",
  "On Hold": "border-white/10 bg-zinc-700 text-zinc-100",
  Completed: "border-transparent bg-emerald-600 text-white",
  Cancelled: "border-white/10 bg-zinc-800 text-zinc-400",
};

export function PriorityBadge({ value }: { value: Priority }) {
  return (
    <Badge className={cn("h-6 rounded-full px-2.5 font-semibold", priorityClass[value])}>
      {value}
    </Badge>
  );
}

export function StatusBadge({ value }: { value: JobStatus }) {
  return (
    <Badge className={cn("h-6 rounded-full px-2.5 font-semibold", statusClass[value])}>
      {value}
    </Badge>
  );
}
