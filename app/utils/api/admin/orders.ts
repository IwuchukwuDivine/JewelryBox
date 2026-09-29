import type { AdminOrdersRepository } from "~/utils/types/api";
import type { Order, OrderStatus } from "~/utils/types/shop";
import { getSupabase } from "~/utils/supabase";
import mapError from "~/utils/api/mapError";
import isUuid from "~/utils/api/isUuid";
import sanitizeSearch from "~/utils/api/sanitizeSearch";
import { ORDER_SELECT, rowToOrder } from "~/utils/api/rows";

/**
 * The admin order table.
 *
 * Reads come straight from `orders` (the `Read own orders` policy lets an admin
 * see every row); the one write goes through `advance_order_status()`. That is
 * not a convention — `revoke update on orders` plus `grant update
 * (delivery_fee_ngn)` means a direct `update … set status` from here would be
 * refused, and `orders_guard_immutable()` re-checks the transition on any path
 * that got through anyway.
 */

const ORDERS_PER_PAGE = 20;

export const supabaseAdminOrdersRepo: AdminOrdersRepository = {
  async list(
    filters: {
      status?: OrderStatus;
      search?: string;
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<{ items: Order[]; total: number }> {
    const perPage = filters.perPage ?? ORDERS_PER_PAGE;
    const search = filters.search ? sanitizeSearch(filters.search) : "";

    const runPage = (page: number) => {
      let query = getSupabase()
        .from("orders")
        .select(ORDER_SELECT, { count: "exact" });

      if (filters.status) query = query.eq("status", filters.status);
      if (search) {
        // Reference, email or customer name — the three things she has to hand
        // when a customer calls. Backed by the trigram index over the same
        // concatenation.
        query = query.or(
          `order_number.ilike.*${search}*,shipping_address->>email.ilike.*${search}*,shipping_address->>full_name.ilike.*${search}*`,
        );
      }

      return query
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range((page - 1) * perPage, page * perPage - 1);
    };

    let page = Math.max(1, filters.page ?? 1);
    let result = await runPage(page);
    if (result.error?.code === "PGRST103") {
      const first = await runPage(1);
      if (first.error) throw mapError(first.error);
      page = Math.max(1, Math.ceil((first.count ?? 0) / perPage));
      result = page === 1 ? first : await runPage(page);
    }
    if (result.error) throw mapError(result.error);

    const items = (result.data ?? []).map(rowToOrder);
    return { items, total: result.count ?? items.length };
  },

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
   * `advance_order_status()` validates the move against the order's own payment
   * method — `received → shipped` is refused on a transfer, `confirmed` is
   * refused outright on pay-on-delivery — sets `paid_at` at the right step and
   * decrements stock on first commitment. A rejection arrives as
   * `illegal_transition`, which retrying will never fix, and the UI should say
   * so rather than offering a retry.
   */
  async advance(id: string, to: OrderStatus, note?: string): Promise<Order> {
    const { data, error } = await getSupabase().rpc("advance_order_status", {
      p_order_id: id,
      p_to: to,
      ...(note ? { p_note: note } : {}),
    });
    if (error) throw mapError(error);
    return rowToOrder(data);
  },
};
