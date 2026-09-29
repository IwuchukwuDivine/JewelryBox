/**
 * Slugs of pieces this browser has opened, newest first.
 *
 * Feeds the "Recently viewed" rail on both the home page and the category
 * pages. Slugs only — the products themselves are re-fetched, so a piece that
 * was edited or delisted never renders stale.
 */

const RECENTLY_VIEWED_VERSION = 1;
const MAX_RECENT = 12;

export const useRecentlyViewedStore = defineStore(
  "recently-viewed",
  () => {
    const slugs = ref<string[]>([]);
    const version = ref(RECENTLY_VIEWED_VERSION);

    /******************* Actions *******************/
    const record = (slug: string) => {
      slugs.value = [slug, ...slugs.value.filter((s) => s !== slug)].slice(
        0,
        MAX_RECENT,
      );
    };

    const clear = () => {
      slugs.value = [];
    };

    return { slugs, version, record, clear };
  },
  {
    persist: {
      storage: import.meta.client ? localStorage : undefined,
      afterHydrate: (context): void => {
        const store = context.store as unknown as {
          version: number;
          slugs: string[];
          clear: () => void;
        };
        if (store.version !== RECENTLY_VIEWED_VERSION) return store.clear();
        if (!Array.isArray(store.slugs)) return store.clear();
        store.slugs = store.slugs
          .filter((s) => typeof s === "string")
          .slice(0, MAX_RECENT);
      },
    },
  },
);
