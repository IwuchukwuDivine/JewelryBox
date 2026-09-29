import type { ProductsRepository } from "~/utils/types/api";
import type {
  PaginatedProducts,
  Product,
  ProductFilters,
  ProductSort,
} from "~/utils/types/shop";
import { PRODUCTS_PER_PAGE } from "~/utils/constants/catalog";
import { getSupabase } from "~/utils/supabase";
import mapError from "~/utils/api/mapError";
import sanitizeSearch from "~/utils/api/sanitizeSearch";
import { PRODUCT_SELECT, rowToProduct } from "~/utils/api/rows";

/**
 * The public catalogue.
 *
 * Every read here filters `archived_at is null`. The RLS policy does it too, so
 * this is belt and braces — except in `allSlugs()`, where it is the only thing
 * standing between an archived piece and a 404 in the sitemap.
 */

/**
 * `name-asc` sorts under the database collation rather than `localeCompare()`,
 * so an accented or leading-article name can land in a slightly different place
 * than it did against the fixtures. Cosmetic, and recorded rather than papered
 * over with a client-side re-sort that would break pagination.
 */
const SORT_ORDER: Record<
  ProductSort,
  { column: "created_at" | "price_ngn" | "name"; ascending: boolean }
> = {
  "newest": { column: "created_at", ascending: false },
  "price-asc": { column: "price_ngn", ascending: true },
  "price-desc": { column: "price_ngn", ascending: false },
  "name-asc": { column: "name", ascending: true },
};

/** Matched across the three text columns the trigram index covers. */
const searchClause = (raw: string): string => {
  const term = sanitizeSearch(raw);
  return term
    ? `name.ilike.*${term}*,brand.ilike.*${term}*,description.ilike.*${term}*`
    : "";
};

/**
 * `inStockOnly` means "orderable", not "held in stock" — `productAvailability()`
 * short-circuits on `made_to_order` before it looks at `in_stock`, and the mock
 * filter does the same, so a made-to-order piece must survive this filter.
 */
const IN_STOCK_CLAUSE = "in_stock.eq.true,made_to_order.eq.true";

