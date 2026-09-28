import { describe, expect, it } from "vitest";
import cartLineKey from "~/utils/cartLineKey";

/**
 * The bug this guards: without the variant in the key, adding the 40mm on
 * steel to a bag that already holds the 40mm on ivory silently increments the
 * ivory line instead of adding a second one. The customer gets two of the wrong
 * strap and nothing warns anybody.
 *
 * `CartLine.variant_id` is `string | undefined` (absent, not null) — so the
 * "no variant" cases below are the only ones the type admits.
 */
describe("cartLineKey", () => {
  it("falls back to the product id when there is no variant", () => {
    expect(cartLineKey({ product_id: "prd_001" })).toBe("prd_001");
    expect(cartLineKey({ product_id: "prd_001", variant_id: undefined })).toBe(
      "prd_001",
    );
    // An empty string is falsy, so it behaves as "no variant" rather than
    // producing the dangling key `prd_001::`.
    expect(cartLineKey({ product_id: "prd_001", variant_id: "" })).toBe(
      "prd_001",
    );
  });

  it("includes the variant so two options are two lines", () => {
    const ivory = cartLineKey({ product_id: "prd_001", variant_id: "var_a" });
    const steel = cartLineKey({ product_id: "prd_001", variant_id: "var_b" });

    expect(ivory).toBe("prd_001::var_a");
    expect(steel).toBe("prd_001::var_b");
    expect(ivory).not.toBe(steel);
  });

  it("never collides with the variant-less key for the same product", () => {
    expect(cartLineKey({ product_id: "prd_001", variant_id: "var_a" })).not.toBe(
      cartLineKey({ product_id: "prd_001" }),
    );
  });

  it("is stable — the same line always yields the same key", () => {
    expect(cartLineKey({ product_id: "p", variant_id: "v" })).toBe(
      cartLineKey({ product_id: "p", variant_id: "v" }),
    );
  });
});
