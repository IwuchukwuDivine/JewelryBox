import { describe, expect, it } from "vitest";
import {
  canTransition,
  isPaid,
  nextStatuses,
  ORDER_FLOW,
  ORDER_STATUSES,
  TERMINAL_STATUSES,
} from "~/utils/constants/orderStatus";
import type { OrderStatus, PaymentMethod } from "~/utils/types/shop";

const STATUSES: readonly OrderStatus[] = [
  "received",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const METHODS: readonly PaymentMethod[] = ["bank_transfer", "pay_on_delivery"];

/**
 * The whole matrix, written out rather than derived.
 *
 * Deriving the expectation from `ORDER_FLOW` would make this test agree with
 * any flow, including a broken one — it would only re-assert that
 * `canTransition` calls `nextStatuses`. Spelling out all ten rows means a change
 * to the lifecycle has to be made deliberately, in two places, and
 * `tests/db/flowParity.test.ts` then checks Postgres arrives at the same table.
 */
const EXPECTED: Record<PaymentMethod, Record<OrderStatus, OrderStatus[]>> = {
  bank_transfer: {
    received: ["confirmed", "cancelled"],
    confirmed: ["shipped", "cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  },
  pay_on_delivery: {
    received: ["shipped", "cancelled"],
    // `confirmed` is not in this lane at all. Reaching it is corrupt data, and
    // the only way out of corrupt data is cancellation — not a silent repair
    // onto the happy path.
    confirmed: ["cancelled"],
    shipped: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
  },
};

describe("ORDER_FLOW", () => {
  it("is two lanes through one status column, differing only in `confirmed`", () => {
    expect(ORDER_FLOW.bank_transfer).toEqual([
      "received",
      "confirmed",
      "shipped",
      "delivered",
    ]);
    expect(ORDER_FLOW.pay_on_delivery).toEqual([
      "received",
      "shipped",
      "delivered",
    ]);
  });

  it("never lists cancelled — it is reachable from anywhere, not a step", () => {
    for (const method of METHODS) {
      expect(ORDER_FLOW[method]).not.toContain("cancelled");
    }
  });

  it("covers every status defined for the UI", () => {
    const defined = ORDER_STATUSES.map((s) => s.value);
    expect([...defined].sort()).toEqual([...STATUSES].sort());
    expect(TERMINAL_STATUSES).toEqual(["delivered", "cancelled"]);
  });
});

describe("nextStatuses", () => {
  for (const method of METHODS) {
    for (const from of STATUSES) {
      it(`${method}: ${from} → ${JSON.stringify(EXPECTED[method][from])}`, () => {
        expect(nextStatuses(from, method)).toEqual(EXPECTED[method][from]);
      });
    }
  }

  it("returns nothing from a terminal status, in either lane", () => {
    for (const method of METHODS) {
      for (const terminal of TERMINAL_STATUSES) {
        expect(nextStatuses(terminal, method)).toEqual([]);
      }
    }
  });
});

describe("canTransition — the full (from, to, payment_method) matrix", () => {
  // 5 × 5 × 2 = 50 triples, every one asserted, so a new status or a new lane
  // cannot be added without this test demanding a decision about it.
  for (const method of METHODS) {
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        const expected = EXPECTED[method][from].includes(to);
        it(`${method}: ${from} → ${to} is ${expected}`, () => {
          expect(canTransition(from, to, method)).toBe(expected);
        });
      }
    }
  }

  it("never allows a status to transition to itself", () => {
    for (const method of METHODS) {
      for (const status of STATUSES) {
        expect(canTransition(status, status, method)).toBe(false);
      }
    }
  });

  it("allows cancellation from every non-terminal status", () => {
    for (const method of METHODS) {
      for (const status of STATUSES) {
        expect(canTransition(status, "cancelled", method)).toBe(
          !TERMINAL_STATUSES.includes(status),
        );
      }
    }
  });

  it("refuses skipping a step", () => {
    expect(canTransition("received", "shipped", "bank_transfer")).toBe(false);
    expect(canTransition("received", "delivered", "bank_transfer")).toBe(false);
    expect(canTransition("received", "delivered", "pay_on_delivery")).toBe(false);
  });

  it("refuses `confirmed` on pay on delivery — no money is seen before the door", () => {
    expect(canTransition("received", "confirmed", "pay_on_delivery")).toBe(false);
    expect(canTransition("shipped", "confirmed", "pay_on_delivery")).toBe(false);
  });

  it("refuses moving backwards", () => {
    expect(canTransition("shipped", "confirmed", "bank_transfer")).toBe(false);
    expect(canTransition("confirmed", "received", "bank_transfer")).toBe(false);
    expect(canTransition("shipped", "received", "pay_on_delivery")).toBe(false);
  });
});

describe("isPaid", () => {
  const EXPECTED_PAID: Record<PaymentMethod, Record<OrderStatus, boolean>> = {
    bank_transfer: {
      received: false,
      confirmed: true,
      shipped: true,
      delivered: true,
      cancelled: false,
    },
    pay_on_delivery: {
      received: false,
      confirmed: false,
      shipped: false,
      delivered: true,
      cancelled: false,
    },
  };

  for (const method of METHODS) {
    for (const status of STATUSES) {
      it(`${method}: ${status} → ${EXPECTED_PAID[method][status]}`, () => {
        expect(isPaid(status, method)).toBe(EXPECTED_PAID[method][status]);
      });
    }
  }

  /**
   * Reads like a bug; is not one.
   *
   * A cancelled transfer order that was confirmed first *did* have money
   * received — yet `isPaid` says false, and that is correct for the question it
   * answers: "does this order count towards revenue and is it settled right
   * now?" A cancellation was refunded, so it must not appear in the revenue
   * sum, and the admin must not see it as money in hand.
   *
   * The historical fact is not lost: `orders.paid_at` is deliberately kept on
   * cancellation (see `orders_paid_at_sane`), and `status_history` records the
   * confirmation. So "was it ever paid" and "is it paid" are two different
   * questions with two different sources, and this function only ever answered
   * the second one. Do not "fix" it by consulting history.
   */
  it("is false for a cancelled order in both lanes, whatever its history", () => {
    expect(isPaid("cancelled", "bank_transfer")).toBe(false);
    expect(isPaid("cancelled", "pay_on_delivery")).toBe(false);
  });

  it("is false before the money is seen and true from `confirmed` onwards on a transfer", () => {
    expect(isPaid("received", "bank_transfer")).toBe(false);
    // Fallthrough: paid stays paid through shipped and delivered, which is why
    // `advance_order_status` sets `paid_at` by fallthrough too.
    expect(isPaid("confirmed", "bank_transfer")).toBe(true);
    expect(isPaid("shipped", "bank_transfer")).toBe(true);
    expect(isPaid("delivered", "bank_transfer")).toBe(true);
  });

  it("is true only at the door on pay on delivery", () => {
    expect(isPaid("shipped", "pay_on_delivery")).toBe(false);
    expect(isPaid("delivered", "pay_on_delivery")).toBe(true);
  });
});
