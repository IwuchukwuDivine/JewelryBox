import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { scalar } from "./helpers/sql";
import { address, scope, uniq, type Scope, type TestUser } from "./helpers/fixtures";
import { anonClient, rpcError } from "./helpers/supabase";
import { ERROR_CODES } from "~/utils/constants/errorCodes";
import type { AdminAnalytics, AdminStats } from "~/utils/types/admin";

/**
 * The dashboard aggregates in Postgres, in one round trip, instead of pulling
 * thousands of order rows into the browser. What the tests below pin is the
 * *shape* the frontend binds to and the two places the shape can silently lie:
 * a revenue series with gaps where quiet days were, and a status breakdown
 * missing the statuses that happen to be at zero. Both render as a chart that
 * looks fine and is wrong.
 *
 * Totals are asserted as deltas. `admin_stats()` is global by definition, the
 * database is shared, and a test that asserted absolute numbers would only
 * pass on an empty instance.
 */

let fx: Scope;
let admin: TestUser;
let customer: TestUser;

let before: AdminStats;
let after: AdminStats;
let paidRevenue = 0;
let productUnits = 0;
let trackedProductId = "";

/**
 * Keys spelled out against the interface. `satisfies Record<keyof T, true>`
 * makes the list exhaustive at compile time, so a field added to `AdminStats`
 * without being returned by the RPC is caught here rather than as an
 * `undefined` on a dashboard tile.
 */
const STATS_KEYS = Object.keys({
  orders_total: true,
  orders_awaiting_payment: true,
  orders_to_ship: true,
  revenue_ngn: true,
  products_total: true,
  products_out_of_stock: true,
} satisfies Record<keyof AdminStats, true>).sort();

const ANALYTICS_KEYS = Object.keys({
  revenue: true,
  status_breakdown: true,
  top_products: true,
} satisfies Record<keyof AdminAnalytics, true>).sort();

const REVENUE_POINT_KEYS = ["date", "orders", "revenue_ngn"];
const TOP_PRODUCT_KEYS = ["name", "product_id", "revenue_ngn", "units"];
const ALL_STATUSES = [
  "cancelled",
  "confirmed",
  "delivered",
  "received",
  "shipped",
];

const stats = async (): Promise<AdminStats> => {
  const { data, error } = await admin.client.rpc("admin_stats");
  expect(error).toBeNull();
  return data as AdminStats;
};

const analytics = async (days?: number): Promise<AdminAnalytics> => {
  const { data, error } = await admin.client.rpc(
    "admin_analytics",
    days === undefined ? {} : { p_days: days },
  );
  expect(error).toBeNull();
  return data as AdminAnalytics;
};

const advance = async (orderId: string, to: string) => {
  const { error } = await admin.client.rpc("advance_order_status", {
    p_order_id: orderId,
    p_to: to,
  });
  expect(error).toBeNull();
};

beforeAll(async () => {
  fx = scope();
  admin = await fx.user({ admin: true });
  customer = await fx.user();

  before = await stats();

  // One priced piece everything is bought from, plus two that only move the
  // product tiles.
  const piece = await fx.product({ price_ngn: 100_000 });
  trackedProductId = piece.id;
  await fx.product({ price_ngn: 5_000 });
  await fx.product({ price_ngn: 5_000, in_stock: false });

  const place = (payment: "bank_transfer" | "pay_on_delivery", quantity: number) =>
    fx.placeOk({
      items: [{ product_id: piece.id, quantity }],
      // Unpriced on purpose, so `total_ngn` is exactly the subtotal and the
      // revenue arithmetic below has one fewer moving part.
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
      payment,
    });

  // received, transfer            → awaiting payment
  await place("bank_transfer", 1);
  // confirmed, transfer           → paid, and next step is shipped
  const confirmed = await place("bank_transfer", 2);
  await advance(confirmed.id, "confirmed");
  // received, pay on delivery     → next step is shipped
  await place("pay_on_delivery", 1);
  // shipped, pay on delivery      → not paid yet
  const shipped = await place("pay_on_delivery", 1);
  await advance(shipped.id, "shipped");
  // delivered, pay on delivery    → paid
  const delivered = await place("pay_on_delivery", 3);
  await advance(delivered.id, "shipped");
  await advance(delivered.id, "delivered");

  paidRevenue = confirmed.total_ngn + delivered.total_ngn;
  productUnits = 2 + 3;

  after = await stats();
});

afterAll(async () => {
  await fx.destroy();
});

describe("admin_stats", () => {
  it("returns exactly the keys in AdminStats", () => {
    expect(Object.keys(after).sort()).toEqual(STATS_KEYS);
  });

  it("counts the orders it just saw", () => {
    expect(after.orders_total - before.orders_total).toBe(5);
  });

  it("counts a transfer still waiting on money as awaiting payment", () => {
    expect(
      after.orders_awaiting_payment - before.orders_awaiting_payment,
    ).toBe(1);
  });

  it("counts both lanes' next-step-is-shipped orders as to ship", () => {
    // A confirmed transfer and a received pay-on-delivery — different
    // statuses, same job for her.
    expect(after.orders_to_ship - before.orders_to_ship).toBe(2);
  });

  it("sums revenue over paid orders only", () => {
    expect(after.revenue_ngn - before.revenue_ngn).toBe(paidRevenue);
    expect(paidRevenue).toBe(500_000);
  });

  it("counts live products and the out-of-stock ones", () => {
    expect(after.products_total - before.products_total).toBe(3);
    expect(
      after.products_out_of_stock - before.products_out_of_stock,
    ).toBe(1);
  });

  it("is admin only", async () => {
    const asCustomer = await customer.client.rpc("admin_stats");
    expect(rpcError(asCustomer.error).hint).toBe(ERROR_CODES.notAdmin);

    const asAnon = await anonClient().rpc("admin_stats");
    // EXECUTE is revoked from anon outright — it never reaches the guard.
    expect(rpcError(asAnon.error).code).toBe("42501");
  });
});

