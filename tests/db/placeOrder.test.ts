import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rows } from "./helpers/sql";
import { address, scope, uniq, type Scope } from "./helpers/fixtures";
import { rpcError, service } from "./helpers/supabase";
import deliveryMethodForState from "~/utils/deliveryMethodForState";

/**
 * `place_order()` is the only path by which a row reaches `orders`, and it is
 * callable by anon. Everything that decides money is therefore asserted here:
 * the price comes from the catalogue, the method from the address, the fee from
 * `delivery_rates`, and `total_ngn` from the generated column.
 *
 * States are chosen at runtime from the ones that have no rate row, because the
 * database is shared and the seed prices most of them. Hardcoding "Kano" would
 * make this file pass today and collide the day the seed lands.
 */

let fx: Scope;

/** A state that already has an active flight rate, with the fee it carries. */
let priced: { state: string; fee: number };
/** A state with no active flight rate, so an order there is quoted later. */
let unpricedState: string;

/**
 * States with no *active* flight rate.
 *
 * "No active rate" is the condition `place_order` actually tests, and it is also
 * the one the seed leaves reachable on purpose — Zamfara has no row and
 * Bayelsa's is switched off, so the "quoted after you order" path stays
 * testable against real data rather than only against fixtures.
 */
const unpricedStates = (count: number): string[] =>
  rows<{ state: string }>(
    `select s as state
       from unnest(public.nigerian_states()) s
      where s <> 'Lagos'
        and not exists (
          select 1 from public.delivery_rates r
           where r.mode = 'flight' and lower(r.name) = lower(s) and r.active)
      order by s
      limit ${count}`,
  ).map((r) => r.state);

beforeAll(async () => {
  fx = scope();

  /*
   * Nothing below hardcodes a state or a fee.
   *
   * A flight rate's `name` must equal its `state` and the state must be in the
   * allowlist, so — unlike a Lagos area — a flight fixture cannot invent a
   * destination nobody else uses. `seed.sql` will price most states at prices
   * the vendor has not chosen yet, so this adopts whatever active rate is
   * already there and reads the fee off the row, and only creates one when the
   * database has none.
   */
  const existing = rows<{ name: string; fee_ngn: number }>(
    `select name, fee_ngn from public.delivery_rates
      where mode = 'flight' and active order by name limit 1`,
  );

  const free = unpricedStates(2);
  if (existing.length) {
    priced = { state: existing[0]!.name, fee: existing[0]!.fee_ngn };
  } else {
    const host = free.pop();
    if (!host) {
      throw new Error(
        "No active flight rate and no unpriced state to create one on — the shared database prices every state.",
      );
    }
    const created = await fx.rate({
      mode: "flight",
      name: host,
      state: host,
      fee_ngn: 25_000,
    });
    priced = { state: created.name, fee: created.fee_ngn };
  }

  const remaining = free[0];
  if (!remaining) {
    throw new Error(
      "No state without an active flight rate; the unpriced-destination path cannot be tested. The seed is supposed to leave at least one (Zamfara).",
    );
  }
  unpricedState = remaining;
});

afterAll(async () => {
  await fx.destroy();
});

