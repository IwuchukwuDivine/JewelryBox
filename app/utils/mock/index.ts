import type {
  AddressRepository,
  AnnouncementsRepository,
  AuthRepository,
  DeliveryRepository,
  OrdersRepository,
  ProductsRepository,
  PublicSettings,
  SessionUser,
  SettingsRepository,
  WishlistRepository,
} from "~/utils/types/api";
import type {
  Address,
  DeliveryRate,
  DeliverySelection,
  Order,
  PaginatedProducts,
  PlaceOrderInput,
  Product,
  ProductFilters,
} from "~/utils/types/shop";
import { LAGOS } from "~/utils/types/shop";
import { PRODUCTS_PER_PAGE } from "~/utils/constants/catalog";
import { PAYMENT_METHODS } from "~/utils/constants/orderStatus";
import { MOCK_PRODUCTS } from "~/utils/mock/products";
import { MOCK_RATES } from "~/utils/mock/rates";
import { MOCK_ORDERS } from "~/utils/mock/orders";
import { MOCK_ANNOUNCEMENTS } from "~/utils/mock/announcements";
import { MOCK_ADDRESSES, MOCK_PASSWORD, MOCK_USER } from "~/utils/mock/user";
import { PUBLIC_SETTINGS_FALLBACK } from "~/utils/constants/contact";

/**
 * Mock implementations of every repository in `types/api.ts`.
 *
 * These stand in for Supabase until Phase F. Each is typed against its
 * interface, so a mock that drifts from the contract fails `npm run typecheck`
 * rather than review — that is the whole point of the seam.
 *
 * Contract, restated from `types/api.ts`: plain async functions, no Vue
 * reactivity; "not found" is `null`, never a throw; real failures throw.
 */

/**
 * Tunable so loading and error states can be exercised on demand.
 * In devtools: `window.__jbMock.failureRate = 1` then reload a page.
 */
export const mockConfig = {
  minLatencyMs: 250,
  maxLatencyMs: 600,
  /** 0–1. Applies to reads only; writes stay deterministic. */
  failureRate: 0,
};

if (import.meta.client) {
  (window as unknown as Record<string, unknown>).__jbMock = mockConfig;
}

const settle = async <T>(value: T): Promise<T> => {
  const { minLatencyMs, maxLatencyMs, failureRate } = mockConfig;
  const wait = minLatencyMs + Math.random() * (maxLatencyMs - minLatencyMs);
  await new Promise((resolve) => setTimeout(resolve, wait));
  if (failureRate > 0 && Math.random() < failureRate) {
    throw new Error("Mock repository: simulated network failure.");
  }
  return value;
};

/** Deep-ish copy so a consumer mutating a result cannot corrupt the fixtures. */
const clone = <T>(value: T): T => structuredClone(value);

/* ── Products ─────────────────────────────────────────────────────────── */

const matchesFilters = (product: Product, filters: ProductFilters): boolean => {
  if (filters.category && product.category !== filters.category) return false;
  if (
    !filters.category &&
    filters.categories?.length &&
    !filters.categories.includes(product.category)
  ) {
    return false;
  }
  if (filters.tag && !product.tags.includes(filters.tag)) return false;
  if (filters.inStockOnly && !product.in_stock && !product.made_to_order) return false;
  if (typeof filters.maxPrice === "number" && product.price_ngn > filters.maxPrice) {
    return false;
  }
  if (filters.search) {
    const haystack = [
      product.name,
      product.brand,
      product.category,
      product.description,
      ...product.tags,
      ...product.specs.flatMap((s) => [s.label, s.value]),
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(filters.search.trim().toLowerCase())) return false;
  }
  return true;
};

const sortProducts = (items: Product[], sort: ProductFilters["sort"]): Product[] => {
  const sorted = [...items];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price_ngn - b.price_ngn);
    case "price-desc":
      return sorted.sort((a, b) => b.price_ngn - a.price_ngn);
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "newest":
    default:
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
};

