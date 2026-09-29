import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lit, one } from "./helpers/sql";
import { address, scope, uniq, type OrderRow, type Scope } from "./helpers/fixtures";
import { anonClient, service } from "./helpers/supabase";

/**
 * Bank details are order-scoped, not published — the frozen contract says so:
 * `PAYMENT_METHODS.bank_transfer.description` reads "Account details shown
 * after you order". Holding the order id *and* the email used at checkout is
 * what buys them; a scraper with the anon key gets nothing.
 */

let fx: Scope;
let order: OrderRow;
let podOrder: OrderRow;
let email: string;
let seeded = false;
const anon = anonClient();

const BANK = { bank: "Test Bank", account_name: "JB Test", account_number: "0123456789" };

const instructions = (p_order_id: string, p_email: string) =>
  anon.rpc("get_payment_instructions", { p_order_id, p_email });

beforeAll(async () => {
  fx = scope();

  // `bank_account` is a single global row that the seed also owns, so adopt it
  // when it is already there rather than colliding with another lane.
  const existing = one<{ n: number }>(
    `select count(*)::int as n from public.site_settings where key = 'bank_account'`,
  ).n;
  if (existing === 0) {
    await fx.setting("bank_account", BANK, false);
    seeded = true;
  }

  email = `jb-test-${uniq()}@example.test`;
  const product = await fx.product({ price_ngn: 30_000 });
  order = await fx.placeOk({
    items: [{ product_id: product.id, quantity: 1 }],
    address: address({ state: "Lagos", area: `Test Area ${uniq()}`, email }),
    payment: "bank_transfer",
  });
  podOrder = await fx.placeOk({
    items: [{ product_id: product.id, quantity: 1 }],
    address: address({ state: "Lagos", area: `Test Area ${uniq()}` }),
    payment: "pay_on_delivery",
  });
});

afterAll(async () => {
  await fx.destroy();
});

describe("get_payment_instructions", () => {
  it("returns the bank row to whoever holds the order id and its email", async () => {
    const { data, error } = await instructions(order.id, email);

    expect(error).toBeNull();
    const stored = one<{ value: Record<string, unknown> }>(
      `select value from public.site_settings where key = 'bank_account'`,
    ).value;
    expect(data).toEqual(stored);
    if (seeded) expect(data).toEqual(BANK);
  });

  it("normalises the email the same way the order stored it", async () => {
    const { data, error } = await instructions(
      order.id,
      `  ${email.toUpperCase()}  `,
    );
    expect(error).toBeNull();
    expect(data).not.toBeNull();
  });

  it("returns null for the wrong email", async () => {
    const { data, error } = await instructions(
      order.id,
      `jb-test-${uniq()}@example.test`,
    );
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("returns null for an unknown order", async () => {
    const { data, error } = await instructions(
      "00000000-0000-4000-8000-000000000000",
      email,
    );
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("returns null on a pay-on-delivery order — there is nothing to transfer to", async () => {
    const podEmail = String(podOrder.shipping_address.email);
    const { data, error } = await instructions(podOrder.id, podEmail);

    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("keeps the row itself unreadable through the table", async () => {
    const { data, error } = await anon
      .from("site_settings")
      .select("key")
      .eq("key", "bank_account");

    expect(error).toBeNull();
    // The RPC is the only way to it, which is the entire point of `is_public`.
    expect(data).toEqual([]);
    expect(
      one<{ is_public: boolean }>(
        `select is_public from public.site_settings where key = ${lit("bank_account")}`,
      ).is_public,
    ).toBe(false);
  });

  it("is not a way to confirm an email address against an order id", async () => {
    // Both failure modes return the same null, so the RPC leaks no signal
    // about which half was wrong.
    const wrongEmail = await instructions(order.id, "nobody@example.test");
    const wrongOrder = await instructions(
      "00000000-0000-4000-8000-000000000000",
      "nobody@example.test",
    );
    expect(wrongEmail.data).toBe(wrongOrder.data);
  });
});

describe("the service role can still read every setting", () => {
  it("sees the private row, so admin tooling is unaffected", async () => {
    const { data, error } = await service()
      .from("site_settings")
      .select("key")
      .eq("key", "bank_account");

    expect(error).toBeNull();
    expect((data ?? []).length).toBe(1);
  });
});
