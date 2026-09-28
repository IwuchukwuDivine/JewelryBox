import type { OrdersRepository } from "~/utils/types/api";
import type { Address, Order, PlaceOrderInput } from "~/utils/types/shop";
import { getSupabase } from "~/utils/supabase";
import mapError from "~/utils/api/mapError";
import isUuid from "~/utils/api/isUuid";
import { ORDER_SELECT, rowToOrder } from "~/utils/api/rows";

/**
 * Orders go through security-definer RPCs, never through table writes — there
 * is no INSERT policy on `orders` and `place_order()` is the only way a row
 * gets there.
 *
 * The client sends ids, quantities and an address. It never sends a price, a
 * delivery fee or a delivery method: the database reprices every line from the
 * catalogue, derives the method from the address state and resolves the fee from
 * `delivery_rates`. `PlaceOrderInput` has no price field, and a price sent
 * anyway is read by nothing.
 */

/**
 * Rebuilt as a plain object rather than passed through, for two reasons: the
 * RPC parameter is `jsonb`, and TypeScript will not hand an interface to a
 * `Json` index signature; and naming the nine fields means an extra key on an
 * `Address`-shaped object cannot ride along into the payload. `place_order()`
 * rebuilds and length-caps it again server-side — this is not the control.
 */
const addressPayload = (address: Address) => ({
  full_name: address.full_name,
  email: address.email,
  phone: address.phone,
  line1: address.line1,
  line2: address.line2 ?? null,
  city: address.city,
  state: address.state,
  area: address.area ?? null,
  country: address.country,
  notes: address.notes ?? null,
});

export const supabaseOrdersRepo: OrdersRepository = {
  async place(input: PlaceOrderInput): Promise<Order> {
    const { data, error } = await getSupabase().rpc("place_order", {
      p_items: input.items.map((line) => ({
        product_id: line.product_id,
        variant_id: line.variant_id ?? null,
        quantity: line.quantity,
      })),
      p_address: addressPayload(input.address),
      // Optional by contract, and only ever an assertion to be checked: the
      // database re-resolves the rate from the address and raises
      // `rate_mismatch` if this disagrees. Omitted entirely when the
      // destination is unpriced.
      p_delivery: input.delivery.rate_id ? { rate_id: input.delivery.rate_id } : {},
      p_payment: input.payment_method,
    });
    if (error) throw mapError(error);
    return rowToOrder(data);
  },

  /** RLS scopes this to the caller; signed out it is simply empty. */
  async mine(): Promise<Order[]> {
    const { data, error } = await getSupabase()
      .from("orders")
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });
    if (error) throw mapError(error);
    return (data ?? []).map(rowToOrder);
  },

  /**
   * By id or by order number, as the mock does — the confirmation page holds an
   * id, a link pasted out of an email holds the reference. Guest orders are not
   * visible here (no `user_id`), which is what `lookup()` is for.
   */
  async byId(id: string): Promise<Order | null> {
    const reference = id.trim();
    if (!reference) return null;

    const base = getSupabase().from("orders").select(ORDER_SELECT);
    const { data, error } = await (isUuid(reference)
      ? base.eq("id", reference)
      : base.eq("order_number", reference.toUpperCase())
    ).maybeSingle();
    if (error) throw mapError(error);
    return data ? rowToOrder(data) : null;
  },

  /**
   * Guest tracking. `lookup_order()` normalises the reference with Crockford's
   * decode rules, so `jb 0l1z2s` finds `JB-01IZ2S`, and matches the email
   * against the stored (lowercased) address.
   *
   * A miss is an empty set, not an error — only the anti-enumeration throttle
   * raises, as `lookup_rate_limited`.
   */
  async lookup(orderNumber: string, email: string): Promise<Order | null> {
    const { data, error } = await getSupabase().rpc("lookup_order", {
      p_order_ref: orderNumber,
      p_email: email,
    });
    if (error) throw mapError(error);
    const [row] = data ?? [];
    return row ? rowToOrder(row) : null;
  },
};
