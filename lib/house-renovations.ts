/**
 * Compatibility shim: the category label is House Turn Arounds.
 * Detection is unchanged (10-day turnaround phrases in job emails).
 */
export {
  HOUSE_TURN_AROUNDS_CATEGORY,
  HOUSE_TURN_AROUNDS_CATEGORY as HOUSE_RENOVATIONS_CATEGORY,
  isHouseTurnAroundText,
  isHouseTurnAroundText as isHouseRenovationText,
  isHouseTurnAroundsCategory,
  resolveJobCategory,
} from "@/lib/house-turn-arounds";
