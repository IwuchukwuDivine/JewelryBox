import { describe, expect, it } from "vitest";
import { rows } from "./helpers/sql";
import {
  canTransition,
  nextStatuses,
  ORDER_FLOW,
} from "~/utils/constants/orderStatus";
import type { OrderStatus, PaymentMethod } from "~/utils/types/shop";

/**
 * The parity test `app/utils/constants/orderStatus.ts` asks for in its header.
 *
 * The lifecycle exists twice — once as `ORDER_FLOW` in TypeScript, once as rows
 * in `public.order_flow` — and the only thing keeping the copies honest is this
 * file. It reads nothing from the application: `can_transition()` is called in
 * Postgres, `canTransition()` in Node, and the two results are compared.
 *
 * Two levels, because they fail differently. The table diff catches a lane
 * added or a step reordered. The triple sweep catches the *derivation* drifting
 * — a `cancelled` branch that behaves differently, or a status outside a lane
 * being quietly repaired onto the happy path instead of only being cancellable.
 */

const STATUSES: readonly OrderStatus[] = [
  "received",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const METHODS: readonly PaymentMethod[] = ["bank_transfer", "pay_on_delivery"];

const sqlArray = (values: readonly string[]): string =>
  `array[${values.map((v) => `'${v}'`).join(",")}]::text[]`;

describe("order_flow mirrors ORDER_FLOW", () => {
  const table = rows<{ payment_method: string; statuses: string[] }>(
    `select payment_method, array_agg(status order by position) as statuses
       from public.order_flow
      group by payment_method
      order by payment_method`,
  );

  it("declares exactly the payment methods the TypeScript knows about", () => {
    expect(table.map((r) => r.payment_method).sort()).toEqual(
      [...METHODS].sort(),
    );
  });

  it("stores each lane in the same order as ORDER_FLOW", () => {
    const fromDb = Object.fromEntries(
      table.map((r) => [r.payment_method, r.statuses]),
    );
    const fromTs = Object.fromEntries(
      METHODS.map((m) => [m, [...ORDER_FLOW[m]]]),
    );
    expect(fromDb).toEqual(fromTs);
  });

  it("numbers positions from 1 with no gaps, which can_transition's join depends on", () => {
    const positions = rows<{ payment_method: string; positions: number[] }>(
      `select payment_method, array_agg(position order by position) as positions
         from public.order_flow group by payment_method order by payment_method`,
    );
    for (const lane of positions) {
      const expected = lane.positions.map((_, i) => i + 1);
      expect(lane.positions).toEqual(expected);
    }
  });
});

describe("can_transition() equals canTransition()", () => {
  // One query for all 50 triples: a round trip per triple would make this the
  // slowest file in the suite for no extra coverage.
  const matrix = rows<{
    from_status: string;
    to_status: string;
    method: string;
    allowed: boolean;
  }>(
    `select f.s as from_status, t.s as to_status, m.s as method,
            public.can_transition(f.s, t.s, m.s) as allowed
       from unnest(${sqlArray(STATUSES)}) as f(s)
       cross join unnest(${sqlArray(STATUSES)}) as t(s)
       cross join unnest(${sqlArray(METHODS)}) as m(s)`,
  );

  it("returns a verdict for every triple", () => {
    expect(matrix).toHaveLength(STATUSES.length * STATUSES.length * METHODS.length);
  });

  for (const method of METHODS) {
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        it(`${method}: ${from} → ${to}`, () => {
          const row = matrix.find(
            (r) =>
              r.method === method && r.from_status === from && r.to_status === to,
          );
          expect(row, "triple missing from the SQL sweep").toBeDefined();
          expect(row!.allowed).toBe(canTransition(from, to, method));
        });
      }
    }
  }
});

describe("next_statuses() equals nextStatuses()", () => {
  const listed = rows<{ from_status: string; method: string; next: string[] }>(
    `select f.s as from_status, m.s as method,
            public.next_statuses(f.s, m.s) as next
       from unnest(${sqlArray(STATUSES)}) as f(s)
       cross join unnest(${sqlArray(METHODS)}) as m(s)`,
  );

  for (const method of METHODS) {
    for (const from of STATUSES) {
      it(`${method}: ${from}`, () => {
        const row = listed.find(
          (r) => r.method === method && r.from_status === from,
        );
        expect(row).toBeDefined();
        // Order matters: the admin UI renders the first entry as the primary
        // action, so [next, cancelled] and [cancelled, next] are not the same
        // control.
        expect(row!.next).toEqual(nextStatuses(from, method));
      });
    }
  }
});
