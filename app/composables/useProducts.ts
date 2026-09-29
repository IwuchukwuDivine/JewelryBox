import { useQuery } from "@tanstack/vue-query";
import type { MaybeRefOrGetter } from "vue";
import type {
  PaginatedProducts,
  Product,
  ProductCategory,
  ProductFilter,
  ProductFilters,
  ProductSort,
  ProductTag,
} from "~/utils/types/shop";
import {
  FILTER_OPTIONS,
  PRODUCTS_PER_PAGE,
  SORT_OPTIONS,
  UNDER_PRICE_NGN,
} from "~/utils/constants/catalog";

/**
 * Catalogue reads.
 *
 * Filter state IS the route query — there is no filter store. A page derives
 * `ProductFilters` from `route.query` with `filtersFromQuery()`, and writes
 * changes back with `filtersToQuery()`, which omits defaults so URLs stay
 * clean and canonical-friendly.
 */

const SORT_VALUES = SORT_OPTIONS.map((o) => o.value);
const FILTER_VALUES = FILTER_OPTIONS.map((o) => o.value);

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

/** Turn the chip a customer picked into the filter fields the repository understands. */
const applyFilterChip = (filters: ProductFilters, chip: ProductFilter): ProductFilters => {
  switch (chip) {
    case "new":
      return { ...filters, tag: "new" };
    case "moissanite":
      return { ...filters, tag: "moissanite" };
    case "in-stock":
      return { ...filters, inStockOnly: true };
    case "under":
      return { ...filters, maxPrice: UNDER_PRICE_NGN };
    case "all":
    default:
      return filters;
  }
};

/**
 * Read filters out of a route query, validating everything against the
 * catalogue whitelists — a hand-typed `?sort=cheapest` must not reach the
 * repository.
 *
 * `base` carries what the ROUTE already fixed: the category on `/[category]`,
 * or the category/tag pair a nav collection resolves to.
 */
export const filtersFromQuery = (
  query: Record<string, unknown>,
  base: Partial<ProductFilters> = {},
): ProductFilters => {
  const sortParam = asString(query.sort) as ProductSort | undefined;
  const chipParam = asString(query.filter) as ProductFilter | undefined;
  const pageParam = Number(asString(query.page) ?? 1);

  const filters: ProductFilters = {
    ...base,
    search: asString(query.q) ?? base.search,
    sort: sortParam && SORT_VALUES.includes(sortParam) ? sortParam : "newest",
    page: Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1,
    perPage: base.perPage ?? PRODUCTS_PER_PAGE,
  };

  const chip = chipParam && FILTER_VALUES.includes(chipParam) ? chipParam : "all";
  return applyFilterChip(filters, chip);
};

/** Which chip should render active for the current query. */
export const activeFilterChip = (query: Record<string, unknown>): ProductFilter => {
  const chip = asString(query.filter) as ProductFilter | undefined;
  return chip && FILTER_VALUES.includes(chip) ? chip : "all";
};

/**
 * Build a route query, omitting every default so `/watches` stays `/watches`
 * rather than `/watches?filter=all&sort=newest&page=1`.
 */
export const filtersToQuery = (input: {
  filter?: ProductFilter;
  sort?: ProductSort;
  page?: number;
  q?: string;
}): Record<string, string> => {
  const query: Record<string, string> = {};
  if (input.filter && input.filter !== "all") query.filter = input.filter;
  if (input.sort && input.sort !== "newest") query.sort = input.sort;
  if (input.page && input.page > 1) query.page = String(input.page);
  if (input.q?.trim()) query.q = input.q.trim();
  return query;
};

/** True when anything narrows the grid — drives `robots: noindex, follow`. */
export const hasActiveFilters = (query: Record<string, unknown>): boolean =>
  activeFilterChip(query) !== "all" ||
  Boolean(asString(query.sort)) ||
  Boolean(asString(query.q)) ||
  Number(asString(query.page) ?? 1) > 1;

