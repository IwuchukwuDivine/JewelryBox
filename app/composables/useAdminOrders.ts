import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import type { MaybeRefOrGetter } from "vue";
import type { Order, OrderStatus } from "~/utils/types/shop";

export interface AdminOrderFilters {
  status?: OrderStatus;
  search?: string;
  page?: number;
  perPage?: number;
}

/**
 * The admin order list.
 *
 * `keepPreviousData` so paging and typing in the search box do not blank the
 * table between requests — the rows dim and swap rather than collapsing to a
 * skeleton on every keystroke.
 */
export const useAdminOrdersQuery = (
  filters: MaybeRefOrGetter<AdminOrderFilters> = {},
) => {
  const mounted = useMounted();

  return useQuery<{ items: Order[]; total: number }>({
    queryKey: ["admin-orders", () => toValue(filters)] as const,
    enabled: () => mounted.value,
    queryFn: () => adminOrdersRepo.list(toValue(filters)),
    placeholderData: keepPreviousData,
  });
};
