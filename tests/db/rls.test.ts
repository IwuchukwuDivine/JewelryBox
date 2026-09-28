import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { attempt, lit, one, rows, scalar } from "./helpers/sql";
import {
  address,
  scope,
  uniq,
  type OrderRow,
  type ProductRow,
  type Scope,
  type TestUser,
} from "./helpers/fixtures";
import { anonClient, rpcError, service } from "./helpers/supabase";

/**
 * Row level security, asserted on values rather than on exceptions.
 *
 * The trap this file is built around: RLS denies a write by matching **zero
 * rows**, not by raising. A test that only checks `error === null` is false, a
 * test that only checks `error !== null` passes vacuously, and both would sit
 * green over a policy that never worked. So every denial below reads the row
 * back through the service role and asserts the stored value did not move.
 */

let fx: Scope;
let alice: TestUser;
let bob: TestUser;
let admin: TestUser;
let aliceOrder: OrderRow;
let bobOrder: OrderRow;
let product: ProductRow;
let privateKey: string;
let publicKey: string;

const anon = anonClient();

const placeFor = async (user: TestUser): Promise<OrderRow> => {
  const p = await fx.product({ price_ngn: 12_000 });
  return fx.placeOk(
    {
      items: [{ product_id: p.id, quantity: 1 }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    },
    user.client,
  );
};

beforeAll(async () => {
  fx = scope();
  [alice, bob, admin] = await Promise.all([
    fx.user(),
    fx.user(),
    fx.user({ admin: true }),
  ]);
  aliceOrder = await placeFor(alice);
  bobOrder = await placeFor(bob);

  product = await fx.product({ price_ngn: 500_000 });
  privateKey = `jb_test_private_${uniq()}`;
  publicKey = `jb_test_public_${uniq()}`;
  await fx.setting(privateKey, { account: "0123456789" }, false);
  await fx.setting(publicKey, { whatsapp: "+2348000000000" }, true);
});

afterAll(async () => {
  await fx.destroy();
});

describe("orders are visible only to their owner and the admin", () => {
  it("shows a customer their own order and nobody else's", async () => {
    const { data, error } = await alice.client.from("orders").select("id");
    expect(error).toBeNull();

    const ids = (data ?? []).map((r) => (r as { id: string }).id);
    expect(ids).toContain(aliceOrder.id);
    expect(ids).not.toContain(bobOrder.id);
  });

  it("returns nothing when a customer asks for another customer's order by id", async () => {
    const { data, error } = await alice.client
      .from("orders")
      .select("id")
      .eq("id", bobOrder.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("shows an admin both", async () => {
    const { data, error } = await admin.client
      .from("orders")
      .select("id")
      .in("id", [aliceOrder.id, bobOrder.id]);

    expect(error).toBeNull();
    expect((data ?? []).map((r) => (r as { id: string }).id).sort()).toEqual(
      [aliceOrder.id, bobOrder.id].sort(),
    );
  });

  it("shows a signed-out visitor nothing", async () => {
    const { data, error } = await anon
      .from("orders")
      .select("id")
      .in("id", [aliceOrder.id, bobOrder.id]);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe("site_settings hides anything not marked public", () => {
  it("withholds a private row from a customer", async () => {
    const { data, error } = await alice.client
      .from("site_settings")
      .select("key")
      .eq("key", privateKey);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("withholds a private row from a signed-out visitor", async () => {
    const { data, error } = await anon
      .from("site_settings")
      .select("key")
      .eq("key", privateKey);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("serves a public row to everyone", async () => {
    for (const client of [anon, alice.client]) {
      const { data, error } = await client
        .from("site_settings")
        .select("key")
        .eq("key", publicKey);
      expect(error).toBeNull();
      expect((data ?? []).map((r) => (r as { key: string }).key)).toEqual([
        publicKey,
      ]);
    }
  });

  it("serves the private row to an admin", async () => {
    const { data, error } = await admin.client
      .from("site_settings")
      .select("key")
      .eq("key", privateKey);

    expect(error).toBeNull();
    expect((data ?? []).map((r) => (r as { key: string }).key)).toEqual([
      privateKey,
    ]);
  });

  it("never leaks a private row through an unfiltered list", async () => {
    const { data } = await anon.from("site_settings").select("key, is_public");
    const keys = (data ?? []) as { key: string; is_public: boolean }[];
    expect(keys.every((row) => row.is_public)).toBe(true);
    expect(keys.map((r) => r.key)).not.toContain(privateKey);
  });
});

describe("only an admin writes the catalogue", () => {
  const priceOf = (id: string) =>
    one<{ price_ngn: number }>(
      `select price_ngn from public.products where id = ${lit(id)}`,
    ).price_ngn;

  it("refuses a customer updating a product — and the price does not move", async () => {
    const before = priceOf(product.id);

    const { data, error } = await alice.client
      .from("products")
      .update({ price_ngn: 1 })
      .eq("id", product.id)
      .select();

    // RLS denies by matching zero rows. No error is raised, which is exactly
    // why the next assertion is the real one.
    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(priceOf(product.id)).toBe(before);
    expect(priceOf(product.id)).toBe(500_000);
  });

  it("refuses a signed-out visitor updating a product", async () => {
    const before = priceOf(product.id);

    const { data, error } = await anon
      .from("products")
      .update({ price_ngn: 2 })
      .eq("id", product.id)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(priceOf(product.id)).toBe(before);
  });

  it("refuses a customer inserting a product, and inserts nothing", async () => {
    const slug = `jb-test-rls-${uniq()}`;
    const { error } = await alice.client.from("products").insert({
      slug,
      name: "Smuggled",
      category: "rings",
      price_ngn: 1,
    });

    expect(rpcError(error).code).toBe("42501");
    expect(
      one<{ n: number }>(
        `select count(*)::int as n from public.products where slug = ${lit(slug)}`,
      ).n,
    ).toBe(0);
  });

  it("refuses a customer deleting a product, and the row survives", async () => {
    const { data, error } = await alice.client
      .from("products")
      .delete()
      .eq("id", product.id)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(
      one<{ n: number }>(
        `select count(*)::int as n from public.products where id = ${lit(product.id)}`,
      ).n,
    ).toBe(1);
  });

  it("lets an admin through, which proves the policy is a filter and not a wall", async () => {
    const { error } = await admin.client
      .from("products")
      .update({ price_ngn: 510_000 })
      .eq("id", product.id)
      .select();

    expect(error).toBeNull();
    expect(priceOf(product.id)).toBe(510_000);
  });

  it("hides an archived product from the public and shows it to an admin", async () => {
    const archived = await fx.product({ price_ngn: 1_000 });
    await service()
      .from("products")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", archived.id);

    const asAnon = await anon.from("products").select("id").eq("id", archived.id);
    expect(asAnon.data).toEqual([]);

    const asAdmin = await admin.client
      .from("products")
      .select("id")
      .eq("id", archived.id);
    expect((asAdmin.data ?? []).length).toBe(1);
  });
});

describe("a customer's own rows stay their own", () => {
  it("scopes addresses to the signed-in user", async () => {
    const { data: created, error } = await alice.client
      .from("addresses")
      .insert({
        user_id: alice.id,
        full_name: "Alice",
        email: alice.email,
        phone: "08000000000",
        line1: "1 Test Road",
        city: "Ikeja",
        state: "Lagos",
        area: "Ikeja",
      })
      .select()
      .single();
    expect(error).toBeNull();

    const id = (created as { id: string }).id;
    const seen = await bob.client.from("addresses").select("id").eq("id", id);
    expect(seen.data).toEqual([]);

    // And Bob cannot delete it either.
    await bob.client.from("addresses").delete().eq("id", id);
    expect(
      one<{ n: number }>(
        `select count(*)::int as n from public.addresses where id = ${lit(id)}`,
      ).n,
    ).toBe(1);
  });

  it("refuses an address inserted under someone else's user_id", async () => {
    const { error } = await alice.client.from("addresses").insert({
      user_id: bob.id,
      full_name: "Not Alice",
      email: bob.email,
      phone: "08000000000",
      line1: "1 Test Road",
      city: "Ikeja",
      state: "Lagos",
      area: "Ikeja",
    });

    expect(rpcError(error).code).toBe("42501");
    expect(
      one<{ n: number }>(
        `select count(*)::int as n from public.addresses where user_id = ${lit(bob.id)}`,
      ).n,
    ).toBe(0);
  });

  it("scopes the wishlist to the signed-in user", async () => {
    const { error } = await alice.client
      .from("wishlists")
      .insert({ user_id: alice.id, product_id: product.id });
    expect(error).toBeNull();

    const seen = await bob.client
      .from("wishlists")
      .select("product_id")
      .eq("product_id", product.id);
    expect(seen.data).toEqual([]);
  });
});

describe("the rate limiter is not a public budget to spend", () => {
  /**
   * Postgres grants EXECUTE on a new function to PUBLIC, and Supabase's
   * ALTER DEFAULT PRIVILEGES grants it again to anon and authenticated
   * explicitly. Revoking one leaves the other standing and the function stays
   * callable, which is why the migration revokes from `public, anon,
   * authenticated` and why this test checks the roles rather than the grant.
   */
  const guarded = [
    "public.check_rate_limit(text, int, interval)",
    "public.clear_rate_limit(text)",
    "public.order_ref_suffix()",
  ];

  for (const fn of guarded) {
    for (const role of ["anon", "authenticated"] as const) {
      it(`denies EXECUTE on ${fn.split("(")[0]} to ${role}`, () => {
        expect(
          scalar<boolean>(
            `has_function_privilege(${lit(role)}, ${lit(fn)}, 'EXECUTE')`,
          ),
        ).toBe(false);
      });
    }
  }

  it("refuses the call itself, not merely the grant lookup", () => {
    for (const role of ["anon", "authenticated"] as const) {
      const spend = attempt(`select public.check_rate_limit('jb-test-probe', 1)`, {
        role,
      });
      expect(spend.ok).toBe(false);
      expect(spend.sqlstate).toBe("42501");

      const clear = attempt(`select public.clear_rate_limit('jb-test-probe')`, {
        role,
      });
      expect(clear.ok).toBe(false);
      expect(clear.sqlstate).toBe("42501");
    }
  });

  it("keeps the rate_limits table itself unreadable", () => {
    for (const role of ["anon", "authenticated"] as const) {
      const read = attempt(`select count(*) from public.rate_limits`, { role });
      expect(read.ok).toBe(false);
      expect(read.sqlstate).toBe("42501");
    }
  });

  it("keeps order_emails service-role only", () => {
    for (const role of ["anon", "authenticated"] as const) {
      const read = attempt(`select count(*) from public.order_emails`, { role });
      expect(read.ok).toBe(false);
      expect(read.sqlstate).toBe("42501");
    }
  });
});

/**
 * The audit, not a spot check.
 *
 * Supabase's `ALTER DEFAULT PRIVILEGES` grants everything on a new
 * public-schema table to anon and authenticated. A table that ships without
 * `enable row level security` is therefore world-writable, and the omission is
 * one missing line in a migration that otherwise applies cleanly.
 */
describe("every table in public has RLS enabled", () => {
  it("finds no table without it", () => {
    const naked = rows<{ relname: string }>(
      `select relname
         from pg_class
        where relrowsecurity = false
          and relnamespace = 'public'::regnamespace
          and relkind = 'r'
        order by relname`,
    ).map((r) => r.relname);

    expect(naked).toEqual([]);
  });

  it("finds at least one table, so the query itself cannot be vacuous", () => {
    const total = scalar<number>(
      `(select count(*)::int from pg_class
         where relnamespace = 'public'::regnamespace and relkind = 'r')`,
    );
    expect(total).toBeGreaterThan(5);
  });
});
