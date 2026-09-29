import type { SupabaseClient } from "@supabase/supabase-js";
import { anonClient, service } from "./supabase";
import { execSql, lit } from "./sql";

/**
 * Per-test fixtures.
 *
 * The local database is shared — with the seed, with other agents, and with
 * whatever the previous run left behind — so nothing here is a shared fixture.
 * Every row carries a random suffix and every scope cleans up after itself,
 * which is what makes the suite order-independent and repeatable without
 * `supabase db reset`.
 */

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price_ngn: number;
  in_stock: boolean;
  stock_count: number | null;
  made_to_order: boolean;
  archived_at: string | null;
  images: string[];
  tags: string[];
}

export interface VariantRow {
  id: string;
  product_id: string;
  label: string;
  price_ngn: number;
  in_stock: boolean;
  position: number;
}

export interface RateRow {
  id: string;
  mode: "dispatch" | "flight";
  name: string;
  state: string;
  fee_ngn: number;
  active: boolean;
}

export interface OrderRow {
  id: string;
  order_number: string;
  user_id: string | null;
  status: string;
  payment_method: string;
  items: OrderItemSnapshot[];
  subtotal_ngn: number;
  delivery_method: string;
  delivery_destination: string;
  delivery_fee_ngn: number | null;
  total_ngn: number;
  shipping_address: Record<string, unknown>;
  is_paid: boolean;
  paid_at: string | null;
  status_history: { status: string; at: string; note?: string }[];
  created_at: string;
}

export interface OrderItemSnapshot {
  product_id: string;
  name: string;
  brand: string;
  price_ngn: number;
  quantity: number;
  image: string;
  variant_id?: string;
  variant_label?: string;
}

export interface TestAddress {
  full_name: string;
  email: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  area?: string;
  country: string;
  notes?: string;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  /** A real signed-in session — the surface the app actually uses. */
  client: SupabaseClient;
}

/** Lowercase alphanumeric, so it is legal in a product slug. */
export const uniq = (): string =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/**
 * `example.test` is reserved by RFC 6761 and is the marker the rate-limit sweep
 * in `destroy()` keys on, so test keys can be removed without touching anyone
 * else's.
 */
export const testEmail = (): string => `jb-test-${uniq()}@example.test`;

const PASSWORD = "jb-test-password-1!";

export const address = (over: Partial<TestAddress> = {}): TestAddress => {
  const state = over.state ?? "Lagos";
  const lagos = state.trim().toLowerCase() === "lagos";
  return {
    full_name: "Test Customer",
    email: over.email ?? testEmail(),
    phone: "08012345678",
    line1: "12 Test Close",
    city: lagos ? "Ikeja" : "Town",
    state,
    // Only Lagos is priced per area, and `place_order` drops the key otherwise.
    ...(lagos ? { area: "Ikeja" } : {}),
    country: "NG",
    ...over,
  };
};

export interface PlaceOrderArgs {
  items: { product_id: string; quantity: number; variant_id?: string; price_ngn?: number }[];
  address: TestAddress;
  delivery?: Record<string, unknown>;
  payment?: "bank_transfer" | "pay_on_delivery";
}

export interface Scope {
  product: (over?: Partial<ProductRow>) => Promise<ProductRow>;
  variant: (productId: string, over?: Partial<VariantRow>) => Promise<VariantRow>;
  rate: (over: Partial<RateRow> & Pick<RateRow, "mode" | "name" | "state">) => Promise<RateRow>;
  user: (opts?: { admin?: boolean }) => Promise<TestUser>;
  /** Places an order through the RPC and registers it for cleanup. */
  place: (
    args: PlaceOrderArgs,
    client?: SupabaseClient,
  ) => Promise<{ order: OrderRow | null; error: unknown }>;
  /** Places an order and fails the call if the RPC rejected it. */
  placeOk: (args: PlaceOrderArgs, client?: SupabaseClient) => Promise<OrderRow>;
  setting: (key: string, value: unknown, isPublic: boolean) => Promise<string>;
  /** Registers a `rate_limits` key so `destroy()` removes it. */
  trackRateLimitKey: (key: string) => void;
  destroy: () => Promise<void>;
}

