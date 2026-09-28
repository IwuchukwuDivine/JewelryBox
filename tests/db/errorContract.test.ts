import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { attempt, lit } from "./helpers/sql";
import { address, scope, uniq, type Scope, type TestUser } from "./helpers/fixtures";
import { anonClient, rpcError, service } from "./helpers/supabase";
import { ERROR_CODES, type ErrorCode } from "~/utils/constants/errorCodes";

/**
 * The error contract, driven end to end.
 *
 * Every rejection the database owns carries a machine code in the exception's
 * `hint`, and the UI branches on that code and never on the sentence. So this
 * file asserts two directions:
 *
 *   forward  — each rejection path produces the code it is supposed to;
 *   backward — every DB-owned value in `ERROR_CODES` is produced by *something*.
 *
 * The backward direction is the one that pays. A code nothing raises is a dead
 * UI branch: a spinner that never resolves into a message, or a "try again"
 * fallback where a specific repair was written. It cannot be caught by reading
 * either side alone.
 */

let fx: Scope;
let admin: TestUser;

/** Every hint this file actually observed, for the coverage assertion below. */
const produced = new Set<string>();

const record = (hint: string | null): string | null => {
  if (hint) produced.add(hint);
  return hint;
};

/** Hints raised by `place_order`, reached through PostgREST as a guest would. */
const placeHint = async (args: Parameters<Scope["place"]>[0]): Promise<string | null> => {
  const { error } = await fx.place(args);
  return record(rpcError(error).hint);
};

beforeAll(async () => {
  fx = scope();
  admin = await fx.user({ admin: true });
});

afterAll(async () => {
  await fx.destroy();
});