describe("delivery pricing", () => {
  it("prices a Lagos address from the dispatch row for its area", async () => {
    const area = `Test Area ${uniq()}`;
    const rate = await fx.rate({
      mode: "dispatch",
      name: area,
      state: "Lagos",
      fee_ngn: 6_500,
    });
    const product = await fx.product({ price_ngn: 250_000 });

    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 2 }],
      address: address({ state: "Lagos", area }),
    });

    expect(order.delivery_method).toBe("dispatch");
    expect(order.delivery_destination).toBe(rate.name);
    expect(order.delivery_fee_ngn).toBe(6_500);
    expect(order.subtotal_ngn).toBe(500_000);
    expect(order.total_ngn).toBe(506_500);
    // The method the database derived is the method the client-side helper
    // would have derived from the same state.
    expect(order.delivery_method).toBe(deliveryMethodForState("Lagos"));
  });

  it("matches the area case-insensitively but stores the vendor's casing", async () => {
    const area = `Test Area ${uniq()}`;
    const rate = await fx.rate({
      mode: "dispatch",
      name: area,
      state: "Lagos",
      fee_ngn: 4_000,
    });
    const product = await fx.product({ price_ngn: 10_000 });

    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area: `  ${area.toUpperCase()}  ` }),
    });

    expect(order.delivery_fee_ngn).toBe(4_000);
    // Her spelling on the admin table, not whatever the customer typed.
    expect(order.delivery_destination).toBe(rate.name);
  });

  it("prices another state from its flight row", async () => {
    const product = await fx.product({ price_ngn: 300_000 });

    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: priced.state }),
    });

    expect(order.delivery_method).toBe("flight");
    expect(order.delivery_method).toBe(deliveryMethodForState(priced.state));
    expect(order.delivery_destination).toBe(priced.state);
    // The fee is read off the row rather than asserted as a literal: the
    // vendor's real prices land with the seed and are hers to change.
    expect(order.delivery_fee_ngn).toBe(priced.fee);
    expect(order.total_ngn).toBe(300_000 + priced.fee);
  });

  /**
   * An unpriced destination is NOT an error. It is a destination she has not
   * quoted yet: the order is placed with a null fee and the amount follows by
   * email. A null fee can never undercharge, so this is the safe direction —
   * and `total_ngn` must equal the subtotal rather than becoming null.
   */
  it("places an order to an unpriced state with a null fee", async () => {
    const product = await fx.product({ price_ngn: 90_000 });

    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 3 }],
      address: address({ state: unpricedState }),
    });

    expect(order.delivery_fee_ngn).toBeNull();
    expect(order.subtotal_ngn).toBe(270_000);
    expect(order.total_ngn).toBe(270_000);
    expect(order.status).toBe("received");
    // Still records where it was going, taken from the address rather than the
    // (absent) rate row.
    expect(order.delivery_destination).toBe(unpricedState);
  });

  it("places an order to an unpriced Lagos area with a null fee", async () => {
    const area = `Test Area ${uniq()}`;
    const product = await fx.product({ price_ngn: 15_000 });

    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area }),
    });

    expect(order.delivery_method).toBe("dispatch");
    expect(order.delivery_destination).toBe(area);
    expect(order.delivery_fee_ngn).toBeNull();
    expect(order.total_ngn).toBe(order.subtotal_ngn);
  });

  it("treats an inactive rate as unpriced rather than free", async () => {
    const area = `Test Area ${uniq()}`;
    await fx.rate({
      mode: "dispatch",
      name: area,
      state: "Lagos",
      fee_ngn: 8_000,
      active: false,
    });
    const product = await fx.product({ price_ngn: 20_000 });

    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area }),
    });

    expect(order.delivery_fee_ngn).toBeNull();
    expect(order.total_ngn).toBe(20_000);
  });

  it("charges a zero fee as zero, not as unpriced", async () => {
    const area = `Test Area ${uniq()}`;
    await fx.rate({
      mode: "dispatch",
      name: area,
      state: "Lagos",
      fee_ngn: 0,
    });
    const product = await fx.product({ price_ngn: 20_000 });

    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area }),
    });

    // Free delivery and "not quoted yet" are different facts and must not
    // collapse into the same null.
    expect(order.delivery_fee_ngn).toBe(0);
    expect(order.total_ngn).toBe(20_000);
  });
});

