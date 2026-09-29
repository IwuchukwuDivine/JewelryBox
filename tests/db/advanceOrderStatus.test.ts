import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rows } from "./helpers/sql";
import {
  address,
  scope,
  uniq,
  type OrderRow,
  type Scope,
  type TestUser,
} from "./helpers/fixtures";
import { rpcError } from "./helpers/supabase";
import { ERROR_CODES } from "~/utils/constants/errorCodes";
import { isPaid } from "~/utils/constants/orderStatus";
import type { OrderStatus, PaymentMethod } from "~/utils/types/shop";

/**
 * `advance_order_status()` is the only legitimate way an order changes status,
 * and it is where three separate rules meet: the flow, `paid_at`, and the stock
 * decrement. Driven here through a real signed-in admin session, so the
 * EXECUTE grant to `authenticated` is exercised alongside the logic.
 */

let fx: Scope;
let admin: TestUser;
let customer: TestUser;

const advance = async (
  orderId: string,
  to: OrderStatus,
  note?: string,
  who: TestUser = admin,
) =>
  who.client.rpc("advance_order_status", {
    p_order_id: orderId,
    p_to: to,
    ...(note === undefined ? {} : { p_note: note }),
  });

const newOrder = async (
  payment: PaymentMethod,
  over: { stock_count?: number | null; quantity?: number; price_ngn?: number } = {},
): Promise<{ order: OrderRow; productId: string }> => {
  const product = await fx.product({
    price_ngn: over.price_ngn ?? 10_000,
    stock_count: over.stock_count ?? null,
  });
  const order = await fx.placeOk({
    items: [{ product_id: product.id, quantity: over.quantity ?? 1 }],
    address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    payment,
  });
  return { order, productId: product.id };
};

const reload = (id: string) =>
  rows<OrderRow>(
    `select id, status, payment_method, paid_at::text as paid_at, is_paid,
            status_history, delivery_fee_ngn, total_ngn, subtotal_ngn
       from public.orders where id = '${id}'`,
  )[0]!;

const stockOf = (id: string) =>
  rows<{ stock_count: number | null; in_stock: boolean }>(
    `select stock_count, in_stock from public.products where id = '${id}'`,
  )[0]!;

beforeAll(async () => {
  fx = scope();
  admin = await fx.user({ admin: true });
  customer = await fx.user();
});

afterAll(async () => {
  await fx.destroy();
});

describe("the flow is enforced, not suggested", () => {
  it("refuses received → shipped on a bank transfer", async () => {
    const { order } = await newOrder("bank_transfer");
    const { error } = await advance(order.id, "shipped");

    expect(rpcError(error).hint).toBe(ERROR_CODES.illegalTransition);
    // And the order did not move.
    expect(reload(order.id).status).toBe("received");
  });

  it("refuses `confirmed` outright on pay on delivery, from every status", async () => {
    const { order } = await newOrder("pay_on_delivery");

    const first = await advance(order.id, "confirmed");
    expect(rpcError(first.error).hint).toBe(ERROR_CODES.illegalTransition);
    expect(reload(order.id).status).toBe("received");

    const shipped = await advance(order.id, "shipped");
    expect(shipped.error).toBeNull();

    const second = await advance(order.id, "confirmed");
    expect(rpcError(second.error).hint).toBe(ERROR_CODES.illegalTransition);
    expect(reload(order.id).status).toBe("shipped");
  });

  it("refuses moving out of a terminal status", async () => {
    const { order } = await newOrder("pay_on_delivery");
    expect((await advance(order.id, "cancelled")).error).toBeNull();

    for (const to of ["shipped", "delivered", "received"] as OrderStatus[]) {
      const { error } = await advance(order.id, to);
      expect(rpcError(error).hint).toBe(ERROR_CODES.illegalTransition);
    }
    expect(reload(order.id).status).toBe("cancelled");
  });

  it("requires an admin", async () => {
    const { order } = await newOrder("bank_transfer");

    const { error } = await advance(order.id, "confirmed", undefined, customer);
    expect(rpcError(error).hint).toBe(ERROR_CODES.notAdmin);
    expect(reload(order.id).status).toBe("received");
  });
});

