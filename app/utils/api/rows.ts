import type { Json, Tables } from "~~/supabase/database.types";
import type { Announcement } from "~/utils/types/announcement";
import type {
  Address,
  DeliveryMethod,
  DeliveryRate,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusEvent,
  PaymentMethod,
  Product,
  ProductCategory,
  ProductTag,
  ProductVariant,
  SpecPair,
} from "~/utils/types/shop";
import { PRODUCT_CATEGORIES } from "~/utils/constants/catalog";
import { ORDER_STATUSES, PAYMENT_METHODS } from "~/utils/constants/orderStatus";

/**
 * The boundary between a Supabase row and a contract type.
 *
 * Two halves, deliberately in one file so they cannot drift apart:
 *
 *   · A `*_SELECT` string per table — **never `select *`**. `orders` carries a
 *     generated `is_paid` and `products` carries `archived_at` and
 *     `updated_at`; none of the three is in the contract, and `types/api.ts`
 *     says nothing may leak a Supabase row. A column GRANT cannot hide them
 *     either, because `select *` against a revoked column errors outright.
 *   · A `*Row` type built with `Pick<Tables<…>, …>` listing exactly the same
 *     columns, so adding one to the select string without adding it here (or
 *     the reverse) is a compile error rather than a silent leak.
 *
 * The mappers exist because the generated types describe what Postgres stores,
 * not what the contract promises: `category` is `text` where `ProductCategory`
 * is a closed union, and `items`, `specs` and `shipping_address` are `jsonb`
 * where the contract has real shapes. Every one of them is validated here
 * rather than asserted with a cast, which is the whole reason for generating
 * the `Database` type in the first place.
 */

/* ── jsonb readers ───────────────────────────────────────────────────── */

type JsonObject = { [key: string]: Json | undefined };

export const jsonObject = (value: Json | undefined): JsonObject | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? value
    : null;

export const jsonArray = (value: Json | undefined): Json[] =>
  Array.isArray(value) ? value : [];

export const jsonString = (value: Json | undefined): string | null =>
  typeof value === "string" ? value : null;

/**
 * Whole naira. A `bigint` aggregated into jsonb can arrive as a JSON number or,
 * past 2^53, as a string — `count(*)` and `sum(total_ngn)` both come through
 * `admin_stats()` this way — so both are accepted and anything else reads zero.
 */
export const jsonNumber = (value: Json | undefined): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

/* ── Closed-set columns ──────────────────────────────────────────────── */

/**
 * `products.category` is `text` with a CHECK, so it is validated against the
 * canonical list rather than asserted. The fallback is unreachable while the
 * constraint holds; it exists so a bad row renders instead of crashing a page.
 */
const toCategory = (value: string): ProductCategory =>
  PRODUCT_CATEGORIES.find((c) => c.value === value)?.value ?? "watches";

/**
 * Exhaustive by construction: `Record<ProductTag, true>` will not compile if a
 * tag is added to the union and not to this map, which is the drift the
 * database's own `tags <@ array[…]` check cannot catch on this side.
 */
const PRODUCT_TAGS: Record<ProductTag, true> = {
  new: true,
  moissanite: true,
  gift: true,
  statement: true,
  everyday: true,
  limited: true,
};

const toTags = (values: string[]): ProductTag[] =>
  values.filter((value): value is ProductTag =>
    Object.hasOwn(PRODUCT_TAGS, value),
  );

const toStatus = (value: string): OrderStatus =>
  ORDER_STATUSES.find((s) => s.value === value)?.value ?? "received";

const toPaymentMethod = (value: string): PaymentMethod =>
  PAYMENT_METHODS.find((m) => m.value === value)?.value ?? "bank_transfer";

const toDeliveryMethod = (value: string): DeliveryMethod =>
  value === "dispatch" ? "dispatch" : "flight";

/* ── Products ────────────────────────────────────────────────────────── */

/** Keep in step with `VariantRow` below. */
export const VARIANT_SELECT =
  "id, product_id, label, options, price_ngn, in_stock, position";

/**
 * One query per product list, variants joined — no N+1. The embed is aliased
 * `variants` to match `Product.variants`.
 *
 * Spelled out as a single literal rather than composed from parts: PostgREST's
 * result type is inferred from the *literal* type of this string, and a
 * template literal widens to `string`, which silently turns every mapped row
 * into `any`. Keep in step with `ProductRow` and `VariantRow` below.
 */
