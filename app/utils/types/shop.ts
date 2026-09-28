/**
 * Catalog, cart and order shapes.
 *
 * These mirror the Supabase tables (snake_case) exactly. Pages and components
 * consume them through composables; only the repository layer
 * (`app/utils/api/`) knows whether a row came from Postgres or a fixture.
 *
 * Ported from BGI's `utils/types/shop.ts`, with the gold-specific fields
 * (grams, karat, pricing_mode, rate_premium_pct) removed — JewelryBox is
 * fixed-price — and specs, brand and stock counts added.
 */

/* ── Catalog ─────────────────────────────────────────────────────────── */

/** Physical product categories. Nav-level groupings live in `COLLECTIONS`. */
export type ProductCategory =
  | "watches"
  | "rings"
  | "necklaces"
  | "earrings"
  | "bracelets";

/**
 * Merchandising tags. Drive filter chips and curated rails; a piece can carry
 * several. `new` and `moissanite` are load-bearing (they back filters and the
 * moissanite collection); the rest are editorial.
 */
export type ProductTag =
  | "new"
  | "moissanite"
  | "gift"
  | "statement"
  | "everyday"
  | "limited";

/**
 * One row of the specification table on a product page, rendered in IBM Plex
 * Mono. Deliberately an ordered list of pairs rather than fixed columns: a
 * watch declares Movement / Case / Crystal / Water resistance, a ring declares
 * Stone / Metal / Setting / Band. Admin controls both the labels and the order.
 */
export interface SpecPair {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** Maison or house line, e.g. "Meridian". Shown above the name on the PDP. */
  brand: string;
  description: string;
  category: ProductCategory;
  price_ngn: number;
  /** Was-price for a piece on offer. `null` when not discounted. */
  compare_at_ngn: number | null;
  images: string[];
  specs: SpecPair[];
  tags: ProductTag[];
  in_stock: boolean;
  /**
   * Remaining units when the vendor wants scarcity shown ("2 left").
   * `null` means don't surface a count. Ignored when `made_to_order`.
   */
  stock_count: number | null;
  /** Built to order rather than held — changes the PDP copy and lead time. */
  made_to_order: boolean;
  featured: boolean;
  created_at: string;
  /**
   * Populated by the repository via a Supabase join. Absent or empty means a
   * simple product with no selectable options.
   */
  variants?: ProductVariant[];
}

/**
 * A selectable option set — strap, ring size, chain length. When present the
 * product page shows selector chips and price/stock resolve per variant.
 */
export interface ProductVariant {
  id: string;
  product_id: string;
  /** Shown on chips and cart lines, e.g. "Ivory calf · 40mm". */
  label: string;
  /** e.g. { strap: "Ivory calf", size: "40mm" } */
  options: Record<string, string>;
  price_ngn: number;
  in_stock: boolean;
  /** Chip order on the product page. */
  position: number;
}

/** Derived availability state. Use `productAvailability()` — never hand-roll. */
export type Availability = "in-stock" | "low-stock" | "made-to-order" | "sold";

/* ── Cart ────────────────────────────────────────────────────────────── */

/**
 * Snapshot of the piece at add-to-cart time, so the cart renders without
 * lookups and survives catalog edits while it sits in localStorage.
 *
 * Prices here are for display only. `place_order` reprices every line from
 * the database — a tampered cart cannot change what the customer is charged.
 */
export interface CartLine {
  product_id: string;
  quantity: number;
  slug: string;
  name: string;
  brand: string;
  price_ngn: number;
  image: string;
  category: ProductCategory;
  /** Set when the product has variants — lines key on product + variant. */
  variant_id?: string;
  variant_label?: string;
}

/* ── Address & delivery ──────────────────────────────────────────────── */

export interface Address {
  full_name: string;
  email: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  /** Lagos area, e.g. "Lekki". Required when `state` is Lagos — it prices
      the dispatch rider. Ignored for every other state. */
  area?: string;
  country: "NG";
  notes?: string;
}

/**
 * How a piece travels.
 *
 * Not a customer choice — the destination decides it. Lagos is covered by
 * dispatch riders; every other state goes by air freight. Checkout therefore
 * asks *where*, never *how*.
 */
export type DeliveryMethod = "dispatch" | "flight";

/** Every dispatch row carries this as its state. */
export const LAGOS = "Lagos";

/**
 * One admin-priced destination.
 *
 * `dispatch` rows are Lagos areas — Ikeja, Lekki, Ajah — because the rider
 * fee depends on how far across the city the piece goes.
 * `flight` rows are states, one air-freight fee each.
 *
 * A destination with no active row is simply one she has not priced yet:
 * checkout still takes the order and tells the customer the fee will follow.
 */