describe("repricing", () => {
  /**
   * The headline security property: `PlaceOrderInput` has no price field, so a
   * price sent anyway must be read by nothing at all.
   */
  it("ignores a price sent by the client and charges the catalogue price", async () => {
    const product = await fx.product({ price_ngn: 1_850_000 });

    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1, price_ngn: 1 }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    expect(order.subtotal_ngn).toBe(1_850_000);
    expect(order.items[0]!.price_ngn).toBe(1_850_000);
    expect(order.total_ngn).toBe(1_850_000);
  });

  it("prices a variant line from the variant, not the product", async () => {
    const product = await fx.product({ price_ngn: 100_000 });
    const variant = await fx.variant(product.id, {
      price_ngn: 175_000,
      label: "Steel · 40mm",
    });

    const order = await fx.placeOk({
      items: [
        { product_id: product.id, quantity: 2, variant_id: variant.id, price_ngn: 5 },
      ],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    expect(order.subtotal_ngn).toBe(350_000);
    expect(order.items).toHaveLength(1);
    expect(order.items[0]!.price_ngn).toBe(175_000);
    expect(order.items[0]!.variant_id).toBe(variant.id);
    expect(order.items[0]!.variant_label).toBe("Steel · 40mm");
  });

  it("snapshots the fields OrderItem requires, brand included", async () => {
    const product = await fx.product({
      price_ngn: 42_000,
      brand: "Meridian",
      images: ["https://example.test/hero.jpg", "https://example.test/two.jpg"],
    });

    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    expect(order.items[0]).toMatchObject({
      product_id: product.id,
      name: product.name,
      brand: "Meridian",
      price_ngn: 42_000,
      quantity: 1,
      image: "https://example.test/hero.jpg",
    });
    // No variant on this line, and `jsonb_strip_nulls` means the keys are
    // absent rather than null.
    expect(order.items[0]!.variant_id).toBeUndefined();
  });

  it("rebuilds the shipping address instead of storing what was sent", async () => {
    const product = await fx.product();
    const email = `JB-Test-${uniq()}@Example.Test`;

    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1 }],
      address: {
        ...address({ state: "Lagos", area: "  Ikeja  ", email }),
        line1: "  12 Test Close  ",
        // Not an Address field. Must not survive into the vendor's inbox.
        ...({ injected: "x".repeat(1000) } as Record<string, unknown>),
      },
    });

    const stored = order.shipping_address;
    expect(stored.email).toBe(email.trim().toLowerCase());
    expect(stored.line1).toBe("12 Test Close");
    expect(stored.area).toBe("Ikeja");
    expect(stored.country).toBe("NG");
    expect(stored.injected).toBeUndefined();
    expect(Object.keys(stored).sort()).toEqual(
      ["area", "city", "country", "email", "full_name", "line1", "phone", "state"].sort(),
    );
  });

  it("opens the timeline with a received entry stamped in UTC", async () => {
    const product = await fx.product();
    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    expect(order.status).toBe("received");
    expect(order.status_history).toHaveLength(1);
    expect(order.status_history[0]!.status).toBe("received");
    // An offsetless ISO string parses as LOCAL time in JS, so the literal Z is
    // the whole point.
    expect(order.status_history[0]!.at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    );
  });

  it("allocates a Crockford reference and no user for a guest order", async () => {
    const product = await fx.product();
    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    expect(order.order_number).toMatch(/^JB-[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(order.user_id).toBeNull();
    expect(order.is_paid).toBe(false);
    expect(order.paid_at).toBeNull();
  });
});

describe("rate_id is validated, never trusted", () => {
  it("rejects a Lagos area rate attached to a non-Lagos address", async () => {
    const area = `Test Area ${uniq()}`;
    const lagosRate = await fx.rate({
      mode: "dispatch",
      name: area,
      state: "Lagos",
      fee_ngn: 1_000,
    });
    const product = await fx.product();

    const { order, error } = await fx.place({
      items: [{ product_id: product.id, quantity: 1 }],
      // A destination that has its own flight rate, so the only thing wrong
      // with the request is the rate the client attached to it.
      address: address({ state: priced.state }),
      delivery: { rate_id: lagosRate.id },
    });

    expect(order).toBeNull();
    expect(rpcError(error).hint).toBe("rate_mismatch");
  });

  it("accepts the rate it would have resolved anyway", async () => {
    const area = `Test Area ${uniq()}`;
    const rate = await fx.rate({
      mode: "dispatch",
      name: area,
      state: "Lagos",
      fee_ngn: 3_000,
    });
    const product = await fx.product({ price_ngn: 50_000 });

    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area }),
      delivery: { rate_id: rate.id },
    });

    expect(order.delivery_fee_ngn).toBe(3_000);
  });

  it("rejects any rate_id for an unpriced destination", async () => {
    const area = `Test Area ${uniq()}`;
    const other = await fx.rate({
      mode: "dispatch",
      name: `Test Area ${uniq()}`,
      state: "Lagos",
      fee_ngn: 2_000,
    });
    const product = await fx.product();

    const { error } = await fx.place({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area }),
      delivery: { rate_id: other.id },
    });

    expect(rpcError(error).hint).toBe("rate_mismatch");
  });

  it("ignores an absent or blank rate_id", async () => {
    const product = await fx.product({ price_ngn: 11_000 });
    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
      delivery: { rate_id: "" },
    });
    expect(order.subtotal_ngn).toBe(11_000);
  });
});

