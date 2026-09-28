import type {
  Address,
  DeliveryOptions,
  DeliverySelection,
  Order,
  OrderStatus,
  PaginatedProducts,
  PlaceOrderInput,
  Product,
  ProductFilters,
  ProductInput,
  ProductVariant,
  VariantInput,
  DeliveryRate,
  RateInput,
} from "~/utils/types/shop";
import type { Announcement } from "~/utils/types/announcement";
import type { AdminAnalytics, AdminStats } from "~/utils/types/admin";

/**
 * The seam between the two build lanes.
 *
 * Everything below is an interface, not an implementation. The frontend lane
 * writes fixtures in `app/utils/mock/` that satisfy these; the backend lane
 * writes Supabase-backed modules in `app/utils/api/` that satisfy the same
 * ones. Composables wrap whichever is wired and add reactivity, so swapping
 * mock for real at integration is a one-line import change per repository.
 *
 * Rules:
 *   · Repositories are plain async functions. No Vue reactivity in here.
 *   · Every method returns a type from `types/shop.ts`. Nothing leaks a
 *     Supabase row, a PostgrestError, or a fetch Response.
 *   · A "not found" is `null`, never a throw. Real failures throw.
 *
 * If a signature has to change, change it here first and tell the other lane.
 */

/* ── Catalog ─────────────────────────────────────────────────────────── */

export interface ProductsRepository {
  list(filters: ProductFilters): Promise<PaginatedProducts>;
  bySlug(slug: string): Promise<Product | null>;
  /** Home page rails. */
  featured(limit?: number): Promise<Product[]>;
  /** "You may also consider" — same category, excluding `slug`. */
  related(slug: string, limit?: number): Promise<Product[]>;
  search(query: string, limit?: number): Promise<Product[]>;
  /** Every slug, for the sitemap and prerender list. */
  allSlugs(): Promise<{ slug: string; updated_at: string }[]>;
}

/* ── Wishlist ────────────────────────────────────────────────────────── */

/**
 * Signed out, the wishlist lives in localStorage and these are never called;
 * `useWishlist` merges the local list into the account on first sign-in.
 */
export interface WishlistRepository {
  list(): Promise<string[]>;
  add(productId: string): Promise<void>;
  remove(productId: string): Promise<void>;
  /** Push a signed-out list up after sign-in. Idempotent. */
  merge(productIds: string[]): Promise<string[]>;
}

/* ── Delivery ────────────────────────────────────────────────────────── */

export interface DeliveryRepository {
  /** Lagos areas and flight states, for the checkout selects. */
  options(): Promise<DeliveryOptions>;
  /**
   * Price a destination. Pass the address state, plus the chosen Lagos area
   * when that state is Lagos.
   *
   * Returns `null` when she has not priced that destination yet — checkout
   * shows "delivery quoted after you order" and still lets the order through.
   */
  resolve(input: { state: string; area?: string }): Promise<DeliverySelection | null>;
}

/* ── Orders ──────────────────────────────────────────────────────────── */

export interface OrdersRepository {
  /**
   * Calls the `place_order` RPC. Every line is repriced server-side, so the
   * input carries quantities and ids but never prices.
   */
  place(input: PlaceOrderInput): Promise<Order>;
  /** Signed-in customer's own orders, newest first. */
  mine(): Promise<Order[]>;
  byId(id: string): Promise<Order | null>;
  /** Guest tracking — the `lookup_order` RPC. */
  lookup(orderNumber: string, email: string): Promise<Order | null>;
}

/* ── Announcements ───────────────────────────────────────────────────── */

export interface AnnouncementsRepository {
  /** The single active banner, or null. */
  active(): Promise<Announcement | null>;
}

/* ── Auth & profile ──────────────────────────────────────────────────── */

export interface SessionUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
}

export interface AuthRepository {
  current(): Promise<SessionUser | null>;
  signIn(email: string, password: string): Promise<SessionUser>;
  signUp(input: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }): Promise<SessionUser>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(password: string): Promise<void>;
  updateProfile(input: { full_name?: string; phone?: string }): Promise<SessionUser>;
}

/** Saved delivery addresses on the account. */
export interface AddressRepository {
  list(): Promise<(Address & { id: string; is_default: boolean })[]>;
  add(address: Address): Promise<Address & { id: string; is_default: boolean }>;
  update(id: string, address: Partial<Address>): Promise<void>;
  remove(id: string): Promise<void>;
  setDefault(id: string): Promise<void>;
}

/* ── Admin ───────────────────────────────────────────────────────────── */

export interface AdminProductsRepository {
  list(filters?: ProductFilters): Promise<PaginatedProducts>;
  byId(id: string): Promise<Product | null>;
  create(input: ProductInput): Promise<Product>;
  update(id: string, input: Partial<ProductInput>): Promise<Product>;
  remove(id: string): Promise<void>;
  /** Replaces the product's variants wholesale. */
  saveVariants(productId: string, variants: VariantInput[]): Promise<ProductVariant[]>;
  /** Returns the public URL of the stored image. */
  uploadImage(file: File): Promise<string>;
  deleteImage(url: string): Promise<void>;
}

export interface AdminOrdersRepository {
  list(filters?: {
    status?: OrderStatus;
    search?: string;
    page?: number;
    perPage?: number;
  }): Promise<{ items: Order[]; total: number }>;
  byId(id: string): Promise<Order | null>;
  /**
   * Calls `advance_order_status`. The database validates the move against the
   * order's payment method and rejects anything `canTransition()` would —
   * see `utils/constants/orderStatus.ts`.
   */
  advance(id: string, to: OrderStatus, note?: string): Promise<Order>;
}

/**
 * The delivery pricing table. She adds a row per Lagos area she dispatches to
 * and a row per state she flies to, then edits fees as courier costs move.
 */
export interface AdminRatesRepository {
  list(): Promise<DeliveryRate[]>;
  create(input: RateInput): Promise<DeliveryRate>;
  update(id: string, input: Partial<RateInput>): Promise<DeliveryRate>;
  remove(id: string): Promise<void>;
  /** Bulk fee edit — the realistic way a courier price rise gets applied. */
  updateFees(fees: { id: string; fee_ngn: number }[]): Promise<void>;
}

export interface AdminAnnouncementsRepository {
  list(): Promise<Announcement[]>;
  create(message: string): Promise<Announcement>;
  /** Activating one deactivates the rest, via a database trigger. */
  setActive(id: string, isActive: boolean): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface AdminSettingsRepository {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
}

export interface AdminStatsRepository {
  stats(): Promise<AdminStats>;
  analytics(days?: number): Promise<AdminAnalytics>;
}
