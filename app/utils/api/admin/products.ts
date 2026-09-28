import type { AdminProductsRepository } from "~/utils/types/api";
import type {
  PaginatedProducts,
  Product,
  ProductFilters,
  ProductInput,
  ProductSort,
  ProductVariant,
  VariantInput,
} from "~/utils/types/shop";
import { PRODUCTS_PER_PAGE } from "~/utils/constants/catalog";
import { getSupabase } from "~/utils/supabase";
import mapError from "~/utils/api/mapError";
import sanitizeSearch from "~/utils/api/sanitizeSearch";
import {
  PRODUCT_SELECT,
  VARIANT_SELECT,
  rowToProduct,
  rowToVariant,
} from "~/utils/api/rows";

/**
 * The admin catalogue.
 *
 * Every write here is gated by the `Admin write products` policy, so a
 * non-admin session simply fails — the `admin` route middleware is the
 * convenience, not the control.
 *
 * `remove()` **archives**: historical orders snapshot their items, but
 * wishlists, recently-viewed and every inbound link still point at the row, so
 * deleting it turns shared URLs into 404s and orphans wishlist entries behind a
 * foreign key. The partial unique index on `slug` is scoped to live rows, so an
 * archived slug can also be reused.
 */

const IMAGE_BUCKET = "product-images";

const SORT_ORDER: Record<
  ProductSort,
  { column: "created_at" | "price_ngn" | "name"; ascending: boolean }
> = {
  "newest": { column: "created_at", ascending: false },
  "price-asc": { column: "price_ngn", ascending: true },
  "price-desc": { column: "price_ngn", ascending: false },
  "name-asc": { column: "name", ascending: true },
};

/**
 * `ProductInput` is an interface and the `specs` column is `jsonb`, which
 * TypeScript will not accept without an index signature — so the payload is
 * rebuilt as a plain object. Only supplied keys survive, which is what makes
 * the same builder usable for `create()` and a partial `update()`.
 */
const productPayload = (input: Partial<ProductInput>) => ({
  ...(input.slug !== undefined ? { slug: input.slug } : {}),
  ...(input.name !== undefined ? { name: input.name } : {}),
  ...(input.brand !== undefined ? { brand: input.brand } : {}),
  ...(input.description !== undefined ? { description: input.description } : {}),
  ...(input.category !== undefined ? { category: input.category } : {}),
  ...(input.price_ngn !== undefined ? { price_ngn: input.price_ngn } : {}),
  ...(input.compare_at_ngn !== undefined
    ? { compare_at_ngn: input.compare_at_ngn }
    : {}),
  ...(input.images !== undefined ? { images: input.images } : {}),
  ...(input.specs !== undefined
    ? { specs: input.specs.map((s) => ({ label: s.label, value: s.value })) }
    : {}),
  ...(input.tags !== undefined ? { tags: [...input.tags] } : {}),
  ...(input.in_stock !== undefined ? { in_stock: input.in_stock } : {}),
  ...(input.stock_count !== undefined ? { stock_count: input.stock_count } : {}),
  ...(input.made_to_order !== undefined
    ? { made_to_order: input.made_to_order }
    : {}),
  ...(input.featured !== undefined ? { featured: input.featured } : {}),
});

/**
 * The columns with no database default. `productPayload()` types every key as
 * optional so one builder serves `create()` and a partial `update()`; an INSERT
 * still has to prove these four are there.
 */
const productInsert = (input: ProductInput) => ({
  ...productPayload(input),
  slug: input.slug,
  name: input.name,
  category: input.category,
  price_ngn: input.price_ngn,
});

/** Object path inside the bucket for one of our public URLs; null for a
 *  foreign URL (a seeded `/images/…` file), which must be left alone. */
