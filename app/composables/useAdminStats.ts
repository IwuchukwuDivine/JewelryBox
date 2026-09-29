import { useQuery } from "@tanstack/vue-query";
import type { AdminStats } from "~/utils/types/admin";

/**
 * The dashboard's six figures, from the `admin_stats()` RPC.
 *
 * One round trip, aggregated in Postgres. BGI pulled up to 5,000 order rows
 * into the browser to compute the same numbers.
 *
 * Gated on `useMounted()` like every other query in this app: the session is
 * restored after hydration, so a server-side run would be unauthenticated and
 * `admin_stats()` would raise `not_admin`.
 */
export const useAdminStatsQuery = () => {
  const mounted = useMounted();

  return useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    enabled: () => mounted.value,
    queryFn: () => adminStatsRepo.stats(),
  });
};