/* ── Queries ──────────────────────────────────────────────────────────── */

export const useProductsQuery = (filters: MaybeRefOrGetter<ProductFilters>) =>
  useQuery<PaginatedProducts>({
    queryKey: ["products", () => toValue(filters)] as const,
    queryFn: () => productsRepo.list(toValue(filters)),
  });

export const useProductQuery = (slug: MaybeRefOrGetter<string>) =>
  useQuery<Product | null>({
    queryKey: ["product", () => toValue(slug)] as const,
    queryFn: () => productsRepo.bySlug(toValue(slug)),
    enabled: () => Boolean(toValue(slug)),
  });

export const useFeaturedQuery = (limit: MaybeRefOrGetter<number> = 8) =>
  useQuery<Product[]>({
    queryKey: ["featured", () => toValue(limit)] as const,
    queryFn: () => productsRepo.featured(toValue(limit)),
  });

export const useRelatedQuery = (
  slug: MaybeRefOrGetter<string | undefined>,
  limit: MaybeRefOrGetter<number> = 4,
) =>
  useQuery<Product[]>({
    queryKey: ["related", () => toValue(slug)] as const,
    queryFn: () => productsRepo.related(toValue(slug) ?? "", toValue(limit)),
    enabled: () => Boolean(toValue(slug)),
  });

export const useProductSearchQuery = (
  query: MaybeRefOrGetter<string>,
  limit: MaybeRefOrGetter<number> = 10,
) =>
  useQuery<Product[]>({
    queryKey: ["product-search", () => toValue(query)] as const,
    queryFn: () => productsRepo.search(toValue(query), toValue(limit)),
    enabled: () => toValue(query).trim().length > 0,
  });

/**
 * Hydrate a list of product IDs — the wishlist, which stores IDs rather than
 * slugs. Order is preserved as given, so the grid matches the save order.
 *
 * TODO(contract): `ProductsRepository` has no `byIds()`, so this pages the
 * catalogue and filters client-side. That is fine against fixtures and wrong
 * against a real table. Adding `byIds(ids: string[])` to `types/api.ts` is a
 * cross-lane change and needs the backend lane to agree before Phase F.
 */
export const useProductsByIdsQuery = (ids: MaybeRefOrGetter<string[]>) =>
  useQuery<Product[]>({
    queryKey: ["products-by-ids", () => [...toValue(ids)].sort()] as const,
    queryFn: async () => {
      const wanted = toValue(ids);
      if (!wanted.length) return [];
      const page = await productsRepo.list({ perPage: 500, page: 1 });
      const byId = new Map(page.items.map((p) => [p.id, p]));
      return wanted.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
    },
    enabled: () => toValue(ids).length > 0,
  });

/** Recently viewed stores slugs, so it resolves through `bySlug`. */
export const useProductsBySlugsQuery = (slugs: MaybeRefOrGetter<string[]>) =>
  useQuery<Product[]>({
    queryKey: ["products-by-slugs", () => [...toValue(slugs)]] as const,
    queryFn: async () => {
      const wanted = toValue(slugs);
      const found = await Promise.all(wanted.map((slug) => productsRepo.bySlug(slug)));
      return found.filter((p): p is Product => Boolean(p));
    },
    enabled: () => toValue(slugs).length > 0,
  });

/** Category and collection helpers used by the listing pages. */
export const categoryFilters = (category: ProductCategory): Partial<ProductFilters> => ({
  category,
});

export const collectionFilters = (input: {
  categories: ProductCategory[];
  tag?: ProductTag;
}): Partial<ProductFilters> => ({
  // One category narrows to `category`; several use `categories`. An empty
  // list means the collection spans everything and is tag-driven instead.
  ...(input.categories.length === 1
    ? { category: input.categories[0] }
    : input.categories.length > 1
      ? { categories: [...input.categories] }
      : {}),
  ...(input.tag ? { tag: input.tag } : {}),
});