describe("paid_at and is_paid", () => {
  it("sets paid_at at `confirmed` on a transfer and keeps it through the lane", async () => {
    const { order } = await newOrder("bank_transfer");
    expect(reload(order.id).paid_at).toBeNull();

    expect((await advance(order.id, "confirmed")).error).toBeNull();
    const confirmed = reload(order.id);
    expect(confirmed.paid_at).not.toBeNull();
    expect(confirmed.is_paid).toBe(true);

    // Fallthrough: `paid_at` must survive confirmed → shipped → delivered.
    expect((await advance(order.id, "shipped")).error).toBeNull();
    expect(reload(order.id).paid_at).toBe(confirmed.paid_at);

    expect((await advance(order.id, "delivered")).error).toBeNull();
    const delivered = reload(order.id);
    expect(delivered.paid_at).toBe(confirmed.paid_at);
    expect(delivered.is_paid).toBe(true);
  });

  it("sets paid_at only at the door on pay on delivery", async () => {
    const { order } = await newOrder("pay_on_delivery");

    expect((await advance(order.id, "shipped")).error).toBeNull();
    const shipped = reload(order.id);
    expect(shipped.paid_at).toBeNull();
    expect(shipped.is_paid).toBe(false);

    expect((await advance(order.id, "delivered")).error).toBeNull();
    const delivered = reload(order.id);
    expect(delivered.paid_at).not.toBeNull();
    expect(delivered.is_paid).toBe(true);
  });

  it("agrees with isPaid() at every status it can reach", async () => {
    const lanes: [PaymentMethod, OrderStatus[]][] = [
      ["bank_transfer", ["received", "confirmed", "shipped", "delivered"]],
      ["pay_on_delivery", ["received", "shipped", "delivered"]],
    ];

    for (const [payment, statuses] of lanes) {
      const { order } = await newOrder(payment);
      for (const status of statuses) {
        if (status !== "received") {
          expect((await advance(order.id, status)).error).toBeNull();
        }
        expect(reload(order.id).is_paid).toBe(isPaid(status, payment));
      }
    }
  });

  it("keeps paid_at but drops is_paid when a paid transfer is cancelled", async () => {
    const { order } = await newOrder("bank_transfer");
    expect((await advance(order.id, "confirmed")).error).toBeNull();
    const paidAt = reload(order.id).paid_at;

    expect((await advance(order.id, "cancelled")).error).toBeNull();
    const cancelled = reload(order.id);

    // The money was received and refunded: the record of when stays, and the
    // order stops counting as revenue. Both halves matter.
    expect(cancelled.paid_at).toBe(paidAt);
    expect(cancelled.is_paid).toBe(false);
    expect(isPaid("cancelled", "bank_transfer")).toBe(false);
  });
});

describe("status_history", () => {
  it("appends one entry per move, with the admin's note", async () => {
    const { order } = await newOrder("bank_transfer");
    expect((await advance(order.id, "confirmed", "Transfer seen in GTB")).error).toBeNull();

    const history = reload(order.id).status_history;
    expect(history).toHaveLength(2);
    expect(history[0]!.status).toBe("received");
    expect(history[1]!.status).toBe("confirmed");
    expect(history[1]!.note).toBe("Transfer seen in GTB");
    expect(history[1]!.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });

  it("omits the note key entirely when there is no note", async () => {
    const { order } = await newOrder("pay_on_delivery");
    expect((await advance(order.id, "shipped")).error).toBeNull();
    expect((await advance(order.id, "delivered", "   ")).error).toBeNull();

    const history = reload(order.id).status_history;
    expect(history).toHaveLength(3);
    expect(history[1]).not.toHaveProperty("note");
    // Whitespace is not a note.
    expect(history[2]).not.toHaveProperty("note");
  });

  /**
   * The safety-net trigger reads `new.status_history`, not `old.` — reading
   * `old.` would discard the entry (and its note) that
   * `advance_order_status` just wrote, and append a noteless duplicate.
   */
  it("does not duplicate the entry the function already wrote", async () => {
    const { order } = await newOrder("bank_transfer");
    await advance(order.id, "confirmed", "note one");
    await advance(order.id, "shipped", "note two");

    const history = reload(order.id).status_history;
    expect(history.map((h) => h.status)).toEqual([
      "received",
      "confirmed",
      "shipped",
    ]);
    expect(history.map((h) => h.note)).toEqual([
      undefined,
      "note one",
      "note two",
    ]);
  });
});

describe("stock comes off at commitment", () => {
  it("decrements once at `confirmed` on a transfer and never again", async () => {
    const { order, productId } = await newOrder("bank_transfer", {
      stock_count: 5,
      quantity: 2,
    });

    // Nothing at checkout — see tests/db/placeOrder.test.ts.
    expect(stockOf(productId).stock_count).toBe(5);

    expect((await advance(order.id, "confirmed")).error).toBeNull();
    expect(stockOf(productId).stock_count).toBe(3);

    expect((await advance(order.id, "shipped")).error).toBeNull();
    expect(stockOf(productId).stock_count).toBe(3);

    expect((await advance(order.id, "delivered")).error).toBeNull();
    expect(stockOf(productId).stock_count).toBe(3);
  });

  it("decrements at `shipped` on pay on delivery, the first commitment in that lane", async () => {
    const { order, productId } = await newOrder("pay_on_delivery", {
      stock_count: 4,
      quantity: 1,
    });

    expect(stockOf(productId).stock_count).toBe(4);
    expect((await advance(order.id, "shipped")).error).toBeNull();
    expect(stockOf(productId).stock_count).toBe(3);
    expect((await advance(order.id, "delivered")).error).toBeNull();
    expect(stockOf(productId).stock_count).toBe(3);
  });

  it("marks a piece sold out when the count reaches zero", async () => {
    const { order, productId } = await newOrder("bank_transfer", {
      stock_count: 2,
      quantity: 2,
    });

    expect((await advance(order.id, "confirmed")).error).toBeNull();
    const after = stockOf(productId);
    expect(after.stock_count).toBe(0);
    // "0 left" must never render as available.
    expect(after.in_stock).toBe(false);
  });

  it("leaves a null count alone — stock_count is advisory, not a ledger", async () => {
    const { order, productId } = await newOrder("bank_transfer", {
      stock_count: null,
    });

    expect((await advance(order.id, "confirmed")).error).toBeNull();
    const after = stockOf(productId);
    expect(after.stock_count).toBeNull();
    expect(after.in_stock).toBe(true);
  });

  it("does not decrement on a cancellation", async () => {
    const { order, productId } = await newOrder("bank_transfer", {
      stock_count: 3,
    });

    expect((await advance(order.id, "cancelled")).error).toBeNull();
    expect(stockOf(productId).stock_count).toBe(3);
  });
});
