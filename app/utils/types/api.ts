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
 *   · A thrown error carries a stable machine code from
 *     `constants/errorCodes.ts`, attached with `codedError()` and read with
 *     `errorCode()`. The UI branches on the code and never on message text;
 *     the human sentence lives in `message`, written once at the source.
 *     Supabase side, that code comes from the Postgres exception's `hint`
 *     (`raise exception '…' using hint = 'sold_out'`) or from GoTrue's own
 *     `error_code` — never parsed out of prose. An error with no code means
 *     "a genuine failure, say try again".
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

/**
 * Result of a signup.
 *
 * Email confirmation is ON, so a new account does not get a session until the
 * address is verified — `user` is null and `needsVerification` is true, and
 * the caller routes to `/auth/otp-verification`. Both fields are returned
 * rather than inferred so the UI never has to guess from a null.
 *
 * Phase 0 amendment (agreed with the user): `signUp()` previously returned
 * `SessionUser`, which is only satisfiable with confirmations disabled.
 */
export interface SignUpResult {
  user: SessionUser | null;
  needsVerification: boolean;
  /** Echoed back so the verification screen knows which address to confirm. */
  email: string;
}

export interface AuthRepository {
  current(): Promise<SessionUser | null>;
  signIn(email: string, password: string): Promise<SessionUser>;
  signUp(input: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }): Promise<SignUpResult>;
  /** Exchange the emailed code for a session. Throws on a bad or expired code. */
  verifyOtp(email: string, token: string): Promise<SessionUser>;
  /** Re-send the code. Rate limited server-side. */
  resendOtp(email: string): Promise<void>;
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

/* ── Site settings ───────────────────────────────────────────────────── */

/**
 * The settings a signed-out visitor may read — the `is_public` rows of
 * `site_settings`. Everything else in that table (the bank account, the vendor
 * address) is admin-only and reached through `AdminSettingsRepository`.
 *
 * The bank account is deliberately absent. It stays behind
 * `get_payment_instructions(order_id, email)`, because holding an order is what
 * buys the account number; putting it here would hand it to anyone.
 *
 * No field is optional. The repository merges what the database returns over
 * the compile-time defaults in `constants/contact.ts`, so those stay the floor
 * and never become a second source of truth — a page cannot lose its phone
 * number because a row was emptied in admin.
 */
export interface PublicSettings {
  contact: {
    email: string;
    /** Human form, for display and a `tel:` link. Never empty. */
    phone: string;
  };
  /** E.164 with no punctuation and no `+`, ready for a `wa.me` link. Never empty. */
  whatsapp: string;
  /**
   * Absolute profile URL, or `""` for "not published".
   *
   * This is the one field where empty is a value rather than a fault: a house
   * may genuinely leave a network. So the fallback applies to a *missing or
   * malformed* row, not to a deliberately blanked one — which means every
   * consumer must handle `""`. `organizationSchema()` already does, via
   * `.filter(Boolean)`; a bare `@handle` would be a malformed row and get
   * replaced, because `sameAs` needs a URL a crawler can resolve.
   */
  instagram: string;
}

export interface SettingsRepository {
  /**
   * Every public setting in one read.
   *
   * One call rather than `get(key)` three times: three round trips to render a
   * footer is silly, and an untyped `get<T>(key)` is an unchecked assertion —
   * the caller declares the shape and nothing verifies it. Tolerable in an
   * admin form that wrote the value itself; not something a public surface
   * should rest on. An aggregate can be validated once, here.
   *
   * Never throws and never returns a partial. A failed request, a missing row
   * or a malformed value all resolve to the compile-time default for that
   * field, so the caller has no error branch to write.
   */
  publicSettings(): Promise<PublicSettings>;
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
