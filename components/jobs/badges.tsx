import { Badge } from "@/components/ui/badge";
import { ELECTRICAL_CERTS_CATEGORY } from "@/lib/electrical-certs";
import { categoryLabel } from "@/lib/format";
import { isHouseTurnAroundsCategory } from "@/lib/house-turn-arounds";
import type { JobCategory, JobStatus, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusClass: Record<JobStatus, string> = {
  Open: "border-transparent bg-amber-400 text-black",
  "TT Contacted": "border-transparent bg-blue-600 text-white",
  Completed: "border-transparent bg-emerald-600 text-white",
};

/** UK earth-cable yellow → green, left to right. */
export const electricalCertsPillClass =
  "border-transparent bg-[linear-gradient(to_right,#F7E017,#1B8A3A)] text-black";

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

export function CategoryBadge({ value }: { value: JobCategory }) {
  const turnAround = isHouseTurnAroundsCategory(value);
  const electrical = value === ELECTRICAL_CERTS_CATEGORY;
  return (
    <Badge
      className={cn(
        "h-6 rounded-full px-2.5 font-semibold",
        turnAround
          ? "border-transparent bg-violet-600 text-white"
          : electrical
            ? electricalCertsPillClass
            : "border-white/15 bg-white/8 text-zinc-200"
      )}
    >
      {categoryLabel(value)}
    </Badge>
  );
}