export const scope = (): Scope => {
  const productIds: string[] = [];
  const rateIds: string[] = [];
  const orderIds: string[] = [];
  const userIds: string[] = [];
  const settingKeys: string[] = [];
  const rateLimitKeys: string[] = [];

  const db = () => service();

  const registerOrder = (order: OrderRow | null) => {
    if (order?.id) orderIds.push(order.id);
  };

  const self: Scope = {
    async product(over = {}) {
      const suffix = uniq();
      const { data, error } = await db()
        .from("products")
        .insert({
          slug: `jb-test-${suffix}`,
          name: `Test Piece ${suffix}`,
          brand: "Testhouse",
          description: "A fixture piece.",
          category: "watches",
          price_ngn: 100_000,
          images: ["https://example.test/a.jpg"],
          in_stock: true,
          ...over,
        })
        .select("*")
        .single();
      if (error) throw new Error(`fixture product failed: ${error.message}`);
      const row = data as unknown as ProductRow;
      productIds.push(row.id);
      return row;
    },

    async variant(productId, over = {}) {
      const { data, error } = await db()
        .from("product_variants")
        .insert({
          product_id: productId,
          label: `Option ${uniq()}`,
          options: { size: "40mm" },
          price_ngn: 120_000,
          in_stock: true,
          position: 0,
          ...over,
        })
        .select("*")
        .single();
      if (error) throw new Error(`fixture variant failed: ${error.message}`);
      // Cascades with the product, so no separate registration is needed.
      return data as unknown as VariantRow;
    },

    async rate(over) {
      const { data, error } = await db()
        .from("delivery_rates")
        .insert({ fee_ngn: 5_000, active: true, position: 0, ...over })
        .select("*")
        .single();
      if (error) throw new Error(`fixture rate failed: ${error.message}`);
      const row = data as unknown as RateRow;
      rateIds.push(row.id);
      return row;
    },

    async user({ admin = false } = {}) {
      const email = testEmail();
      const { data, error } = await db().auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
      });
      if (error || !data.user) {
        throw new Error(`fixture user failed: ${error?.message}`);
      }
      const id = data.user.id;
      userIds.push(id);

      if (admin) {
        // Out-of-band promotion, exactly as README documents for launch.
        // `protect_profile_role` exempts a null `auth.uid()`, which is what
        // makes the bootstrap possible; the service role has no uid.
        const { error: promote } = await db()
          .from("profiles")
          .update({ role: "admin" })
          .eq("id", id);
        if (promote) throw new Error(`promotion failed: ${promote.message}`);
      }

      const client = anonClient();
      const { error: signIn } = await client.auth.signInWithPassword({
        email,
        password: PASSWORD,
      });
      if (signIn) throw new Error(`sign-in failed: ${signIn.message}`);

      return { id, email, password: PASSWORD, client };
    },

    async place(args, client = db()) {
      const { data, error } = await client.rpc("place_order", {
        p_items: args.items,
        p_address: args.address,
        p_delivery: args.delivery ?? {},
        p_payment: args.payment ?? "bank_transfer",
      });
      const order = (data ?? null) as OrderRow | null;
      registerOrder(order);
      rateLimitKeys.push(`order:${args.address.email.trim().toLowerCase()}`);
      return { order, error };
    },

    async placeOk(args, client) {
      const { order, error } = await self.place(args, client);
      if (error || !order) {
        throw new Error(`place_order rejected the fixture: ${JSON.stringify(error)}`);
      }
      return order;
    },

    async setting(key, value, isPublic) {
      const { error } = await db()
        .from("site_settings")
        .insert({ key, value, is_public: isPublic });
      if (error) throw new Error(`fixture setting failed: ${error.message}`);
      settingKeys.push(key);
      return key;
    },

    trackRateLimitKey(key) {
      rateLimitKeys.push(key);
    },

    async destroy() {
      const db2 = db();
      if (orderIds.length) await db2.from("orders").delete().in("id", orderIds);
      if (productIds.length) await db2.from("products").delete().in("id", productIds);
      if (rateIds.length) await db2.from("delivery_rates").delete().in("id", rateIds);
      if (settingKeys.length) {
        await db2.from("site_settings").delete().in("key", settingKeys);
      }
      /*
       * Users go out through SQL, not `auth.admin.deleteUser`.
       *
       * The GoTrue path is currently broken by the schema — see
       * `tests/db/userDeletion.test.ts`, which pins it — and teardown must not
       * depend on the bug it is reporting, or every file in the suite turns red
       * for one defect and leaks its fixtures on the way out.
       *
       * One statement, so `profiles_require_admin` sees the whole set at once.
       * That trigger refuses to leave the database with zero admins, which is
       * deliberate: it is what stops a one-statement mistake locking everyone
       * out. On a seeded database the seeded admin survives and a fixture admin
       * deletes cleanly; on an unseeded one the fixture admin *is* the only
       * admin, so the retry below keeps it and takes everything else. That
       * leaves at most one admin behind, and the next run's own admin is then
       * deletable — it does not accumulate.
       */
      if (userIds.length) {
        const ids = `array[${userIds.map(lit).join(",")}]::uuid[]`;
        try {
          execSql(`delete from auth.users where id = any (${ids});`);
        } catch {
          execSql(
            `delete from auth.users u
              where u.id = any (${ids})
                and not exists (select 1 from public.profiles p
                                 where p.id = u.id and p.role = 'admin');`,
          );
        }
      }

      // `rate_limits` is global state and service-role-only, so it is cleared
      // with SQL. The `example.test` sweep catches keys a raising path created
      // before the test could learn their names.
      const keys = [...new Set(rateLimitKeys)];
      const values = keys.length
        ? `key = any (array[${keys.map(lit).join(",")}]::text[]) or `
        : "";
      execSql(
        `delete from public.rate_limits where ${values}key like '%@example.test%';`,
      );
    },
  };

  return self;
};