describe("sold out, and the made_to_order exemption", () => {
  /**
   * `productAvailability()` short-circuits on `made_to_order` *before* it
   * consults `in_stock`, for the variant as well as the product. `place_order`
   * has to agree, or three seeded fixtures become unorderable and the storefront
   * offers a piece checkout then refuses.
   */
  it("exempts a made-to-order product from the sold-out check", async () => {
    const product = await fx.product({
      made_to_order: true,
      in_stock: false,
      price_ngn: 60_000,
    });

    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    expect(order.subtotal_ngn).toBe(60_000);
  });

  it("exempts a selected variant of a made-to-order product too", async () => {
    const product = await fx.product({ made_to_order: true, in_stock: false });
    const variant = await fx.variant(product.id, {
      in_stock: false,
      price_ngn: 70_000,
    });

    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1, variant_id: variant.id }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    expect(order.subtotal_ngn).toBe(70_000);
  });

  it("refuses an out-of-stock product that is not made to order", async () => {
    const product = await fx.product({ in_stock: false, made_to_order: false });

    const { order, error } = await fx.place({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    expect(order).toBeNull();
    expect(rpcError(error).hint).toBe("sold_out");
  });

  it("refuses an out-of-stock variant of an in-stock product", async () => {
    const product = await fx.product({ in_stock: true, made_to_order: false });
    const variant = await fx.variant(product.id, { in_stock: false });

    const { error } = await fx.place({
      items: [{ product_id: product.id, quantity: 1, variant_id: variant.id }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    expect(rpcError(error).hint).toBe("sold_out");
  });

  it("refuses an archived product, which is otherwise still orderable by id", async () => {
    const product = await fx.product();
    const { error: archive } = await service()
      .from("products")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", product.id);
    expect(archive).toBeNull();

    const { error } = await fx.place({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    expect(rpcError(error).hint).toBe("product_unavailable");
  });
});

describe("duplicate lines are folded", () => {
  it("merges the same product listed twice into one line with the summed quantity", async () => {
    const product = await fx.product({ price_ngn: 30_000 });

    const order = await fx.placeOk({
      items: [
        { product_id: product.id, quantity: 2 },
        { product_id: product.id, quantity: 3 },
      ],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    expect(order.items).toHaveLength(1);
    expect(order.items[0]!.quantity).toBe(5);
    expect(order.subtotal_ngn).toBe(150_000);
  });

  it("keeps two variants of one product as two lines", async () => {
    const product = await fx.product({ price_ngn: 10_000 });
    const a = await fx.variant(product.id, { price_ngn: 11_000 });
    const b = await fx.variant(product.id, { price_ngn: 12_000 });

    const order = await fx.placeOk({
      items: [
        { product_id: product.id, quantity: 1, variant_id: a.id },
        { product_id: product.id, quantity: 1, variant_id: b.id },
      ],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    expect(order.items).toHaveLength(2);
    expect(order.subtotal_ngn).toBe(23_000);
  });

  /**
   * Folding happens BEFORE the per-line cap, or listing a piece twice is how
   * you buy 120 of it.
   */
  it("does not let duplicates dodge the 99-per-line cap", async () => {
    const product = await fx.product({ price_ngn: 1_000 });

    const { order, error } = await fx.place({
      items: [
        { product_id: product.id, quantity: 60 },
        { product_id: product.id, quantity: 60 },
      ],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    expect(order).toBeNull();
    expect(rpcError(error).hint).toBe("invalid_quantity");
  });

  it("accepts a folded quantity that stays inside the cap", async () => {
    const product = await fx.product({ price_ngn: 1_000 });

    const order = await fx.placeOk({
      items: [
        { product_id: product.id, quantity: 50 },
        { product_id: product.id, quantity: 49 },
      ],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    expect(order.items).toHaveLength(1);
    expect(order.items[0]!.quantity).toBe(99);
  });
});

describe("stock is not touched at checkout", () => {
  /**
   * Neither payment method captures money at submit time, so decrementing here
   * would let any anonymous visitor drain visible inventory with junk guest
   * orders — with nothing to reverse. The decrement lives in
   * `advance_order_status`; see `tests/db/advanceOrderStatus.test.ts`.
   */
  it("leaves stock_count and in_stock exactly as they were", async () => {
    const product = await fx.product({ stock_count: 5, price_ngn: 1_000 });

    await fx.placeOk({
      items: [{ product_id: product.id, quantity: 3 }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    const after = rows<{ stock_count: number; in_stock: boolean }>(
      `select stock_count, in_stock from public.products where id = '${product.id}'`,
    )[0]!;
    expect(after.stock_count).toBe(5);
    expect(after.in_stock).toBe(true);
  });
});
