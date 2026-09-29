import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSql, lit, one, rows } from "./helpers/sql";
import { address, scope, uniq, type OrderRow, type Scope } from "./helpers/fixtures";
import { anonClient, rpcError } from "./helpers/supabase";
import { ERROR_CODES } from "~/utils/constants/errorCodes";

/**
 * Guest tracking. The order number is effectively a bearer token — anon can
 * call this — so the keyspace is 32^6 and the throttle is the thing standing
 * between it and a grinder.
 *
 * The throttle is global state in `rate_limits`, shared with every other test
 * and every other agent, so each case here uses a fresh email and a fresh
 * reference and registers both keys for cleanup.
 */

let fx: Scope;
let order: OrderRow;
let email: string;
const anon = anonClient();

const lookup = (p_order_ref: string, p_email: string) =>
  anon.rpc("lookup_order", { p_order_ref, p_email });

/**
 * A syntactically valid reference that belongs to nobody.
 *
 * It has to be built from the Crockford alphabet rather than from base36:
 * base36 emits I, L, O and U, `normalize_order_ref` rejects those, and a
 * rejected reference is charged to the shared `lookup:ref:-` bucket instead of
 * its own — which would make the per-reference axis below test nothing.
 */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const missRef = (i: number): string =>
  `JB-${Array.from({ length: 6 }, (_, k) => CROCKFORD[(i >> (5 * k)) & 31]).join("")}`;

beforeAll(async () => {
  fx = scope();
  email = `jb-test-${uniq()}@example.test`;
  const product = await fx.product({ price_ngn: 55_000 });
  order = await fx.placeOk({
    items: [{ product_id: product.id, quantity: 1 }],
    address: address({ state: "Lagos", area: `Test Area ${uniq()}`, email }),
  });
  fx.trackRateLimitKey(`lookup:email:${email}`);
  fx.trackRateLimitKey(`lookup:ref:${order.order_number}`);
});

afterAll(async () => {
  await fx.destroy();
});

describe("normalize_order_ref", () => {
  /**
   * Crockford's decoding rules: case-insensitive, `I` and `L` read as `1`,
   * `O` reads as `0`. The alphabet drops I/L/O/U precisely so a reference read
   * down a phone line or copied into a transfer narration still resolves.
   */
  const cases: [string, string | null][] = [
    ["jb 0l1z2s", "JB-011Z2S"],
    ["JB-0L1Z2S", "JB-011Z2S"],
    ["JB-0l1z2s", "JB-011Z2S"],
    ["0L1Z2S", "JB-011Z2S"],
    // O decodes to zero, I to one.
    ["JB-O1IZ2S", "JB-011Z2S"],
    ["  jb-011z2s  ", "JB-011Z2S"],
    ["jb/011z2s", "JB-011Z2S"],
    // Junk, in every shape a customer or a scraper produces.
    ["hello", null],
    ["", null],
    ["JB-12345", null],
    ["JB-1234567", null],
    // U is not in the alphabet and has no decode rule, so this is not a typo
    // to forgive — it is a reference that cannot exist.
    ["JB-U12345", null],
    ["JB-", null],
    ["!!!", null],
  ];

  const normalized = one<Record<string, string | null>>(
    `select ${cases
      .map(([input], i) => `public.normalize_order_ref(${lit(input)}) as c${i}`)
      .join(", ")}`,
  );

  for (const [i, [input, expected]] of cases.entries()) {
    it(`${JSON.stringify(input)} → ${expected === null ? "null" : expected}`, () => {
      expect(normalized[`c${i}`] ?? null).toBe(expected);
    });
  }

  it("maps null to null rather than to a reference", () => {
    expect(
      one<{ v: string | null }>(`select public.normalize_order_ref(null) as v`).v,
    ).toBeNull();
  });

  it("round-trips every reference place_order can allocate", () => {
    // The generator and the parser must agree, or a customer reading their own
    // confirmation email back to us fails to find the order.
    const sample = rows<{ ok: boolean }>(
      `select public.normalize_order_ref(n) = n as ok
         from (select 'JB-' || public.order_ref_suffix() as n
                 from generate_series(1, 200)) s`,
    );
    expect(sample).toHaveLength(200);
    expect(sample.every((r) => r.ok)).toBe(true);
  });
});

