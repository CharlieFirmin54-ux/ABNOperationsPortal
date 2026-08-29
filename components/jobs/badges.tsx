import { Badge } from "@/components/ui/badge";
import type { JobStatus, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusClass: Record<JobStatus, string> = {
  Open: "border-transparent bg-amber-400 text-black",
  "TT Contacted": "border-transparent bg-blue-600 text-white",
  Completed: "border-transparent bg-emerald-600 text-white",
};

export function PriorityBadge({ value }: { value: Priority }) {
  if (value !== "P1") return null;
  return (
    <Badge className="h-6 rounded-full border-transparent bg-[#e11d2e] px-2.5 font-semibold text-white">
      P1
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
