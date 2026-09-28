import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { attempt, execSql, lit, one, scalar } from "./helpers/sql";
import { address, scope, uniq, type OrderRow, type Scope, type TestUser } from "./helpers/fixtures";
import { service } from "./helpers/supabase";
import { ERROR_CODES } from "~/utils/constants/errorCodes";

/**
 * Deleting an account.
 *
 * `orders.user_id references auth.users on delete set null` says what is
 * supposed to happen: the account goes, the order survives as a financial
 * record with no owner. Three separate things have to agree for that to work —
 * the FK, the immutability guard, and every trigger the cascade fires — and
 * each of them has been wrong at some point in this schema's short life, in a
 * way nothing else in the suite would have noticed.
 */

let fx: Scope;

beforeAll(() => {
  fx = scope();
});

afterAll(async () => {
  await fx.destroy();
});

/** A user plus one order of their own, built outside the scope's cleanup list. */
const customerWithOrder = async (): Promise<{ user: TestUser; order: OrderRow }> => {
  const user = await fx.user();
  const product = await fx.product({ price_ngn: 20_000 });
  const order = await fx.placeOk(
    {
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    },
    user.client,
  );
  expect(order.user_id).toBe(user.id);
  return { user, order };
};

describe("an order outlives the account that placed it", () => {
  it("NULLs user_id when the account is deleted, rather than aborting the delete", async () => {
    const { user, order } = await customerWithOrder();

    // The cascade is an UPDATE on `orders`, so it passes through
    // `orders_guard_immutable`. Listing `user_id` among the frozen columns made
    // this raise, which made any customer who had ever ordered undeletable.
    execSql(`delete from auth.users where id = ${lit(user.id)};`);

    expect(
      scalar<number>(
        `(select count(*)::int from auth.users where id = ${lit(user.id)})`,
      ),
    ).toBe(0);

    const after = one<{ user_id: string | null; subtotal_ngn: number }>(
      `select user_id::text as user_id, subtotal_ngn
         from public.orders where id = ${lit(order.id)}`,
    );
    expect(after.user_id).toBeNull();
    // The record itself is untouched: it is what the books are made of.
    expect(after.subtotal_ngn).toBe(20_000);
  });

  it("refuses to reassign an order to a different account", async () => {
    const { order } = await customerWithOrder();
    const stranger = await fx.user();

    const result = attempt(
      `update public.orders set user_id = ${lit(stranger.id)}::uuid
        where id = ${lit(order.id)}`,
    );

    expect(result.ok).toBe(false);
    expect(result.hint).toBe(ERROR_CODES.illegalTransition);
    expect(
      one<{ user_id: string | null }>(
        `select user_id::text as user_id from public.orders where id = ${lit(order.id)}`,
      ).user_id,
    ).not.toBe(stranger.id);
  });

  it("refuses to give an orphaned order a new owner", async () => {
    const { user, order } = await customerWithOrder();
    execSql(`delete from auth.users where id = ${lit(user.id)};`);
    const stranger = await fx.user();

    // NULL → someone is the reassignment the guard exists for, even when the
    // previous owner is gone.
    const result = attempt(
      `update public.orders set user_id = ${lit(stranger.id)}::uuid
        where id = ${lit(order.id)}`,
    );

    expect(result.ok).toBe(false);
    expect(result.hint).toBe(ERROR_CODES.illegalTransition);
  });

  it("cascades a customer's addresses and wishlist away with them", async () => {
    const user = await fx.user();
    const product = await fx.product();

    await user.client.from("addresses").insert({
      user_id: user.id,
      full_name: "Test",
      email: user.email,
      phone: "08000000000",
      line1: "1 Test Road",
      city: "Ikeja",
      state: "Lagos",
      area: "Ikeja",
    });
    await user.client
      .from("wishlists")
      .insert({ user_id: user.id, product_id: product.id });

    execSql(`delete from auth.users where id = ${lit(user.id)};`);

    expect(
      scalar<number>(
        `(select count(*)::int from public.addresses where user_id = ${lit(user.id)})`,
      ),
    ).toBe(0);
    expect(
      scalar<number>(
        `(select count(*)::int from public.wishlists where user_id = ${lit(user.id)})`,
      ),
    ).toBe(0);
    expect(
      scalar<number>(
        `(select count(*)::int from public.profiles where id = ${lit(user.id)})`,
      ),
    ).toBe(0);
  });
});

/**
 * The same delete, through the API the app would actually use.
 *
 * This is the only route an account-deletion feature, or any admin tooling, can
 * take — `auth.admin.deleteUser` on the service client, which is GoTrue's
 * `DELETE /admin/users/:id`. GoTrue runs as `supabase_auth_admin`, a role that
 * holds no privileges at all on `public.profiles`, and the cascade into that
 * table fires `profiles_require_admin()`, which is SECURITY INVOKER and reads
 * `public.profiles` in its body. So the statement dies with
 * `42501 permission denied for table profiles` and GoTrue reports the generic
 * "Database error deleting user".
 *
 * It fails for every user, not only admins: the privilege check does not care
 * which branch of the trigger would have been taken.
 *
 * The SQL path above works because `postgres` has the privileges the trigger's
 * body needs — which is exactly why this is worth its own test. Without it the
 * schema looks correct from every angle the rest of the suite can see.
 */
describe("the Auth admin API can delete a user", () => {
  it("succeeds through auth.admin.deleteUser", async () => {
    const user = await fx.user();

    const { error } = await service().auth.admin.deleteUser(user.id);

    expect(error, error?.message).toBeNull();
    expect(
      scalar<number>(
        `(select count(*)::int from auth.users where id = ${lit(user.id)})`,
      ),
    ).toBe(0);
  });
});
