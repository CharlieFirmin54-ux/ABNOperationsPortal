/**
 * Compatibility shim for the House Renovations category.
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