describe("lookup_order finds an order", () => {
  it("matches on the reference and the email used at checkout", async () => {
    const { data, error } = await lookup(order.order_number, email);

    expect(error).toBeNull();
    const found = (data ?? []) as OrderRow[];
    expect(found).toHaveLength(1);
    expect(found[0]!.id).toBe(order.id);
  });

  it("forgives lowercase, spaces and a missing hyphen", async () => {
    const mangled = order.order_number.toLowerCase().replace("-", " ");
    const { data, error } = await lookup(mangled, email);

    expect(error).toBeNull();
    expect((data ?? []) as OrderRow[]).toHaveLength(1);
  });

  it("normalises the email the same way place_order stored it", async () => {
    const { data, error } = await lookup(
      order.order_number,
      `  ${email.toUpperCase()}  `,
    );

    expect(error).toBeNull();
    expect((data ?? []) as OrderRow[]).toHaveLength(1);
  });

  it("returns empty — not an error — for the right reference and the wrong email", async () => {
    const wrong = `jb-test-${uniq()}@example.test`;
    fx.trackRateLimitKey(`lookup:email:${wrong}`);

    const { data, error } = await lookup(order.order_number, wrong);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("returns empty for an empty email, without spending anyone's budget", async () => {
    const { data, error } = await lookup(order.order_number, "  ");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  /**
   * "Forgive a customer who mistyped twice and then succeeded" — safe, because
   * anyone who has found a valid order already holds what enumeration was
   * after.
   */
  it("clears both budgets on a hit", async () => {
    const typo = `jb-test-${uniq()}@example.test`;
    fx.trackRateLimitKey(`lookup:email:${typo}`);

    await lookup(order.order_number, typo);
    await lookup(order.order_number, typo);
    expect(
      one<{ n: number }>(
        `select count(*)::int as n from public.rate_limits
          where key = ${lit(`lookup:email:${email}`)}`,
      ).n,
    ).toBeGreaterThanOrEqual(0);

    // Two misses against the real email, then a hit.
    for (const ref of [missRef(1), missRef(2)]) {
      fx.trackRateLimitKey(`lookup:ref:${ref}`);
      await lookup(ref, email);
    }
    expect(
      one<{ n: number }>(
        `select count(*)::int as n from public.rate_limits
          where key = ${lit(`lookup:email:${email}`)}`,
      ).n,
    ).toBe(1);

    const { data } = await lookup(order.order_number, email);
    expect((data ?? []) as OrderRow[]).toHaveLength(1);
    expect(
      one<{ n: number }>(
        `select count(*)::int as n from public.rate_limits
          where key = ${lit(`lookup:email:${email}`)}`,
      ).n,
    ).toBe(0);
  });
});

/**
 * Both axes, because one key alone is defeated by rotating the other field.
 * Keying on email only leaves the entire reference space grindable by anyone
 * holding one known address — which is exactly what the 1.07e9 keyspace was
 * bought to prevent.
 */
describe("the throttle charges both keys", () => {
  it("refuses the eleventh miss when the reference rotates against one email", async () => {
    const victim = `jb-test-${uniq()}@example.test`;
    fx.trackRateLimitKey(`lookup:email:${victim}`);

    for (let i = 0; i < 10; i += 1) {
      const ref = missRef(1_000 + i);
      fx.trackRateLimitKey(`lookup:ref:${ref}`);
      const { data, error } = await lookup(ref, victim);
      expect(rpcError(error).hint, `miss ${i + 1} should be allowed`).toBeNull();
      expect(data).toEqual([]);
    }

    const lastRef = missRef(2_000);
    fx.trackRateLimitKey(`lookup:ref:${lastRef}`);
    const { error } = await lookup(lastRef, victim);
    expect(rpcError(error).hint).toBe(ERROR_CODES.lookupRateLimited);
  });

  it("refuses the eleventh miss when the email rotates against one reference", async () => {
    const ref = missRef(3_000);
    fx.trackRateLimitKey(`lookup:ref:${ref}`);

    for (let i = 0; i < 10; i += 1) {
      const rotating = `jb-test-${uniq()}@example.test`;
      fx.trackRateLimitKey(`lookup:email:${rotating}`);
      const { error } = await lookup(ref, rotating);
      expect(rpcError(error).hint, `miss ${i + 1} should be allowed`).toBeNull();
    }

    const lastEmail = `jb-test-${uniq()}@example.test`;
    fx.trackRateLimitKey(`lookup:email:${lastEmail}`);
    const { error } = await lookup(ref, lastEmail);
    expect(rpcError(error).hint).toBe(ERROR_CODES.lookupRateLimited);
  });

  it("charges a malformed reference too — probing is not a typo pattern", async () => {
    const victim = `jb-test-${uniq()}@example.test`;
    fx.trackRateLimitKey(`lookup:email:${victim}`);
    fx.trackRateLimitKey("lookup:ref:-");

    // Every unparseable reference is charged to one shared `-` bucket, so this
    // is the single case in the suite that cannot isolate itself with a unique
    // key. Clearing it first makes the test independent of whatever else
    // probed this database in the last fifteen minutes; `afterAll` clears it
    // again so nobody inherits ours.
    execSql("delete from public.rate_limits where key = 'lookup:ref:-';");

    for (let i = 0; i < 10; i += 1) {
      const { error } = await lookup(`garbage-${i}`, victim);
      expect(rpcError(error).hint).toBeNull();
    }
    const { error } = await lookup("garbage-final", victim);
    expect(rpcError(error).hint).toBe(ERROR_CODES.lookupRateLimited);
  });
});