describe("place_order rejection paths", () => {
  const lagos = () => address({ state: "Lagos", area: `Test Area ${uniq()}` });

  it("empty bag → empty_cart", async () => {
    expect(await placeHint({ items: [], address: lagos() })).toBe(
      ERROR_CODES.emptyCart,
    );
  });

  it("a non-array `p_items` → empty_cart", async () => {
    const { error } = await service().rpc("place_order", {
      p_items: {},
      p_address: lagos(),
      p_delivery: {},
      p_payment: "bank_transfer",
    });
    expect(record(rpcError(error).hint)).toBe(ERROR_CODES.emptyCart);
  });

  it("quantity 0 → invalid_quantity", async () => {
    const product = await fx.product();
    expect(
      await placeHint({
        items: [{ product_id: product.id, quantity: 0 }],
        address: lagos(),
      }),
    ).toBe(ERROR_CODES.invalidQuantity);
  });

  it("quantity 100 → invalid_quantity (the regex caps at two digits)", async () => {
    const product = await fx.product();
    expect(
      await placeHint({
        items: [{ product_id: product.id, quantity: 100 }],
        address: lagos(),
      }),
    ).toBe(ERROR_CODES.invalidQuantity);
  });

  it("more than 50 lines → invalid_quantity, before any catalogue lookup", async () => {
    const product = await fx.product();
    const items = Array.from({ length: 51 }, () => ({
      product_id: product.id,
      quantity: 1,
    }));
    expect(await placeHint({ items, address: lagos() })).toBe(
      ERROR_CODES.invalidQuantity,
    );
  });

  it("more than 200 units in total → invalid_quantity", async () => {
    // Three distinct pieces at 99, 99 and 90 folds to 288 units across three
    // legal lines — the per-line cap alone would let this through.
    const a = await fx.product({ price_ngn: 1_000 });
    const b = await fx.product({ price_ngn: 1_000 });
    const c = await fx.product({ price_ngn: 1_000 });
    expect(
      await placeHint({
        items: [
          { product_id: a.id, quantity: 99 },
          { product_id: b.id, quantity: 99 },
          { product_id: c.id, quantity: 90 },
        ],
        address: lagos(),
      }),
    ).toBe(ERROR_CODES.invalidQuantity);
  });

  it("an id that is not a uuid → product_unavailable", async () => {
    expect(
      await placeHint({
        items: [{ product_id: "prd_001", quantity: 1 }],
        address: lagos(),
      }),
    ).toBe(ERROR_CODES.productUnavailable);
  });

  it("an unknown product → product_unavailable", async () => {
    expect(
      await placeHint({
        items: [
          { product_id: "00000000-0000-4000-8000-000000000000", quantity: 1 },
        ],
        address: lagos(),
      }),
    ).toBe(ERROR_CODES.productUnavailable);
  });

  it("a variant belonging to another product → variant_unavailable", async () => {
    const mine = await fx.product();
    const other = await fx.product();
    const strayVariant = await fx.variant(other.id);
    expect(
      await placeHint({
        items: [
          { product_id: mine.id, quantity: 1, variant_id: strayVariant.id },
        ],
        address: lagos(),
      }),
    ).toBe(ERROR_CODES.variantUnavailable);
  });

  it("an out-of-stock piece → sold_out", async () => {
    const product = await fx.product({ in_stock: false });
    expect(
      await placeHint({
        items: [{ product_id: product.id, quantity: 1 }],
        address: lagos(),
      }),
    ).toBe(ERROR_CODES.soldOut);
  });

  it("a payment method that is not one of the two → invalid_payment_method", async () => {
    const product = await fx.product();
    const { error } = await service().rpc("place_order", {
      p_items: [{ product_id: product.id, quantity: 1 }],
      p_address: lagos(),
      p_delivery: {},
      p_payment: "card",
    });
    expect(record(rpcError(error).hint)).toBe(ERROR_CODES.invalidPaymentMethod);
  });

  it("a mismatched rate_id → rate_mismatch", async () => {
    const rate = await fx.rate({
      mode: "dispatch",
      name: `Test Area ${uniq()}`,
      state: "Lagos",
      fee_ngn: 1_000,
    });
    const product = await fx.product();
    expect(
      await placeHint({
        items: [{ product_id: product.id, quantity: 1 }],
        address: lagos(),
        delivery: { rate_id: rate.id },
      }),
    ).toBe(ERROR_CODES.rateMismatch);
  });

  describe("invalid_address", () => {
    const badAddresses: [string, Record<string, unknown>][] = [
      ["a state outside the allowlist", { state: "Wakanda" }],
      ["no state at all", { state: "" }],
      ["Lagos with no area", { state: "Lagos", area: "" }],
      ["a country we do not ship to", { country: "GB" }],
      ["an unparseable email", { email: "not-an-email" }],
      ["no full name", { full_name: "  " }],
      ["no phone", { phone: "" }],
      ["no street", { line1: "" }],
      ["no city", { city: "" }],
    ];

    for (const [name, patch] of badAddresses) {
      it(`${name} → invalid_address`, async () => {
        const product = await fx.product();
        const target = { ...lagos(), ...patch };
        const { error } = await service().rpc("place_order", {
          p_items: [{ product_id: product.id, quantity: 1 }],
          p_address: target,
          p_delivery: {},
          p_payment: "bank_transfer",
        });
        expect(record(rpcError(error).hint)).toBe(ERROR_CODES.invalidAddress);
      });
    }
  });

  /**
   * Five orders per address per rolling hour. Five rather than three because a
   * false positive blocks a real sale on a high-value piece — and the budget is
   * spent before any catalogue work, so a refused caller costs one upsert.
   */
  it("a sixth order from one address in an hour → order_rate_limited", async () => {
    const product = await fx.product({ price_ngn: 1_000 });
    const email = `jb-test-${uniq()}@example.test`;
    const line = { product_id: product.id, quantity: 1 };

    for (let i = 0; i < 5; i += 1) {
      const { error } = await fx.place({
        items: [line],
        address: address({ state: "Lagos", area: "Ikeja", email }),
      });
      expect(rpcError(error).hint, `order ${i + 1} of 5 should be allowed`).toBeNull();
    }

    const { order, error } = await fx.place({
      items: [line],
      address: address({ state: "Lagos", area: "Ikeja", email }),
    });
    expect(order).toBeNull();
    expect(record(rpcError(error).hint)).toBe(ERROR_CODES.orderRateLimited);
  });
});

