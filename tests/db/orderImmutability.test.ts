import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { attempt, lit, one } from "./helpers/sql";
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

/**
 * An order is append-mostly, and that is enforced with GRANTs plus a trigger
 * rather than with RLS — RLS has no column granularity, so a
 * `for update using (is_admin())` policy on its own lets an admin client
 * rewrite `items`, `subtotal_ngn` or `status` straight from supabase-js and
 * skip `advance_order_status()` entirely.
 *
 * Two layers, tested separately because they fail differently:
 *
 *   · the column GRANT stops a client dead with 42501;
 *   · the trigger catches everything else, the service role included.
 */

let fx: Scope;
let admin: TestUser;
let customer: TestUser;
let order: OrderRow;

const FROZEN = [
  "order_number",
  "user_id",
  "items",
  "subtotal_ngn",
  "payment_method",
  "delivery_method",
  "delivery_destination",
  "shipping_address",
  "created_at",
] as const;

/** A legal-looking new value for each frozen column. */
const NEW_VALUE: Record<(typeof FROZEN)[number], string> = {
  order_number: `'JB-ZZZZZZ'`,
  user_id: `null`, // Only reached by the GRANT loop — see TRIGGER_FROZEN below.
  items: `'[{"product_id":"00000000-0000-4000-8000-000000000000","name":"x","brand":"y","price_ngn":1,"quantity":1,"image":""}]'::jsonb`,
  subtotal_ngn: `1`,
  payment_method: `'pay_on_delivery'`,
  delivery_method: `'flight'`,
  delivery_destination: `'Elsewhere'`,
  shipping_address: `'{"full_name":"x","email":"x@example.test","phone":"1","line1":"1","city":"c","state":"Kano","country":"NG"}'::jsonb`,
  created_at: `now() - interval '1 year'`,
};

const reload = (id: string) =>
  one<OrderRow>(
    `select id, order_number, status, payment_method, subtotal_ngn,
            delivery_fee_ngn, total_ngn, items, user_id::text as user_id
       from public.orders where id = ${lit(id)}`,
  );

beforeAll(async () => {
  fx = scope();
  admin = await fx.user({ admin: true });
  customer = await fx.user();

  const product = await fx.product({ price_ngn: 80_000 });
  order = await fx.placeOk(
    {
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    },
    customer.client,
  );
});

afterAll(async () => {
  await fx.destroy();
});

describe("a client cannot write an order's financial columns", () => {
  for (const column of FROZEN) {
    it(`refuses \`update orders set ${column}\` as an admin`, async () => {
      const before = reload(order.id);

      const { error } = await admin.client
        .from("orders")
        .update({ [column]: null })
        .eq("id", order.id)
        .select();

      // Refused by the column GRANT, before RLS or the trigger is consulted.
      expect(error).not.toBeNull();
      expect(rpcError(error).code).toBe("42501");

      const after = reload(order.id);
      expect(after).toEqual(before);
    });
  }

  it("refuses `update orders set status` — the flow is not the UI's to bypass", async () => {
    const { error } = await admin.client
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", order.id)
      .select();

    expect(error).not.toBeNull();
    expect(rpcError(error).code).toBe("42501");
    expect(reload(order.id).status).toBe("received");
  });

  it("refuses `delete from orders` — orders are cancelled, never deleted", async () => {
    const { error } = await admin.client
      .from("orders")
      .delete()
      .eq("id", order.id)
      .select();

    expect(error).not.toBeNull();
    // The row is still there, which is the assertion that matters: a DELETE
    // that matched nothing would also have "not thrown".
    expect(reload(order.id).id).toBe(order.id);
  });

  it("refuses a direct INSERT — place_order is the only way in", async () => {
    const result = attempt(
      `insert into public.orders (order_number, status, payment_method, items,
         subtotal_ngn, delivery_method, delivery_destination, shipping_address)
       values ('JB-YYYYYY', 'received', 'bank_transfer',
         '[{"product_id":"00000000-0000-4000-8000-000000000000","quantity":1}]'::jsonb,
         1, 'flight', 'Kano',
         '{"full_name":"x","email":"x@example.test","phone":"1","line1":"1","city":"c","state":"Kano","country":"NG"}'::jsonb)`,
      { role: "authenticated", userId: admin.id },
    );

    expect(result.ok).toBe(false);
    expect(result.sqlstate).toBe("42501");
    expect(
      one<{ n: number }>(
        `select count(*)::int as n from public.orders where order_number = 'JB-YYYYYY'`,
      ).n,
    ).toBe(0);
  });
});

describe("the delivery fee is the one column an admin may edit", () => {
  it("accepts an admin quoting the fee afterwards, and total_ngn regenerates", async () => {
    const product = await fx.product({ price_ngn: 40_000 });
    const unpriced = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });
    expect(unpriced.delivery_fee_ngn).toBeNull();
    expect(unpriced.total_ngn).toBe(40_000);

    const { error } = await admin.client
      .from("orders")
      .update({ delivery_fee_ngn: 7_500 })
      .eq("id", unpriced.id)
      .select();
    expect(error).toBeNull();

    const after = reload(unpriced.id);
    expect(after.delivery_fee_ngn).toBe(7_500);
    // Generated, so it cannot drift from the fee the admin just set.
    expect(after.total_ngn).toBe(47_500);
  });

  /**
   * The customer holds the column GRANT too — RLS is what stops them, and RLS
   * denies by matching zero rows rather than by raising. So the assertion has
   * to be on the stored value.
   */
  it("refuses a customer editing the fee on their own order", async () => {
    const before = reload(order.id);

    const { data, error } = await customer.client
      .from("orders")
      .update({ delivery_fee_ngn: 1 })
      .eq("id", order.id)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(reload(order.id).delivery_fee_ngn).toBe(before.delivery_fee_ngn);
  });
});

/**
 * `user_id` is frozen against a *client* — nobody may write it through
 * PostgREST — but it is not frozen against the database, because
 * `on delete set null` has to be able to NULL it when an account is deleted.
 * That one legitimate transition, and the reassignment the guard still refuses,
 * are covered in `tests/db/userDeletion.test.ts`.
 */
const TRIGGER_FROZEN = FROZEN.filter((column) => column !== "user_id");

describe("the trigger catches what the GRANTs cannot", () => {
  // These run as `postgres`, which holds every privilege — standing in for the
  // service role, a migration, or anything else that reaches the table
  // directly. Only the trigger is left.
  for (const column of TRIGGER_FROZEN) {
    it(`raises illegal_transition on \`set ${column}\` from a privileged role`, () => {
      const before = reload(order.id);
      const result = attempt(
        `update public.orders set ${column} = ${NEW_VALUE[column]} where id = ${lit(order.id)}`,
      );

      expect(result.ok).toBe(false);
      expect(result.hint).toBe(ERROR_CODES.illegalTransition);
      expect(reload(order.id)).toEqual(before);
    });
  }

  it("re-checks the flow on a direct status write", () => {
    const result = attempt(
      `update public.orders set status = 'delivered' where id = ${lit(order.id)}`,
    );

    expect(result.ok).toBe(false);
    expect(result.hint).toBe(ERROR_CODES.illegalTransition);
    expect(reload(order.id).status).toBe("received");
  });

  it("lets a legal status write through, so the guard is a flow check and not a freeze", () => {
    const result = attempt(
      `update public.orders set status = 'cancelled' where id = ${lit(order.id)}`,
    );

    expect(result.ok).toBe(true);
    expect(reload(order.id).status).toBe("cancelled");
  });
});
