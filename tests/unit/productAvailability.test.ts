import { describe, expect, it } from "vitest";
import productAvailability from "~/utils/productAvailability";
import { LOW_STOCK_THRESHOLD } from "~/utils/constants/catalog";
import type { Product, ProductVariant } from "~/utils/types/shop";

const product = (over: Partial<Product> = {}): Product => ({
  id: "prd_001",
  slug: "meridian-40",
  name: "Meridian 40",
  brand: "Meridian",
  description: "",
  category: "watches",
  price_ngn: 1_850_000,
  compare_at_ngn: null,
  images: [],
  specs: [],
  tags: [],
  in_stock: true,
  stock_count: null,
  made_to_order: false,
  featured: false,
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

const variant = (over: Partial<ProductVariant> = {}): ProductVariant => ({
  id: "var_a",
  product_id: "prd_001",
  label: "Ivory calf · 40mm",
  options: {},
  price_ngn: 1_850_000,
  in_stock: true,
  position: 0,
  ...over,
});

/**
 * Four product cards, the PDP, the OG image and the admin table all read this
 * one function, so the precedence below is the contract between them. It is
 * also mirrored inside `place_order()` — see `tests/db/placeOrder.test.ts`,
 * which asserts Postgres exempts made-to-order from the sold-out check for the
 * same reason the first case here exists.
 */
describe("productAvailability", () => {
  it("made_to_order wins over !in_stock — it is built on demand, never sold out", () => {
    expect(
      productAvailability(product({ made_to_order: true, in_stock: false })),
    ).toBe("made-to-order");
    // And for a sold-out variant of a made-to-order piece.
    expect(
      productAvailability(
        product({ made_to_order: true, in_stock: false }),
        variant({ in_stock: false }),
      ),
    ).toBe("made-to-order");
  });

  it("!in_stock is sold", () => {
    expect(productAvailability(product({ in_stock: false }))).toBe("sold");
  });

  it("reads the variant's stock, not the product's, when one is passed", () => {
    expect(
      productAvailability(product({ in_stock: true }), variant({ in_stock: false })),
    ).toBe("sold");
    expect(
      productAvailability(product({ in_stock: false }), variant({ in_stock: true })),
    ).toBe("in-stock");
  });

  it("is low-stock at or below the threshold", () => {
    expect(
      productAvailability(product({ stock_count: LOW_STOCK_THRESHOLD })),
    ).toBe("low-stock");
    expect(productAvailability(product({ stock_count: 1 }))).toBe("low-stock");
    expect(
      productAvailability(product({ stock_count: LOW_STOCK_THRESHOLD + 1 })),
    ).toBe("in-stock");
    // `null` means "don't surface a count", not "none left".
    expect(productAvailability(product({ stock_count: null }))).toBe("in-stock");
  });

  /**
   * Scarcity is a product-level signal and variants carry no count of their
   * own, so a low product count must NOT leak onto a selected variant — the
   * chip would claim "2 left" for an option that has its own stock state.
   */
  it("suppresses low-stock once a variant is selected", () => {
    expect(
      productAvailability(product({ stock_count: 1 }), variant({ in_stock: true })),
    ).toBe("in-stock");
  });

  it("sold beats low-stock when a count is set but the piece is off sale", () => {
    expect(
      productAvailability(product({ stock_count: 1, in_stock: false })),
    ).toBe("sold");
  });

  it("is in-stock in the ordinary case", () => {
    expect(productAvailability(product())).toBe("in-stock");
  });
});