export const mockProductsRepo: ProductsRepository = {
  async list(filters: ProductFilters): Promise<PaginatedProducts> {
    const matched = sortProducts(
      MOCK_PRODUCTS.filter((p) => matchesFilters(p, filters)),
      filters.sort,
    );
    const perPage = filters.perPage ?? PRODUCTS_PER_PAGE;
    const totalPages = Math.max(1, Math.ceil(matched.length / perPage));
    const page = Math.min(Math.max(filters.page ?? 1, 1), totalPages);
    const start = (page - 1) * perPage;

    return settle({
      items: clone(matched.slice(start, start + perPage)),
      total: matched.length,
      page,
      perPage,
      totalPages,
    });
  },

  async bySlug(slug: string): Promise<Product | null> {
    const found = MOCK_PRODUCTS.find((p) => p.slug === slug);
    return settle(found ? clone(found) : null);
  },

  async featured(limit = 8): Promise<Product[]> {
    const items = MOCK_PRODUCTS.filter((p) => p.featured).slice(0, limit);
    return settle(clone(items));
  },

  async related(slug: string, limit = 4): Promise<Product[]> {
    const source = MOCK_PRODUCTS.find((p) => p.slug === slug);
    if (!source) return settle([]);

    const scored = MOCK_PRODUCTS.filter((p) => p.id !== source.id)
      .map((p) => ({
        product: p,
        score:
          (p.category === source.category ? 2 : 0) +
          p.tags.filter((t) => source.tags.includes(t)).length,
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.product);

    return settle(clone(scored));
  },

  async search(query: string, limit = 10): Promise<Product[]> {
    const trimmed = query.trim();
    if (!trimmed) return settle([]);
    const items = MOCK_PRODUCTS.filter((p) =>
      matchesFilters(p, { search: trimmed }),
    ).slice(0, limit);
    return settle(clone(items));
  },

  async allSlugs(): Promise<{ slug: string; updated_at: string }[]> {
    return settle(
      MOCK_PRODUCTS.map((p) => ({ slug: p.slug, updated_at: p.created_at })),
    );
  },
};

/* ── Wishlist ─────────────────────────────────────────────────────────── */

let wishlistIds: string[] = [];

export const mockWishlistRepo: WishlistRepository = {
  async list() {
    return settle([...wishlistIds]);
  },
  async add(productId: string) {
    if (!wishlistIds.includes(productId)) wishlistIds.push(productId);
    await settle(null);
  },
  async remove(productId: string) {
    wishlistIds = wishlistIds.filter((id) => id !== productId);
    await settle(null);
  },
  async merge(productIds: string[]) {
    wishlistIds = [...new Set([...wishlistIds, ...productIds])];
    return settle([...wishlistIds]);
  },
};

/* ── Delivery ─────────────────────────────────────────────────────────── */

const activeRates = (): DeliveryRate[] => MOCK_RATES.filter((r) => r.active);

export const mockDeliveryRepo: DeliveryRepository = {
  async options() {
    const rates = activeRates();
    return settle({
      areas: clone(rates.filter((r) => r.mode === "dispatch")),
      states: clone(rates.filter((r) => r.mode === "flight")),
    });
  },

  /**
   * Resolves a destination to a method and a fee. `null` means the
   * destination is unpriced — not an error. The order is still placed and
   * the fee follows by email.
   */
  async resolve(input: { state: string; area?: string }): Promise<DeliverySelection | null> {
    const method = deliveryMethodForState(input.state);

    const rate =
      method === "dispatch"
        ? activeRates().find(
            (r) =>
              r.mode === "dispatch" &&
              r.name.toLowerCase() === (input.area ?? "").trim().toLowerCase(),
          )
        : activeRates().find(
            (r) =>
              r.mode === "flight" &&
              r.name.toLowerCase() === input.state.trim().toLowerCase(),
          );

    if (!rate) return settle(null);

    return settle({
      method,
      rate_id: rate.id,
      label: rate.name,
      fee_ngn: rate.fee_ngn,
    });
  },
};

/* ── Orders ───────────────────────────────────────────────────────────── */

const PLACED_ORDERS_KEY = "jb-mock-orders";

/**
 * Orders placed during this session, persisted alongside the fixtures.
 *
 * Module state alone is lost on a full page load, which made the most
 * ordinary review path — place an order, then open or refresh its page —
 * report "we could not find that order". The real table obviously persists;
 * the mock has to as well or the guest-lookup flow cannot be exercised.
 */
const readPlaced = (): Order[] => {
  if (!import.meta.client) return [];
  try {
    const raw = localStorage.getItem(PLACED_ORDERS_KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
};

const orders: Order[] = [...readPlaced(), ...clone(MOCK_ORDERS)];

const persistPlaced = () => {
  if (!import.meta.client) return;
  try {
    const fixtureIds = new Set(MOCK_ORDERS.map((o) => o.id));
    const placed = orders.filter((o) => !fixtureIds.has(o.id));
    localStorage.setItem(PLACED_ORDERS_KEY, JSON.stringify(placed));
  } catch {
    // Private browsing — the order simply does not survive the reload.
  }
};

/*
 * Failed guest lookups, for the anon-callable throttle on `lookup_order`.
 *
 * Two independent counters, not one — `lookup:email:<addr>` and
 * `lookup:ref:<number>`, 10 misses per 15 minutes each, either one exhausting
 * refuses. A single key is defeated by rotating the other field: keying only
 * on email lets someone who knows an address grind order numbers, and keying
 * only on the reference lets someone who knows a number grind addresses.
 * Charging both means rotating one field still burns down the other.
 *
 * Misses only, cleared on a hit: anyone who found a valid order already has
 * what enumeration was after, and a customer who mistypes twice then succeeds
 * carries no penalty. A malformed reference still counts — that is probing,
 * not a typo pattern worth excusing.
 */
const LOOKUP_WINDOW_MS = 15 * 60 * 1000;
const LOOKUP_MAX_MISSES = 10;
const lookupMisses = new Map<string, number[]>();

const recentMisses = (key: string): number[] =>
  (lookupMisses.get(key) ?? []).filter(
    (at) => Date.now() - at < LOOKUP_WINDOW_MS,
  );

/**
 * `JB-` plus six Crockford base32 characters, matching the real RPC.
 *
 * Base32 rather than digits because `lookup_order` is anon-callable, which
 * makes the order number a bearer identifier: 32^6 ≈ 1.07e9 keyspace instead
 * of 1e6. The alphabet omits I, L, O and U so it cannot be misread aloud.
 */
const ORDER_NUMBER_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const generateOrderNumber = (): string => {
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += ORDER_NUMBER_ALPHABET[Math.floor(Math.random() * ORDER_NUMBER_ALPHABET.length)];
  }
  return `JB-${out}`;
};

export const mockOrdersRepo: OrdersRepository = {
  /**
   * Mirrors `place_order()`: reprices every line from the catalogue, derives
   * the delivery method from the address state, resolves the fee from the
   * rate table, and never trusts a client-sent price.
   */
  async place(input: PlaceOrderInput): Promise<Order> {
    if (!input.items.length) {
      throw codedError(ERROR_CODES.emptyCart, "Your bag is empty.");
    }
    if (!input.address.state.trim()) {
      throw codedError(
        ERROR_CODES.invalidAddress,
        "A delivery state is required.",
      );
    }
    if (!PAYMENT_METHODS.some((m) => m.value === input.payment_method)) {
      throw codedError(
        ERROR_CODES.invalidPaymentMethod,
        "That payment method is not available.",
      );
    }

    // Shape guards. Unreachable through the UI — if one fires it is a bug,
    // and it should say which bug rather than "try again".
    const totalUnits = input.items.reduce((sum, l) => sum + l.quantity, 0);
    const badLine = input.items.some(
      (l) => !Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 99,
    );
    if (badLine || input.items.length > 50 || totalUnits > 200) {
      throw codedError(
        ERROR_CODES.invalidQuantity,
        "Something is wrong with the quantities in your bag.",
      );
    }

    /*
     * Five successful orders per email address per rolling hour, matching
     * `check_rate_limit('order:' || lower(email), 5, '1 hour')`.
     *
     * Counted off the orders themselves rather than a side table, so the mock
     * cannot drift from what it has actually recorded. Email-keyed only: the
     * database cannot see the client IP, so this catches double-submits and
     * casual abuse, not a determined one.
     */
    const email = input.address.email.trim().toLowerCase();
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const recent = orders.filter(
      (o) =>
        o.shipping_address.email.trim().toLowerCase() === email &&
        new Date(o.created_at).getTime() > hourAgo,
    );
    if (recent.length >= 5) {
      throw codedError(
        ERROR_CODES.orderRateLimited,
        "You have placed several orders in a short time. Please wait a few minutes, or contact us and we'll help.",
      );
    }

    const items = input.items.map((line) => {
      const product = MOCK_PRODUCTS.find((p) => p.id === line.product_id);
      if (!product) {
        throw codedError(
          ERROR_CODES.productUnavailable,
          "One of your pieces is no longer available. Remove it to continue.",
        );
      }
      const variant = line.variant_id
        ? product.variants?.find((v) => v.id === line.variant_id)
        : undefined;

      if (line.variant_id && !variant) {
        throw codedError(
          ERROR_CODES.variantUnavailable,
          `That option for ${product.name} is no longer available. Choose another.`,
        );
      }

      // The real RPC raises on a line that sold out between add-to-cart and
      // submit. That race is ordinary, not an edge case — checkout has to
      // render it — so the mock raises identically.
      if (!product.made_to_order) {
        if (!product.in_stock) {
          throw codedError(ERROR_CODES.soldOut, `${product.name} is sold out.`);
        }
        if (variant && !variant.in_stock) {
          throw codedError(
            ERROR_CODES.soldOut,
            `${product.name} (${variant.label}) is sold out.`,
          );
        }
      }

      return {
        product_id: product.id,
        name: product.name,
        brand: product.brand,
        price_ngn: variant?.price_ngn ?? product.price_ngn,
        quantity: line.quantity,
        image: product.images[0] ?? "",
        ...(variant ? { variant_id: variant.id, variant_label: variant.label } : {}),
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.price_ngn * i.quantity, 0);

    // Derived server-side from the address, never taken from the client.
    const method = deliveryMethodForState(input.address.state);
    const selection = await mockDeliveryRepo.resolve({
      state: input.address.state,
      area: input.address.area,
    });

    // A client-sent rate_id is only ever a hint. If it does not match what the
    // address actually resolves to, the destination changed after the quote —
    // reject rather than silently charging the stale fee.
    if (input.delivery.rate_id && input.delivery.rate_id !== selection?.rate_id) {
      throw codedError(
        ERROR_CODES.rateMismatch,
        "Your delivery destination changed. Confirm it and try again.",
      );
    }

    const placedAt = new Date().toISOString();
    const order: Order = {
      id: `ord_${Date.now()}`,
      order_number: generateOrderNumber(),
      user_id: currentUser?.id ?? null,
      status: "received",
      items,
      subtotal_ngn: subtotal,
      delivery_method: method,
      delivery_destination:
        method === "dispatch" ? (input.address.area ?? LAGOS) : input.address.state,
      delivery_fee_ngn: selection?.fee_ngn ?? null,
      total_ngn: subtotal + (selection?.fee_ngn ?? 0),
      shipping_address: clone(input.address),
      payment_method: input.payment_method,
      paid_at: null,
      status_history: [{ status: "received", at: placedAt }],
      created_at: placedAt,
    };

    orders.unshift(order);
    persistPlaced();
    return settle(clone(order));
  },

  async mine(): Promise<Order[]> {
    if (!currentUser) return settle([]);
    const mine = orders.filter((o) => o.user_id === currentUser?.id);
    return settle(clone(mine));
  },

  async byId(id: string): Promise<Order | null> {
    const found = orders.find(
      (o) => o.id === id || o.order_number.toLowerCase() === id.toLowerCase(),
    );
    return settle(found ? clone(found) : null);
  },

  async lookup(orderNumber: string, email: string): Promise<Order | null> {
    const emailKey = `lookup:email:${email.trim().toLowerCase()}`;
    const refKey = `lookup:ref:${orderNumber.trim().toLowerCase()}`;

    const emailMisses = recentMisses(emailKey);
    const refMisses = recentMisses(refKey);

    if (
      emailMisses.length >= LOOKUP_MAX_MISSES ||
      refMisses.length >= LOOKUP_MAX_MISSES
    ) {
      throw codedError(
        ERROR_CODES.lookupRateLimited,
        "Too many attempts. Wait a few minutes and try again.",
      );
    }

    const found = orders.find(
      (o) =>
        o.order_number.toLowerCase() === orderNumber.trim().toLowerCase() &&
        o.shipping_address.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (found) {
      lookupMisses.delete(emailKey);
      lookupMisses.delete(refKey);
    } else {
      const now = Date.now();
      lookupMisses.set(emailKey, [...emailMisses, now]);
      lookupMisses.set(refKey, [...refMisses, now]);
    }

    // Not found is a normal answer, not an error. Only the limit throws.
    return settle(found ? clone(found) : null);
  },
};

/* ── Announcements ────────────────────────────────────────────────────── */

export const mockAnnouncementsRepo: AnnouncementsRepository = {
  async active() {
    const found = MOCK_ANNOUNCEMENTS.find((a) => a.is_active);
    return settle(found ? clone(found) : null);
  },
};

/* ── Auth ─────────────────────────────────────────────────────────────── */

const SESSION_KEY = "jb-mock-session";

/** Stands in for the session cookie, so a reload does not sign you out. */
const readSession = (): SessionUser | null => {
  if (!import.meta.client) return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
};

const writeSession = (user: SessionUser | null) => {
  currentUser = user;
  if (!import.meta.client) return;
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Private browsing — the session simply does not survive the reload.
  }
};

let currentUser: SessionUser | null = null;

const PENDING_KEY = "jb-mock-pending";

interface PendingSignUp {
  user: SessionUser;
  /** Epoch ms of the last code sent to this address. */
  sentAt: number;
}

/**
 * Signed up but not yet verified — no session until the code is entered.
 *
 * Persisted because the real thing lives server-side: the pending account and
 * its resend window are keyed on the email address and survive a page reload.
 * Held in module scope only, this would reset on refresh and the UI would
 * never meet the rate limit it has to render.
 */
let pending: PendingSignUp | null = null;

const readPending = (): PendingSignUp | null => {
  if (!import.meta.client) return null;
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingSignUp) : null;
  } catch {
    return null;
  }
};

const writePending = (next: PendingSignUp | null) => {
  pending = next;
  if (!import.meta.client) return;
  try {
    if (next) localStorage.setItem(PENDING_KEY, JSON.stringify(next));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    // Private browsing — the pending account does not survive the reload.
  }
};

const currentPending = (): PendingSignUp | null => pending ?? (pending = readPending());

/** The code the fixture "emails". Any other value exercises the error path. */
export const MOCK_OTP = "123456";

/**
 * Matches `max_frequency = "60s"` in `supabase/config.toml`. GoTrue enforces
 * the gap between confirmation emails per address itself, so a client that
 * ignores its own cooldown still gets refused — the mock refuses too, or the
 * UI would never meet the rejection it has to render.
 */
const OTP_RESEND_GAP_MS = 60_000;

/** How long a code stays valid — mirrors `otp_expiry = 900` in config.toml. */
const OTP_EXPIRY_MS = 15 * 60 * 1000;

export const mockAuthRepo: AuthRepository = {
  async current() {
    if (!currentUser) currentUser = readSession();
    return settle(currentUser ? clone(currentUser) : null);
  },

  async signIn(email: string, password: string) {
    const normalised = email.trim().toLowerCase();

    // Confirmations are on, so an account that signed up but never entered
    // its code cannot sign in. Distinct from bad credentials: the repair is
    // to finish verification, not to retype the password.
    const waiting = currentPending();
    if (waiting && waiting.user.email === normalised) {
      throw codedError(
        ERROR_CODES.emailNotConfirmed,
        "Confirm your email address to finish setting up your account.",
      );
    }

    if (normalised !== MOCK_USER.email || password !== MOCK_PASSWORD) {
      throw codedError(
        ERROR_CODES.invalidCredentials,
        "That email and password do not match.",
      );
    }
    writeSession(clone(MOCK_USER));
    return settle(clone(MOCK_USER));
  },

  async signUp(input: { email: string; password: string; full_name: string; phone?: string }) {
    const email = input.email.trim().toLowerCase();

    // Confirmations are on, so signup yields no session. The account waits
    // here until the code is verified.
    writePending({
      user: {
        id: `usr_${Date.now()}`,
        email,
        full_name: input.full_name,
        phone: input.phone ?? null,
        is_admin: false,
      },
      sentAt: Date.now(),
    });

    return settle({ user: null, needsVerification: true, email });
  },

  async verifyOtp(email: string, token: string) {
    const normalised = email.trim().toLowerCase();

    const waiting = currentPending();
    if (!waiting || waiting.user.email !== normalised) {
      throw codedError(
        ERROR_CODES.otpExpired,
        "That code has expired. Request a new one.",
      );
    }
    if (Date.now() - waiting.sentAt > OTP_EXPIRY_MS) {
      writePending(null);
      throw codedError(
        ERROR_CODES.otpExpired,
        "That code has expired. Request a new one.",
      );
    }
    if (token.trim() !== MOCK_OTP) {
      throw codedError(
        ERROR_CODES.invalidCredentials,
        "That code is not right. Check it and try again.",
      );
    }

    writePending(null);
    writeSession(waiting.user);
    return settle(clone(waiting.user));
  },

  async resendOtp(email: string) {
    const waiting = currentPending();
    if (!waiting || waiting.user.email !== email.trim().toLowerCase()) {
      throw new Error("There is nothing waiting to be verified for that address.");
    }

    // GoTrue's 429 does state the remaining seconds, but only in prose inside
    // `msg`. Deliberately not parsed — that sentence will be reworded. The
    // page counts down on its own clock and branches on the code; the refusal
    // is server-side and per address, so a reload does not clear it.
    if (Date.now() - waiting.sentAt < OTP_RESEND_GAP_MS) {
      throw codedError(
        ERROR_CODES.otpRateLimited,
        "Too many requests. Wait a moment before asking for another code.",
      );
    }

    writePending({ ...waiting, sentAt: Date.now() });
    await settle(null);
  },

  async signOut() {
    writeSession(null);
    await settle(null);
  },

  async requestPasswordReset(email: string) {
    if (!email.includes("@")) throw new Error("Enter a valid email address.");
    await settle(null);
  },

  async resetPassword(password: string) {
    if (password.length < 8) throw new Error("Use at least 8 characters.");
    await settle(null);
  },

  async updateProfile(input: { full_name?: string; phone?: string }) {
    if (!currentUser) throw new Error("You are not signed in.");
    const updated: SessionUser = {
      ...currentUser,
      ...(input.full_name !== undefined ? { full_name: input.full_name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    };
    writeSession(updated);
    return settle(clone(updated));
  },
};

/* ── Addresses ────────────────────────────────────────────────────────── */

let addresses = clone(MOCK_ADDRESSES);

export const mockAddressRepo: AddressRepository = {
  async list() {
    return settle(clone(addresses));
  },

  async add(address: Address) {
    const row = {
      ...clone(address),
      id: `adr_${Date.now()}`,
      is_default: addresses.length === 0,
    };
    addresses.push(row);
    return settle(clone(row));
  },

  async update(id: string, address: Partial<Address>) {
    const row = addresses.find((a) => a.id === id);
    if (!row) throw new Error("That address no longer exists.");
    Object.assign(row, address);
    await settle(null);
  },

  async remove(id: string) {
    addresses = addresses.filter((a) => a.id !== id);
    await settle(null);
  },

  async setDefault(id: string) {
    addresses = addresses.map((a) => ({ ...a, is_default: a.id === id }));
    await settle(null);
  },
};

/* ── Site settings ────────────────────────────────────────────────────── */

const SETTINGS_KEY = "jb-mock-settings";

/**
 * Stands in for the `is_public` rows of `site_settings`. Nothing writes it —
 * the admin surface is Phase D — so to exercise the override path by hand:
 *
 *   localStorage.setItem("jb-mock-settings",
 *     JSON.stringify({ whatsapp: "2349000000000" }));
 *
 * A partial object is the realistic shape, since each setting is its own row.
 */
const readSettingsOverride = (): Partial<PublicSettings> => {
  if (!import.meta.client) return {};
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as Partial<PublicSettings>) : {};
  } catch {
    return {};
  }
};

/** A row is usable only if it is a non-empty string. */
const str = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

export const mockSettingsRepo: SettingsRepository = {
  async publicSettings() {
    const fallback = PUBLIC_SETTINGS_FALLBACK;

    // `settle` can throw when `failureRate` is turned up. The contract says
    // this method never does, so the simulated failure has to be absorbed here
    // — it is the same shape as a real request failing, and the caller still
    // gets a complete object.
    const stored = await settle(readSettingsOverride()).catch(
      (): Partial<PublicSettings> => ({}),
    );

    return {
      contact: {
        email: str(stored.contact?.email, fallback.contact.email),
        phone: str(stored.contact?.phone, fallback.contact.phone),
      },
      whatsapp: str(stored.whatsapp, fallback.whatsapp),
      // Empty is a value here — "not published" — so only a *missing* or
      // non-URL row falls back. See `PublicSettings.instagram`.
      instagram:
        stored.instagram === ""
          ? ""
          : /^https?:\/\//i.test(String(stored.instagram ?? ""))
            ? String(stored.instagram).trim()
            : fallback.instagram,
    };
  },
};
