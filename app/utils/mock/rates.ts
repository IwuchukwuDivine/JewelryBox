import type { DeliveryRate } from "~/utils/types/shop";
import { LAGOS } from "~/utils/types/shop";
import { LAGOS_AREA_GROUPS } from "~/utils/constants/lagosAreas";
import { NIGERIAN_STATES } from "~/utils/constants/states";

/**
 * Delivery rates — one row per priced destination.
 *
 * Lagos goes by dispatch rider, priced per area; every other state goes by
 * air freight, priced per state. The customer never picks the method:
 * `deliveryMethodForState()` derives it from the address.
 *
 * Two destinations are deliberately left unpriced so checkout's
 * "Delivery quoted after you order" path is reachable in the mock lane:
 * Zamfara has no row at all, and Bayelsa's row is inactive.
 */

/** Rider cost rises with distance from the Mainland depot. */
const AREA_FEE_BY_GROUP: Record<string, number> = {
  Mainland: 5_000,
  Island: 6_500,
  "Lekki–Epe corridor": 8_000,
  Outskirts: 10_000,
};

/** States with a daily flight run are cheaper than those without. */
const FLIGHT_TIER_1 = 12_000; // major hubs
const FLIGHT_TIER_2 = 16_000; // everywhere else
const HUB_STATES = new Set([
  "FCT (Abuja)",
  "Rivers",
  "Oyo",
  "Kano",
  "Enugu",
  "Kaduna",
  "Delta",
  "Edo",
  "Anambra",
  "Akwa Ibom",
]);

/** No row at all — resolves to null, fee follows by email. */
const UNPRICED_STATES = new Set(["Zamfara"]);
/** Has a row, but switched off in admin. Also resolves to null. */
const INACTIVE_STATES = new Set(["Bayelsa"]);

const areas: DeliveryRate[] = LAGOS_AREA_GROUPS.flatMap((group, groupIndex) =>
  group.areas.map(
    (area, areaIndex): DeliveryRate => ({
      id: `rate_area_${groupIndex + 1}_${areaIndex + 1}`,
      mode: "dispatch",
      name: area,
      state: LAGOS,
      fee_ngn: AREA_FEE_BY_GROUP[group.label] ?? 8_000,
      active: true,
      position: groupIndex * 100 + areaIndex,
    }),
  ),
);

const states: DeliveryRate[] = NIGERIAN_STATES.filter(
  (state) => state !== LAGOS && !UNPRICED_STATES.has(state),
).map(
  (state, index): DeliveryRate => ({
    id: `rate_state_${index + 1}`,
    mode: "flight",
    name: state,
    state,
    fee_ngn: HUB_STATES.has(state) ? FLIGHT_TIER_1 : FLIGHT_TIER_2,
    active: !INACTIVE_STATES.has(state),
    position: index,
  }),
);

export const MOCK_RATES: DeliveryRate[] = [...areas, ...states];
