import { describe, expect, it } from "vitest";
import deliveryMethodForState from "~/utils/deliveryMethodForState";
import { NIGERIAN_STATES } from "~/utils/constants/states";

/**
 * The customer never picks a delivery method — checkout derives it from the
 * address state and `place_order()` derives it again server-side. Both
 * derivations are the same one-line test, so this is the canonical statement of
 * it, and `tests/db/placeOrder.test.ts` asserts Postgres agrees.
 */
describe("deliveryMethodForState", () => {
  it("routes Lagos to dispatch regardless of casing or padding", () => {
    expect(deliveryMethodForState("Lagos")).toBe("dispatch");
    expect(deliveryMethodForState("lagos")).toBe("dispatch");
    expect(deliveryMethodForState("LAGOS")).toBe("dispatch");
    expect(deliveryMethodForState("  LAGOS  ")).toBe("dispatch");
    expect(deliveryMethodForState("\tLaGoS\n")).toBe("dispatch");
  });

  it("routes every other state to flight", () => {
    expect(deliveryMethodForState("Kano")).toBe("flight");
    expect(deliveryMethodForState("FCT (Abuja)")).toBe("flight");
    expect(deliveryMethodForState("Ogun")).toBe("flight");
    // Adjacent to Lagos, and a substring trap: not Lagos.
    expect(deliveryMethodForState("Lagos State")).toBe("flight");
    expect(deliveryMethodForState("")).toBe("flight");
  });

  it("classifies all 37 states, with Lagos the only dispatch one", () => {
    const dispatch = NIGERIAN_STATES.filter(
      (state) => deliveryMethodForState(state) === "dispatch",
    );
    expect(dispatch).toEqual(["Lagos"]);
    expect(NIGERIAN_STATES).toHaveLength(37);
  });
});
