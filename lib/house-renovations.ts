import type { JobCategory } from "@/lib/types";

export const HOUSE_RENOVATIONS_CATEGORY = "House Renovations" as const;

/**
 * "10 Day turn around" and flexible variants: hyphens, extra spaces,
 * "turnaround" / "turn-around", optional plural "days". Case-insensitive.
 */
const HOUSE_RENOVATION_RE =
  /\b10[\s\-]*days?[\s\-]*turn[\s\-]*around\b/i;

export function isHouseRenovationText(
  ...parts: Array<string | null | undefined>
): boolean {
  const haystack = parts.filter(Boolean).join("\n");
  return haystack.length > 0 && HOUSE_RENOVATION_RE.test(haystack);
}

export function resolveJobCategory(
  fallback: JobCategory,
  ...parts: Array<string | null | undefined>
): JobCategory {
  return isHouseRenovationText(...parts) ? HOUSE_RENOVATIONS_CATEGORY : fallback;
}
