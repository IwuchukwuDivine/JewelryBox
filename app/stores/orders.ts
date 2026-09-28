import type { RecentOrderRef } from "~/utils/types/shop";

/**
 * Device-local pointers to orders placed from this browser.
 *
 * This is the entire guest order-lookup mechanism: a guest has no session, so
 * `/order/[id]` and `/track` recover the `{ order_number, email }` pair from
 * here and hand it to `lookup_order`. Signed-in clients read their own rows
 * through RLS instead and never touch this.
 */

/*
 * BUMP THIS AT PHASE F. Mock product ids are `prd_001`; the real schema uses
 * `gen_random_uuid()`. Every persisted order pointer in a returning browser goes
 * stale the moment the repositories swap, and `afterHydrate` below only
 * clears it if the version no longer matches.
 */
const RECENT_ORDERS_VERSION = 1;
const MAX_RECENT = 20;

const isOrderRef = (value: unknown): value is RecentOrderRef => {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.order_number === "string" &&
    typeof r.email === "string"
  );
};

export const useRecentOrdersStore = defineStore(
  "recent-orders",
  () => {
    const entries = ref<RecentOrderRef[]>([]);
    const version = ref(RECENT_ORDERS_VERSION);

    /******************* Actions *******************/
    const remember = (entry: RecentOrderRef) => {
      entries.value = [
        entry,
        ...entries.value.filter((e) => e.id !== entry.id),
      ].slice(0, MAX_RECENT);
    };

    /** Matches on either the internal id or the customer-facing order number. */
    const findRef = (idOrNumber: string): RecentOrderRef | undefined => {
      const needle = idOrNumber.trim().toLowerCase();
      return entries.value.find(
        (e) =>
          e.id.toLowerCase() === needle ||
          e.order_number.toLowerCase() === needle,
      );
    };

    const forget = () => {
      entries.value = [];
    };

    return { entries, version, remember, findRef, forget };
  },
  {
    persist: {
      storage: import.meta.client ? localStorage : undefined,
      afterHydrate: (context): void => {
        const store = context.store as unknown as {
          version: number;
          entries: RecentOrderRef[];
          forget: () => void;
        };
        if (store.version !== RECENT_ORDERS_VERSION) return store.forget();
        if (!Array.isArray(store.entries)) return store.forget();
        store.entries = store.entries.filter(isOrderRef).slice(0, MAX_RECENT);
      },
    },
  },
);
