/**
 * Saved pieces. Local-first: the store answers instantly so the diamond
 * toggles without a round trip and guests get a working wishlist. When the
 * customer is signed in, `useWishlist()` writes through to the repository.
 */

/*
 * BUMP THIS AT PHASE F. Mock product ids are `prd_001`; the real schema uses
 * `gen_random_uuid()`. Every persisted wishlist in a returning browser goes
 * stale the moment the repositories swap, and `afterHydrate` below only
 * clears it if the version no longer matches.
 */
const WISHLIST_VERSION = 1;

export const useWishlistStore = defineStore(
  "wishlist",
  () => {
    const ids = ref<string[]>([]);
    const version = ref(WISHLIST_VERSION);

    /******************* Getters *******************/
    const count = computed(() => ids.value.length);

    /******************* Actions *******************/
    const has = (productId: string) => ids.value.includes(productId);

    /** Returns true when the piece was added, false when it was removed. */
    const toggle = (productId: string): boolean => {
      if (has(productId)) {
        ids.value = ids.value.filter((id) => id !== productId);
        return false;
      }
      ids.value = [productId, ...ids.value];
      return true;
    };

    const remove = (productId: string) => {
      ids.value = ids.value.filter((id) => id !== productId);
    };

    const set = (next: string[]) => {
      ids.value = [...new Set(next)];
    };

    const clear = () => {
      ids.value = [];
    };

    const reset = () => {
      ids.value = [];
      version.value = WISHLIST_VERSION;
    };

    return { ids, version, count, has, toggle, remove, set, clear, reset };
  },
  {
    persist: {
      storage: import.meta.client ? localStorage : undefined,
      afterHydrate: (context): void => {
        const store = context.store as unknown as {
          version: number;
          ids: string[];
          reset: () => void;
        };
        if (store.version !== WISHLIST_VERSION) return store.reset();
        if (!Array.isArray(store.ids)) return store.reset();
        store.ids = store.ids.filter((id) => typeof id === "string");
      },
    },
  },
);
