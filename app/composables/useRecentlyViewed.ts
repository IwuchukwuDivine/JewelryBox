import type { MaybeRefOrGetter } from "vue";
import type { Product } from "~/utils/types/shop";

/**
 * "Recently viewed" — shown on the home page and under the category grids.
 *
 * Only slugs are stored; the pieces are re-fetched, so an edited or delisted
 * piece never renders stale. The piece currently being viewed is excluded.
 */
export default (exclude?: MaybeRefOrGetter<string | undefined>) => {
  const store = useRecentlyViewedStore();
  const mounted = useMounted();

  const slugs = computed(() => {
    if (!mounted.value) return [];
    const skip = toValue(exclude);
    return store.slugs.filter((slug) => slug !== skip);
  });

  const { data, isPending } = useProductsBySlugsQuery(slugs);

  const products = computed<Product[]>(() => data.value ?? []);

  return {
    products,
    isPending,
    hasAny: computed(() => products.value.length > 0),
    record: store.record,
    clear: store.clear,
  };
};