export const PRODUCT_SELECT =
  "id, slug, name, brand, description, category, price_ngn, compare_at_ngn, images, specs, tags, in_stock, stock_count, made_to_order, featured, created_at, variants:product_variants(id, product_id, label, options, price_ngn, in_stock, position)";

export type ProductRow = Pick<
  Tables<"products">,
  | "id"
  | "slug"
  | "name"
  | "brand"
  | "description"
  | "category"
  | "price_ngn"
  | "compare_at_ngn"
  | "images"
  | "specs"
  | "tags"
  | "in_stock"
  | "stock_count"
  | "made_to_order"
  | "featured"
  | "created_at"
>;

export type VariantRow = Pick<
  Tables<"product_variants">,
  "id" | "product_id" | "label" | "options" | "price_ngn" | "in_stock" | "position"
>;

export type ProductRowWithVariants = ProductRow & {
  variants?: VariantRow[] | null;
};

const toSpecs = (value: Json): SpecPair[] =>
  jsonArray(value).flatMap((entry) => {
    const pair = jsonObject(entry);
    const label = jsonString(pair?.label);
    const specValue = jsonString(pair?.value);
    return label === null || specValue === null
      ? []
      : [{ label, value: specValue }];
  });

const toOptions = (value: Json): Record<string, string> => {
  const source = jsonObject(value);
  if (!source) return {};
  const options: Record<string, string> = {};
  for (const [key, entry] of Object.entries(source)) {
    const text = jsonString(entry);
    if (text !== null) options[key] = text;
  }
  return options;
};

export const rowToVariant = (row: VariantRow): ProductVariant => ({
  id: row.id,
  product_id: row.product_id,
  label: row.label,
  options: toOptions(row.options),
  price_ngn: row.price_ngn,
  in_stock: row.in_stock,
  position: row.position,
});

export const rowToProduct = (row: ProductRowWithVariants): Product => {
  const variants = (row.variants ?? [])
    // PostgREST orders an embed with `order(…, { referencedTable })`, but a
    // row that arrives from an RPC has no embed at all — sorting here keeps
    // the chip order right on both paths.
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(rowToVariant);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    description: row.description,
    category: toCategory(row.category),
    price_ngn: row.price_ngn,
    compare_at_ngn: row.compare_at_ngn,
    images: row.images,
    specs: toSpecs(row.specs),
    tags: toTags(row.tags),
    in_stock: row.in_stock,
    stock_count: row.stock_count,
    made_to_order: row.made_to_order,
    featured: row.featured,
    created_at: row.created_at,
    // Absent rather than empty when there are none — `Product.variants` is
    // optional and the UI treats "no variants" as a simple product.
    ...(variants.length ? { variants } : {}),
  };
};

/* ── Orders ──────────────────────────────────────────────────────────── */

/**
 * Keep in step with `OrderRow` below. `is_paid` is deliberately absent: it is a
 * generated column and not part of the `Order` contract.
 */
export const ORDER_SELECT =
  "id, order_number, user_id, status, items, subtotal_ngn, delivery_method, delivery_destination, delivery_fee_ngn, total_ngn, shipping_address, payment_method, paid_at, status_history, created_at";

export type OrderRow = Pick<
  Tables<"orders">,
  | "id"
  | "order_number"
  | "user_id"
  | "status"
  | "items"
  | "subtotal_ngn"
  | "delivery_method"
  | "delivery_destination"
  | "delivery_fee_ngn"
  | "total_ngn"
  | "shipping_address"
  | "payment_method"
  | "paid_at"
  | "status_history"
  | "created_at"
>;

export const jsonToAddress = (value: Json): Address => {
  const source = jsonObject(value);
  const line2 = jsonString(source?.line2);
  const area = jsonString(source?.area);
  const notes = jsonString(source?.notes);
  return {
    full_name: jsonString(source?.full_name) ?? "",
    email: jsonString(source?.email) ?? "",
    phone: jsonString(source?.phone) ?? "",
    line1: jsonString(source?.line1) ?? "",
    city: jsonString(source?.city) ?? "",
    state: jsonString(source?.state) ?? "",
    // The only value the `country = 'NG'` check permits, and the only one the
    // contract's literal type accepts.
    country: "NG",
    ...(line2 ? { line2 } : {}),
    ...(area ? { area } : {}),
    ...(notes ? { notes } : {}),
  };
};