describe("advance_order_status rejection paths", () => {
  it("no admin → not_admin", async () => {
    const product = await fx.product();
    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    });

    // The service role has no `auth.uid()`, so `is_admin()` is false — the same
    // answer a signed-out caller gets.
    const { error } = await service().rpc("advance_order_status", {
      p_order_id: order.id,
      p_to: "confirmed",
    });
    expect(record(rpcError(error).hint)).toBe(ERROR_CODES.notAdmin);
  });

  it("an order that does not exist → order_not_found", async () => {
    const result = attempt(
      `select public.advance_order_status('00000000-0000-4000-8000-000000000000'::uuid, 'confirmed')`,
      { role: "authenticated", userId: admin.id },
    );
    expect(result.ok).toBe(false);
    expect(record(result.hint)).toBe(ERROR_CODES.orderNotFound);
  });

  it("a move outside the lane → illegal_transition", async () => {
    const product = await fx.product();
    const order = await fx.placeOk({
      items: [{ product_id: product.id, quantity: 1 }],
      address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
      payment: "bank_transfer",
    });

    const result = attempt(
      `select public.advance_order_status(${lit(order.id)}::uuid, 'shipped')`,
      { role: "authenticated", userId: admin.id },
    );
    expect(result.ok).toBe(false);
    expect(record(result.hint)).toBe(ERROR_CODES.illegalTransition);
  });
});

describe("lookup_order rejection path", () => {
  it("an eleventh miss → lookup_rate_limited", async () => {
    const client = anonClient();
    const email = `jb-test-${uniq()}@example.test`;
    fx.trackRateLimitKey(`lookup:email:${email}`);

    let last: string | null = null;
    for (let i = 0; i < 11; i += 1) {
      const ref = `JB-${i.toString().padStart(6, "0")}`;
      fx.trackRateLimitKey(`lookup:ref:${ref}`);
      const { error } = await client.rpc("lookup_order", {
        p_order_ref: ref,
        p_email: email,
      });
      last = rpcError(error).hint;
      if (i < 10) {
        expect(last, `miss ${i + 1} should be a plain empty result`).toBeNull();
      }
    }
    expect(record(last)).toBe(ERROR_CODES.lookupRateLimited);
  });
});

/**
 * `ERROR_CODES` is split by who raises it. Auth codes are GoTrue's own,
 * passed through unchanged; everything else is the schema's, and everything
 * else has to be reachable.
 */
const DB_OWNED: readonly ErrorCode[] = [
  ERROR_CODES.soldOut,
  ERROR_CODES.productUnavailable,
  ERROR_CODES.variantUnavailable,
  ERROR_CODES.rateMismatch,
  ERROR_CODES.orderRateLimited,
  ERROR_CODES.emptyCart,
  ERROR_CODES.invalidAddress,
  ERROR_CODES.invalidQuantity,
  ERROR_CODES.invalidPaymentMethod,
  ERROR_CODES.notAdmin,
  ERROR_CODES.orderNotFound,
  ERROR_CODES.illegalTransition,
  ERROR_CODES.lookupRateLimited,
];

const AUTH_OWNED: readonly ErrorCode[] = [
  ERROR_CODES.otpRateLimited,
  ERROR_CODES.invalidCredentials,
  ERROR_CODES.otpExpired,
  // GoTrue returns this when an unverified address tries to sign in. Postgres
  // never raises it, so it must not be expected to have a `hint` site.
  ERROR_CODES.emailNotConfirmed,
];

describe("error code coverage", () => {
  it("accounts for every code in ERROR_CODES as either ours or GoTrue's", () => {
    // A code added to the constant without being classified here fails this
    // test rather than quietly escaping the coverage assertion below.
    expect([...DB_OWNED, ...AUTH_OWNED].sort()).toEqual(
      Object.values(ERROR_CODES).sort(),
    );
  });

  it("raises every code the database is responsible for", () => {
    const missing = DB_OWNED.filter((code) => !produced.has(code));
    expect(missing, "codes in ERROR_CODES that no tested path produces").toEqual([]);
  });

  it("raises nothing the UI has no branch for", () => {
    // Static sweep of the migration: every `using hint = '…'` in the schema
    // must be a value the frontend knows. A typo here is a silent fallthrough
    // to "try again" for an error with a real repair.
    const dir = join(process.cwd(), "supabase", "migrations");
    const sql = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .join("\n");

    const hints = [...sql.matchAll(/hint\s*=\s*'([^']+)'/g)].map((m) => m[1]!);
    expect(hints.length).toBeGreaterThan(0);

    const known = new Set<string>(Object.values(ERROR_CODES));
    expect([...new Set(hints)].filter((h) => !known.has(h))).toEqual([]);
  });
});