export const supabaseProductsRepo: ProductsRepository = {
  async list(filters: ProductFilters): Promise<PaginatedProducts> {
    const perPage = filters.perPage ?? PRODUCTS_PER_PAGE;
    const sort = SORT_ORDER[filters.sort ?? "newest"];
    const search = filters.search ? searchClause(filters.search) : "";

    /**
     * One builder, used for the page and for the clamp recount, so the filter
     * set cannot diverge between them — a filter applied to only one of the two
     * gives a correct page with a wrong total, which reads as a UI bug rather
     * than a data bug and is why this is not two functions.
     */
    const runPage = (page: number) => {
      let query = getSupabase()
        .from("products")
        .select(PRODUCT_SELECT, { count: "exact" })
        .is("archived_at", null);

      // `category` wins when both are set; `categories` narrows to a nav
      // collection such as Jewelry, which spans four categories. An EMPTY
      // `categories` array must not narrow at all — that is what the
      // tag-driven collections (Moissanite, Gifts) rely on.
      if (filters.category) query = query.eq("category", filters.category);
      else if (filters.categories?.length) {
        query = query.in("category", filters.categories);
      }

      if (filters.tag) query = query.contains("tags", [filters.tag]);
      if (typeof filters.maxPrice === "number") {
        query = query.lte("price_ngn", filters.maxPrice);
      }
      if (filters.inStockOnly) query = query.or(IN_STOCK_CLAUSE);
      if (search) query = query.or(search);

      return query
        .order(sort.column, { ascending: sort.ascending })
        // Every one of the sort columns has ties. Without this tiebreaker
        // page 2 repeats rows and skips others, and it is invisible against
        // fixtures because the mock sorts a stable array.
        .order("id", { ascending: true })
        .order("position", { referencedTable: "variants" })
        .range((page - 1) * perPage, page * perPage - 1);
    };

    let page = Math.max(1, filters.page ?? 1);
    let result = await runPage(page);

    // A stale `?page=` in the URL can ask for a range past the end of the
    // result set; PostgREST answers PGRST103 rather than an empty page. Clamp
    // to the last page, which is what the mock does by construction.
    if (result.error?.code === "PGRST103") {
      const first = await runPage(1);
      if (first.error) throw mapError(first.error);
      page = Math.max(1, Math.ceil((first.count ?? 0) / perPage));
      result = page === 1 ? first : await runPage(page);
    }
    if (result.error) throw mapError(result.error);

    const items = (result.data ?? []).map(rowToProduct);
    const total = result.count ?? items.length;
    return {
      items,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  },

  async bySlug(slug: string): Promise<Product | null> {
    const { data, error } = await getSupabase()
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", slug)
      .is("archived_at", null)
      .order("position", { referencedTable: "variants" })
      .maybeSingle();
    if (error) throw mapError(error);
    return data ? rowToProduct(data) : null;
  },

  async featured(limit = 8): Promise<Product[]> {
    const { data, error } = await getSupabase()
      .from("products")
      .select(PRODUCT_SELECT)
      .is("archived_at", null)
      .eq("featured", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .order("position", { referencedTable: "variants" })
      .limit(limit);
    if (error) throw mapError(error);
    return (data ?? []).map(rowToProduct);
  },

  /**
   * Same category first, then anything sharing a tag — the two halves of the
   * mock's score, in query form. Two round trips at most, and only when the
   * category alone cannot fill the rail.
   */
  async related(slug: string, limit = 4): Promise<Product[]> {
    const sb = getSupabase();
    const source = await sb
      .from("products")
      .select("id, category, tags")
      .eq("slug", slug)
      .is("archived_at", null)
      .maybeSingle();
    if (source.error) throw mapError(source.error);
    if (!source.data) return [];

    const sameCategory = await sb
      .from("products")
      .select(PRODUCT_SELECT)
      .is("archived_at", null)
      .eq("category", source.data.category)
      .neq("id", source.data.id)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .order("position", { referencedTable: "variants" })
      .limit(limit);
    if (sameCategory.error) throw mapError(sameCategory.error);

    const items = (sameCategory.data ?? []).map(rowToProduct);
    if (items.length >= limit || !source.data.tags.length) {
      return items.slice(0, limit);
    }

    const seen = new Set([source.data.id, ...items.map((p) => p.id)]);
    const sameTags = await sb
      .from("products")
      .select(PRODUCT_SELECT)
      .is("archived_at", null)
      .overlaps("tags", source.data.tags)
      .not("id", "in", `(${[...seen].join(",")})`)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .order("position", { referencedTable: "variants" })
      .limit(limit - items.length);
    if (sameTags.error) throw mapError(sameTags.error);

    return [...items, ...(sameTags.data ?? []).map(rowToProduct)].slice(0, limit);
  },

  /**
   * The `search_products` RPC, not a hand-rolled `ilike`: it ANDs one pattern
   * per whitespace token across name, brand and description — so "meridian
   * chronograph" matches a piece whose brand and name each supply one word —
   * and ranks by trigram similarity.
   */
  async search(query: string, limit = 10): Promise<Product[]> {
    const term = query.trim();
    if (!term) return [];
    const { data, error } = await getSupabase().rpc("search_products", {
      p_q: term,
      p_limit: limit,
    });
    if (error) throw mapError(error);
    return (data ?? []).map(rowToProduct);
  },

  /**
   * Feeds the sitemap and the prerender list, so it pages past PostgREST's
   * `max_rows = 1000` — which truncates silently, and a truncated sitemap is
   * invisible until a page stops being indexed.
   */
  async allSlugs(): Promise<{ slug: string; updated_at: string }[]> {
    const sb = getSupabase();
    const pageSize = 1000;
    const slugs: { slug: string; updated_at: string }[] = [];

    for (let page = 0; ; page += 1) {
      const { data, error } = await sb
        .from("products")
        .select("slug, updated_at")
        // Not redundant with the RLS policy: an admin session would otherwise
        // see archived rows here and publish a dead URL in the sitemap.
        .is("archived_at", null)
        .order("slug", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw mapError(error);

      slugs.push(...(data ?? []));
      if (!data || data.length < pageSize) return slugs;
    }
  },
};