const toOrderItems = (value: Json): OrderItem[] =>
  jsonArray(value).flatMap((entry) => {
    const item = jsonObject(entry);
    if (!item) return [];
    const variantId = jsonString(item.variant_id);
    const variantLabel = jsonString(item.variant_label);
    return [
      {
        product_id: jsonString(item.product_id) ?? "",
        name: jsonString(item.name) ?? "",
        brand: jsonString(item.brand) ?? "",
        price_ngn: jsonNumber(item.price_ngn),
        quantity: jsonNumber(item.quantity),
        image: jsonString(item.image) ?? "",
        ...(variantId ? { variant_id: variantId } : {}),
        ...(variantLabel ? { variant_label: variantLabel } : {}),
      },
    ];
  });

const toStatusHistory = (value: Json): OrderStatusEvent[] =>
  jsonArray(value).flatMap((entry) => {
    const event = jsonObject(entry);
    const status = jsonString(event?.status);
    const at = jsonString(event?.at);
    if (status === null || at === null) return [];
    const note = jsonString(event?.note);
    return [{ status: toStatus(status), at, ...(note ? { note } : {}) }];
  });

export const rowToOrder = (row: OrderRow): Order => ({
  id: row.id,
  order_number: row.order_number,
  user_id: row.user_id,
  status: toStatus(row.status),
  items: toOrderItems(row.items),
  subtotal_ngn: row.subtotal_ngn,
  delivery_method: toDeliveryMethod(row.delivery_method),
  delivery_destination: row.delivery_destination,
  delivery_fee_ngn: row.delivery_fee_ngn,
  total_ngn: row.total_ngn,
  shipping_address: jsonToAddress(row.shipping_address),
  payment_method: toPaymentMethod(row.payment_method),
  paid_at: row.paid_at,
  status_history: toStatusHistory(row.status_history),
  created_at: row.created_at,
});

/* ── Delivery rates ──────────────────────────────────────────────────── */

/** Exactly the columns of `DeliveryRate`, so the two cannot drift. */
export const RATE_SELECT = "id, mode, name, state, fee_ngn, active, position";

export type RateRow = Pick<
  Tables<"delivery_rates">,
  "id" | "mode" | "name" | "state" | "fee_ngn" | "active" | "position"
>;

export const rowToRate = (row: RateRow): DeliveryRate => ({
  id: row.id,
  mode: toDeliveryMethod(row.mode),
  name: row.name,
  state: row.state,
  fee_ngn: row.fee_ngn,
  active: row.active,
  position: row.position,
});

/* ── Announcements ───────────────────────────────────────────────────── */

/** Exactly the columns of `Announcement`. */
export const ANNOUNCEMENT_SELECT = "id, message, is_active, created_at";

export type AnnouncementRow = Pick<
  Tables<"announcements">,
  "id" | "message" | "is_active" | "created_at"
>;

export const rowToAnnouncement = (row: AnnouncementRow): Announcement => ({
  id: row.id,
  message: row.message,
  is_active: row.is_active,
  created_at: row.created_at,
});

/* ── Saved addresses ─────────────────────────────────────────────────── */

/** `user_id` and `created_at` stay out: neither is in the contract's shape. */
export const ADDRESS_SELECT =
  "id, full_name, email, phone, line1, line2, city, state, area, country, notes, is_default";

export type AddressRow = Pick<
  Tables<"addresses">,
  | "id"
  | "full_name"
  | "email"
  | "phone"
  | "line1"
  | "line2"
  | "city"
  | "state"
  | "area"
  | "country"
  | "notes"
  | "is_default"
>;

export type SavedAddress = Address & { id: string; is_default: boolean };

export const rowToAddress = (row: AddressRow): SavedAddress => ({
  id: row.id,
  full_name: row.full_name,
  email: row.email,
  phone: row.phone,
  line1: row.line1,
  city: row.city,
  state: row.state,
  country: "NG",
  is_default: row.is_default,
  ...(row.line2 ? { line2: row.line2 } : {}),
  ...(row.area ? { area: row.area } : {}),
  ...(row.notes ? { notes: row.notes } : {}),
});