describe("admin_analytics", () => {
  it("returns exactly the keys in AdminAnalytics", async () => {
    expect(Object.keys(await analytics(7)).sort()).toEqual(ANALYTICS_KEYS);
  });

  it("zero-fills the revenue series to the requested day count", async () => {
    for (const days of [1, 7, 30, 90]) {
      const series = (await analytics(days)).revenue;
      expect(series, `series for ${days} days`).toHaveLength(days);
      // A quiet day is a zero, not a gap the chart would close up.
      expect(series.every((p) => typeof p.revenue_ngn === "number")).toBe(true);
      expect(series.every((p) => typeof p.orders === "number")).toBe(true);
    }
  });

  it("clamps the day count instead of returning nothing", async () => {
    expect((await analytics(0)).revenue).toHaveLength(1);
    expect((await analytics(-5)).revenue).toHaveLength(1);
    expect((await analytics(10_000)).revenue).toHaveLength(365);
    // The default the dashboard relies on.
    expect((await analytics()).revenue).toHaveLength(30);
  });

  it("runs the series forward, day by day, ending today in Lagos", async () => {
    const series = (await analytics(7)).revenue;
    const dates = series.map((p) => p.date);

    expect(dates).toEqual([...dates].sort());
    expect(new Set(dates).size).toBe(dates.length);
    expect(dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true);

    // Buckets are Africa/Lagos: revenue booked at 23:30 WAT belongs on today's
    // bar, and a UTC bucket would put it on yesterday's.
    const today = scalar<string>(
      `to_char((now() at time zone 'Africa/Lagos')::date, 'YYYY-MM-DD')`,
    );
    expect(dates[dates.length - 1]).toBe(today);

    const oneDay = 86_400_000;
    for (let i = 1; i < dates.length; i += 1) {
      expect(
        Date.parse(`${dates[i]}T00:00:00Z`) -
          Date.parse(`${dates[i - 1]}T00:00:00Z`),
      ).toBe(oneDay);
    }
  });

  it("gives every revenue point the shape RevenuePoint declares", async () => {
    const series = (await analytics(3)).revenue;
    for (const point of series) {
      expect(Object.keys(point).sort()).toEqual(REVENUE_POINT_KEYS);
    }
  });

  it("books today's paid orders on today's bar", async () => {
    const series = (await analytics(7)).revenue;
    const today = series[series.length - 1]!;

    expect(today.revenue_ngn).toBeGreaterThanOrEqual(paidRevenue);
    expect(today.orders).toBeGreaterThanOrEqual(2);
  });

  it("includes every status in the breakdown, even at zero", async () => {
    const breakdown = (await analytics(7)).status_breakdown;

    expect(Object.keys(breakdown).sort()).toEqual(ALL_STATUSES);
    // The doughnut's legend must be stable across days, so a status with no
    // orders is a 0 rather than a missing key.
    expect(Object.values(breakdown).every((n) => typeof n === "number")).toBe(true);
    expect(breakdown.received).toBeGreaterThanOrEqual(2);
    expect(breakdown.confirmed).toBeGreaterThanOrEqual(1);
    expect(breakdown.shipped).toBeGreaterThanOrEqual(1);
    expect(breakdown.delivered).toBeGreaterThanOrEqual(1);
    expect(breakdown.cancelled).toBeGreaterThanOrEqual(0);
  });

  it("ranks top products from the paid orders' item snapshots", async () => {
    const top = (await analytics(7)).top_products;
    const mine = top.find((p) => p.product_id === trackedProductId);

    expect(mine, "the piece every paid order bought should rank").toBeDefined();
    expect(Object.keys(mine!).sort()).toEqual(TOP_PRODUCT_KEYS);
    expect(mine!.units).toBe(productUnits);
    expect(mine!.revenue_ngn).toBe(productUnits * 100_000);

    // Ordered by revenue, descending.
    const revenues = top.map((p) => p.revenue_ngn);
    expect(revenues).toEqual([...revenues].sort((a, b) => b - a));
    expect(top.length).toBeLessThanOrEqual(10);
  });

  it("counts only paid orders in revenue and top products", async () => {
    // Three of the five orders are unpaid; none of their units may appear.
    const top = (await analytics(7)).top_products;
    const mine = top.find((p) => p.product_id === trackedProductId)!;
    expect(mine.units).toBe(5);
    expect(mine.units).not.toBe(8);
  });

  it("is admin only", async () => {
    const asCustomer = await customer.client.rpc("admin_analytics", { p_days: 7 });
    expect(rpcError(asCustomer.error).hint).toBe(ERROR_CODES.notAdmin);

    const asAnon = await anonClient().rpc("admin_analytics", { p_days: 7 });
    expect(rpcError(asAnon.error).code).toBe("42501");
  });
});
