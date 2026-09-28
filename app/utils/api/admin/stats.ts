import type { AdminStatsRepository } from "~/utils/types/api";
import type {
  AdminAnalytics,
  AdminStats,
  RevenuePoint,
  TopProduct,
} from "~/utils/types/admin";
import { getSupabase } from "~/utils/supabase";
import mapError from "~/utils/api/mapError";
import {
  jsonArray,
  jsonNumber,
  jsonObject,
  jsonString,
} from "~/utils/api/rows";

/**
 * Dashboard tiles and charts.
 *
 * Both of these are one round trip that aggregates in Postgres. The alternative
 * — pulling order rows into the browser and summing them in JavaScript — grows
 * without bound and ships every customer's address to the client to draw a bar
 * chart.
 *
 * Both RPCs are SECURITY INVOKER with an explicit `is_admin()` guard, so a
 * non-admin caller gets `not_admin` rather than a quietly empty dashboard.
 * Day buckets are Africa/Lagos, and the daily series is zero-filled server-side
 * so a quiet day is a zero rather than a gap the chart closes up.
 */
export const supabaseAdminStatsRepo: AdminStatsRepository = {
  async stats(): Promise<AdminStats> {
    const { data, error } = await getSupabase().rpc("admin_stats");
    if (error) throw mapError(error);

    const row = jsonObject(data);
    return {
      orders_total: jsonNumber(row?.orders_total),
      orders_awaiting_payment: jsonNumber(row?.orders_awaiting_payment),
      orders_to_ship: jsonNumber(row?.orders_to_ship),
      revenue_ngn: jsonNumber(row?.revenue_ngn),
      products_total: jsonNumber(row?.products_total),
      products_out_of_stock: jsonNumber(row?.products_out_of_stock),
    };
  },

  async analytics(days = 30): Promise<AdminAnalytics> {
    const { data, error } = await getSupabase().rpc("admin_analytics", {
      p_days: days,
    });
    if (error) throw mapError(error);

    const root = jsonObject(data);

    const revenue: RevenuePoint[] = jsonArray(root?.revenue).flatMap((entry) => {
      const point = jsonObject(entry);
      const date = jsonString(point?.date);
      return date === null
        ? []
        : [
            {
              date,
              revenue_ngn: jsonNumber(point?.revenue_ngn),
              orders: jsonNumber(point?.orders),
            },
          ];
    });

    const breakdown = jsonObject(root?.status_breakdown) ?? {};
    const status_breakdown: Record<string, number> = {};
    for (const [status, count] of Object.entries(breakdown)) {
      status_breakdown[status] = jsonNumber(count);
    }

    const top_products: TopProduct[] = jsonArray(root?.top_products).flatMap(
      (entry) => {
        const item = jsonObject(entry);
        const productId = jsonString(item?.product_id);
        return productId === null
          ? []
          : [
              {
                product_id: productId,
                // The snapshot name, so an archived piece still has a label.
                name: jsonString(item?.name) ?? "",
                units: jsonNumber(item?.units),
                revenue_ngn: jsonNumber(item?.revenue_ngn),
              },
            ];
      },
    );

    return { revenue, status_breakdown, top_products };
  },
};
