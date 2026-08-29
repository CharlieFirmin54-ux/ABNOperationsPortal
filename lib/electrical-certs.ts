import type { JobCategory } from "@/lib/types";

export const ELECTRICAL_CERTS_CATEGORY = "Electrical certs" as const;

/**
 * EICR / electrical certificate / electrical cert / electrical inspection.
 * Flexible on hyphens, extra spaces, and "elec" / "electric" / "electrical".
 */
const ELECTRICAL_CERT_RE =
  /\b(?:EICR|elec(?:tric(?:al)?)?[\s\-]*(?:safety[\s\-]*)?cert(?:ificate)?s?|elec(?:tric(?:al)?)?[\s\-]*inspection(?:s)?)\b/i;

export function isElectricalCertText(
  ...parts: Array<string | null | undefined>
): boolean {
  const haystack = parts.filter(Boolean).join("\n");
  return haystack.length > 0 && ELECTRICAL_CERT_RE.test(haystack);
}

export function resolveElectricalCertCategory(
  fallback: JobCategory,
  ...parts: Array<string | null | undefined>
): JobCategory {
  return isElectricalCertText(...parts) ? ELECTRICAL_CERTS_CATEGORY : fallback;
}