export interface DeliveryRate {
  id: string;
  mode: DeliveryMethod;
  /** Lagos area for `dispatch`; state name for `flight`. */
  name: string;
  /** Always `LAGOS` for dispatch rows; one of `NIGERIAN_STATES` for flight. */
  state: string;
  fee_ngn: number;
  active: boolean;
  position: number;
}

/** Everything checkout needs to price delivery. */
export interface DeliveryOptions {
  /** Lagos areas, priced for dispatch riders. */
  areas: DeliveryRate[];
  /** States she flies to, one rate each. Never includes Lagos. */
  states: DeliveryRate[];
}

/**
 * The resolved destination, stored on the order.
 *
 * `fee_ngn` is null when she has not priced that destination — the order is
 * still placed and the fee is communicated afterwards, the same way BGI
 * handled an unquoted courier.
 */
export interface DeliverySelection {
  method: DeliveryMethod;
  /** null when the destination is unpriced. */
  rate_id: string | null;
  /** Area or state name, persisted on the order. */
  label: string;
  fee_ngn: number | null;
}

/* ── Payment & order status ──────────────────────────────────────────── */

/**
 * `bank_transfer` — customer transfers using the order number as reference;
 * an admin confirms once the money lands.
 * `pay_on_delivery` — the vendor collects at the door.
 *
 * There is no card processor. Paystack is deliberately out of scope.
 */
export type PaymentMethod = "bank_transfer" | "pay_on_delivery";

/**
 * One status column, two lanes through it:
 *
 *   bank_transfer    received → confirmed → shipped → delivered
 *   pay_on_delivery  received →            shipped → delivered
 *
 * `confirmed` means the money has been seen, so it is only reachable on a
 * bank transfer — enforced by a database constraint, not just the UI.
 * `cancelled` is reachable from anything before `delivered`.
 *
 * Legal transitions live in `utils/constants/orderStatus.ts`; the database
 * mirrors that map. Never hard-code a transition anywhere else.
 */
export type OrderStatus =
  | "received"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderStatusEvent {
  status: OrderStatus;
  at: string;
  /** Admin note attached when the status was advanced. */
  note?: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  brand: string;
  price_ngn: number;
  quantity: number;
  image: string;
  variant_id?: string;
  variant_label?: string;
}

export interface Order {
  id: string;
  /** `JB-XXXXXX`. Doubles as the bank transfer reference. */
  order_number: string;
  /** null for guest checkout. */
  user_id: string | null;
  status: OrderStatus;
  items: OrderItem[];
  subtotal_ngn: number;
  delivery_method: DeliveryMethod;
  /** Lagos area or state name, as priced at checkout. */
  delivery_destination: string;
  /** null ⇒ destination not priced yet; the fee follows by email. */
  delivery_fee_ngn: number | null;
  total_ngn: number;
  shipping_address: Address;
  payment_method: PaymentMethod;
  /** Set on `confirmed` for transfers, on `delivered` for pay-on-delivery. */
  paid_at: string | null;
  status_history: OrderStatusEvent[];
  created_at: string;
}

/**
 * Device-local pointer to an order placed here — just enough to call the guest
 * `lookup_order` RPC after a reload.
 */
export interface RecentOrderRef {
  id: string;
  order_number: string;
  email: string;
}

/* ── Querying ────────────────────────────────────────────────────────── */

export type ProductSort = "newest" | "price-asc" | "price-desc" | "name-asc";

/** Quick filters on category pages. `under` pairs with `maxPrice`. */
export type ProductFilter = "all" | "new" | "moissanite" | "in-stock" | "under";

export interface ProductFilters {
  category?: ProductCategory;
  tag?: ProductTag;
  search?: string;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/* ── Write payloads (admin) ──────────────────────────────────────────── */

export type ProductInput = Omit<Product, "id" | "created_at" | "variants">;
export type VariantInput = Omit<ProductVariant, "id" | "product_id">;
export type RateInput = Omit<DeliveryRate, "id">;

/** What the client sends to `place_order`. Note: no prices. */
export interface PlaceOrderInput {
  items: { product_id: string; variant_id?: string; quantity: number }[];
  address: Address;
  /**
   * Which priced destination applies. Omitted when she has not priced it —
   * `place_order` then derives the method from the address state and leaves
   * the fee null. The client never sends a fee.
   */
  delivery: { rate_id?: string };
  payment_method: PaymentMethod;
}
