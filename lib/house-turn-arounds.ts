import type { JobCategory } from "@/lib/types";

export const HOUSE_TURN_AROUNDS_CATEGORY = "House Renovations" as const;

/** Intermediate mailbox label; still accepted when hydrating stored jobs. */
export const LEGACY_HOUSE_TURN_AROUNDS_CATEGORY = "House Turn Arounds";

/**
 * "10 Day turn around" and flexible variants: hyphens, extra spaces,
 * "turnaround" / "turn-around", optional plural "days". Case-insensitive.
 */
const HOUSE_TURN_AROUND_RE =
  /\b10[\s\-]*days?[\s\-]*turn[\s\-]*around\b/i;

export function isHouseTurnAroundText(
  ...parts: Array<string | null | undefined>
): boolean {
  const haystack = parts.filter(Boolean).join("\n");
  return haystack.length > 0 && HOUSE_TURN_AROUND_RE.test(haystack);
}

export function resolveJobCategory(
  fallback: JobCategory,
  ...parts: Array<string | null | undefined>
): JobCategory {
  return isHouseTurnAroundText(...parts)
    ? HOUSE_TURN_AROUNDS_CATEGORY
    : fallback;
}

export function isHouseTurnAroundsCategory(
  value: string | undefined | null
): boolean {
  return (
    value === HOUSE_TURN_AROUNDS_CATEGORY ||
    value === LEGACY_HOUSE_TURN_AROUNDS_CATEGORY
  );
}
