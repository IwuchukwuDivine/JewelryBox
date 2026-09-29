import { useQuery } from "@tanstack/vue-query";
import type { AdminStats } from "~/utils/types/admin";
import type { Product } from "~/utils/types/shop";

/**
 * The dashboard's own data: the six figures, and what needs restocking.
 *
 * Both are gated on `useMounted()` like every other query in this app. The
 * session is restored after hydration, so a server-side run would be
 * unauthenticated and `admin_stats()` would raise `not_admin`.
 */

/**
 * The six tiles, from the `admin_stats()` RPC — one round trip, aggregated in
 * Postgres. BGI pulled up to 5,000 order rows into the browser for the same
 * numbers.
 */
export const useAdminStatsQuery = () => {
  const mounted = useMounted();

  return useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    enabled: () => mounted.value,
    queryFn: () => adminStatsRepo.stats(),
  });
};

/** How many rows the low-stock scan pulls. See the TODO below. */
const LOW_STOCK_SCAN = 100;

/**
 * Pieces that are sold out or down to their last few.
 *
 * `productAvailability()` is the only place that decision is made — its own
 * doc names the admin table as a caller — so this filters on its verdict
 * rather than re-deriving the threshold here.
 *
 * TODO(contract): `ProductFilters` can express `inStockOnly` but nothing about
 * `stock_count`, so there is no way to ask the database for this directly. One
 * page of `LOW_STOCK_SCAN` rows is scanned and filtered client-side, which is
 * fine for a catalogue of this size and wrong once it outgrows one page.
 * Adding `lowStock?: boolean` to `ProductFilters` is a cross-lane change to
 * `types/api.ts` and needs the backend lane to agree.
 */
export const useAdminLowStockQuery = () => {
  const mounted = useMounted();

  return useQuery<Product[]>({
    queryKey: ["admin-low-stock"],
    enabled: () => mounted.value,
    queryFn: async () => {
      const page = await adminProductsRepo.list({ perPage: LOW_STOCK_SCAN, page: 1 });
      return page.items
        .filter((product) => {
          const state = productAvailability(product);
          return state === "sold" || state === "low-stock";
        })
        // Sold first, then the smallest counts — the order she should act in.
        .sort((a, b) => (a.stock_count ?? 0) - (b.stock_count ?? 0));
    },
  });
};