const bucketPath = (url: string): string | null => {
  const match = new RegExp(
    `/storage/v1/object/public/${IMAGE_BUCKET}/(.+)$`,
  ).exec(url);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

export const supabaseAdminProductsRepo: AdminProductsRepository = {
  async list(filters: ProductFilters = {}): Promise<PaginatedProducts> {
    const perPage = filters.perPage ?? PRODUCTS_PER_PAGE;
    const sort = SORT_ORDER[filters.sort ?? "newest"];
    const search = filters.search ? sanitizeSearch(filters.search) : "";

    const runPage = (page: number) => {
      let query = getSupabase()
        .from("products")
        .select(PRODUCT_SELECT, { count: "exact" })
        // The RLS policy lets an admin see archived rows, so the admin table
        // has to exclude them explicitly or `remove()` looks like it failed.
        .is("archived_at", null);

      if (filters.category) query = query.eq("category", filters.category);
      else if (filters.categories?.length) {
        query = query.in("category", filters.categories);
      }
      if (filters.tag) query = query.contains("tags", [filters.tag]);
      if (typeof filters.maxPrice === "number") {
        query = query.lte("price_ngn", filters.maxPrice);
      }
      if (filters.inStockOnly) {
        query = query.or("in_stock.eq.true,made_to_order.eq.true");
      }
      if (search) {
        query = query.or(
          `name.ilike.*${search}*,brand.ilike.*${search}*,slug.ilike.*${search}*`,
        );
      }

      return query
        .order(sort.column, { ascending: sort.ascending })
        .order("id", { ascending: true })
        .order("position", { referencedTable: "variants" })
        .range((page - 1) * perPage, page * perPage - 1);
    };

    let page = Math.max(1, filters.page ?? 1);
    let result = await runPage(page);
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

  /** Archived rows included: an admin still has to be able to open one. */
  async byId(id: string): Promise<Product | null> {
    const { data, error } = await getSupabase()
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("id", id)
      .order("position", { referencedTable: "variants" })
      .maybeSingle();
    if (error) throw mapError(error);
    return data ? rowToProduct(data) : null;
  },

  async create(input: ProductInput): Promise<Product> {
    const { data, error } = await getSupabase()
      .from("products")
      .insert(productInsert(input))
      .select(PRODUCT_SELECT)
      .single();
    if (error) throw mapError(error);
    return rowToProduct(data);
  },

  async update(id: string, input: Partial<ProductInput>): Promise<Product> {
    const { data, error } = await getSupabase()
      .from("products")
      .update(productPayload(input))
      .eq("id", id)
      .select(PRODUCT_SELECT)
      .single();
    if (error) throw mapError(error);
    return rowToProduct(data);
  },

  /** Soft delete. See the note at the top of this file. */
  async remove(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from("products")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw mapError(error);
  },

  /**
   * Replaces the variant set wholesale, as the contract says. `VariantInput`
   * carries no id, so there is nothing to match rows on — the list the admin
   * saved is the list that exists afterwards, and row order becomes `position`.
   */
  async saveVariants(
    productId: string,
    variants: VariantInput[],
  ): Promise<ProductVariant[]> {
    const sb = getSupabase();
    const removal = await sb
      .from("product_variants")
      .delete()
      .eq("product_id", productId);
    if (removal.error) throw mapError(removal.error);

    if (!variants.length) return [];

    const { data, error } = await sb
      .from("product_variants")
      .insert(
        variants.map((variant) => ({
          product_id: productId,
          label: variant.label,
          options: { ...variant.options },
          price_ngn: variant.price_ngn,
          in_stock: variant.in_stock,
          position: variant.position,
        })),
      )
      .select(VARIANT_SELECT);
    if (error) throw mapError(error);
    // Sorted here rather than in the query: PostgREST does not promise an
    // order on an INSERT's returned representation.
    return (data ?? [])
      .map(rowToVariant)
      .sort((a, b) => a.position - b.position);
  },

  /**
   * The bucket is public-read and admin-write, capped at 5 MB and restricted to
   * jpeg/png/webp/avif, so an oversized or wrong-typed file is refused by
   * storage rather than by a check here that a determined caller could skip.
   */
  async uploadImage(file: File): Promise<string> {
    const sb = getSupabase();
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${extension}`;

    const { error } = await sb.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, {
        // Immutable filenames, so a year is safe and the CDN never re-fetches.
        cacheControl: "31536000",
        contentType: file.type,
      });
    if (error) throw mapError(error);

    return sb.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  },

  /** A URL from anywhere else is not ours to delete, so it is ignored. */
  async deleteImage(url: string): Promise<void> {
    const path = bucketPath(url);
    if (!path) return;
    const { error } = await getSupabase()
      .storage.from(IMAGE_BUCKET)
      .remove([path]);
    if (error) throw mapError(error);
  },
};
