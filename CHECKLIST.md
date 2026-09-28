# JewelryBox — Build Checklist

Two lanes that run in parallel. **Frontend builds against mock data** so the whole
UI can be reviewed before any database exists; **backend builds the real schema and
API** behind the same contracts. They meet at Phase F.

- Source of truth for **UI**: Claude Design project `JewelryBox` →
  `JewelryBox Prototype.dc.html`, `Brand Identity.dc.html`.
- Source of truth for **behaviour**: `/Users/dee_vyn/Documents/BGI` — mirror it
  unless this document says otherwise. Do not redesign what already works there.
- Foundation (fonts, theme tokens, brand assets, SEO, OG cards) is **done**. See
  `README.md`.

## Rules of engagement

1. **Phase 0 is shared and blocking.** Both lanes stop until the types and the API
   surface are agreed. Everything after that is independent.
2. Frontend never imports Supabase. It calls composables; until Phase F those
   composables return fixtures from `app/utils/mock/`.
3. Backend never touches `app/components/` or `app/pages/` except `admin/`.
4. Every colour, size and radius comes from `main.css` tokens. No literal hexes in
   components — see `app/utils/constants/brand.ts` for the few places literals are
   unavoidable (JSON-LD, manifest, Satori cards).
5. Follow `.claude/skills/nuxt-conventions/`. `<script setup lang="ts">`, typed
   props, pages stay lean, no repeated styles.

---

## What we take from BGI, and what we leave

**Take wholesale** (adapt names and styling, keep the logic):

| BGI | Notes |
|---|---|
| `profiles` + `is_admin()` + `handle_new_user()` + `protect_profile_role()` | Role escalation is already blocked by trigger. Copy it. |
| `orders` + `append_order_status_history()` trigger | Status flow changes — see below. |
| `place_order()` RPC | Server-side repricing; the client never sends prices. |
| `lookup_order()` | Guest order tracking by order number + email. |
| `delivery_zones`, `site_settings`, `wishlists`, `announcements` | As-is. |
| Full RLS policy set (21 policies) | Same shape, same names. |
| `server/utils/orderEmails.ts` (6 templates) | Rewrite copy for the new status flow. |
| `middleware/{auth,admin,guest,checkout}.ts`, `layouts/{admin,auth}.vue` | As-is. |
| Admin pages: index, orders, products, delivery, announcements, analytics | As-is minus rates. |
| `Admin/{ImageUploader,ProductForm,VariantsEditor,OrderDetailModal,ZoneFormModal,RevenueChart,StatusDoughnut,TopProductsBar}.vue` | Restyle to JewelryBox, keep behaviour. |

**Leave behind:**

- **All Paystack.** `payments/init`, `payments/status`, `webhooks/paystack`,
  `settlePaystack.ts`, `usePaystackPayment.ts`, `Order/PayOnlineCard.vue`,
  `order/payment-callback.vue`, and the `20260826000000_paystack_payments` migration.
- **All gold-rate pricing.** `gold_rates`, `gold_price_ngn()`,
  `apply_product_pricing()`, `apply_variant_pricing()`, `reprice_on_rate_change()`,
  `admin/rates.vue`, `useAdminRates`, `formatGrams.ts`, and the `grams`/`karat`
  columns. Watches and jewelry are **fixed-price**.
- **Multi-currency.** `currency` store, `useCurrency`, `getFlagEmoji`,
  `constants/currencies.ts`. JewelryBox prices in ₦ only.

**Improve on BGI:** it ships **zero tests**. Phase G is not optional.

---

## Order lifecycle — the one real divergence

Two payment methods, two lanes through one status column.

```
payment_method = 'bank_transfer'
  received ──► confirmed ──► shipped ──► delivered
            (payment seen)

payment_method = 'pay_on_delivery'
  received ─────────────────► shipped ──► delivered
                                       (payment collected at the door)

cancelled: reachable from any state before 'delivered', either lane.
```

- `confirmed` is **only** valid when `payment_method = 'bank_transfer'` — enforce
  in the DB, not just the UI.
- `order_number` doubles as the transfer reference, exactly as BGI does it.
- `paid_at` is set on `confirmed` (transfer) or on `delivered` (on delivery).

> **Check this reading before Phase A lands.** I took "bank transfer → received →
> confirmed → shipped" to mean the order is `received` the moment it is placed,
> with no separate "awaiting transfer" state before it. If you want a distinct
> pre-payment state, say so now — it is one migration early and a painful
> backfill later.

---

# Phase 0 · Shared contracts — ✅ DONE

Both lanes are unblocked. Everything below exists, typechecks and lints clean.
**Do not redefine any of it in your lane** — import it.

- [x] `app/utils/types/shop.ts` — `Product`, `ProductVariant`, `SpecPair`,
      `CartLine`, `Address`, `DeliveryZone`, `DeliveryMethod`,
      `DeliverySelection`, `PaymentMethod`, `OrderStatus`, `Order`,
      `OrderItem`, `OrderStatusEvent`, `ProductFilters`, `PaginatedProducts`,
      `ProductInput`/`VariantInput`/`ZoneInput`, `PlaceOrderInput`.
- [x] `app/utils/types/api.ts` — **the seam between the lanes.** Repository
      interfaces for products, wishlist, delivery, orders, announcements, auth,
      addresses and all five admin repositories. Frontend mocks implement these;
      backend Supabase modules implement the same ones.
- [x] `app/utils/types/admin.ts` — `ProductDraft`, `VariantDraft`, `ZoneDraft`,
      `AdminStats`, `AdminAnalytics`, `RevenuePoint`, `TopProduct`.
- [x] `app/utils/types/announcement.ts`, `app/utils/types/forms.ts`
      (`Rule` now lives here; `rules.ts` imports it).
- [x] `app/utils/constants/orderStatus.ts` — `ORDER_FLOW`, `ORDER_STATUSES`,
      `PAYMENT_METHODS`, `nextStatuses()`, `canTransition()`, `isPaid()`.
      Verified against all ten transition cases.
- [x] `app/utils/constants/catalog.ts` — `PRODUCT_CATEGORIES` (5),
      `COLLECTIONS` (4 nav entries), `SORT_OPTIONS`, `FILTER_OPTIONS`,
      `UNDER_PRICE_NGN`, `LOW_STOCK_THRESHOLD`, `PRODUCTS_PER_PAGE`, lookups.
- [x] `app/utils/constants/states.ts` — 37 states, copied from BGI.
- [x] `app/utils/cartLineKey.ts`, `app/utils/productAvailability.ts`.
- [x] `app/utils/formatPrice.ts` — `formatPrice` now returns `₦0` instead of
      an empty string, plus `formatDeliveryFee` (renders `Free` at zero).

### Decisions locked in Phase 0

- **Specs are `SpecPair[]`, not columns.** The prototype declares Movement /
  Case / Crystal / Water resistance for a watch and Stone / Metal / Setting /
  Band for a ring. Ordered label-value pairs in `jsonb`, admin-editable.
- **Categories and collections are different things.** Five categories
  (watches, rings, necklaces, earrings, bracelets); four nav collections
  (Watches, Jewelry, Moissanite, Gifts) where Moissanite and Gifts are
  tag-driven and cut across categories.
- **Delivery is `doorstep | pickup`** — BGI's GUO/GIG park couriers do not fit
  insured jewelry. Zone-based fees are unchanged.
- **Availability is derived, never stored** — `productAvailability()` is the
  only place `in-stock` / `low-stock` / `made-to-order` / `sold` is decided.
- **Prices are whole-naira integers.** No kobo, no floats, anywhere.
- `stock_count` drives the prototype's "2 left"; `null` hides the count.


---

# FRONTEND LANE

Mock data only. No Supabase import anywhere in this lane.

## Phase A · Mock data + shell

- [ ] `app/utils/mock/products.ts` — ≥24 pieces across every category, with real
      photography URLs, multiple images each, some out of stock, some variants
      (strap, ring size, chain length), a few `featured`.
- [ ] `app/utils/mock/{orders,zones,announcements,user}.ts`.
- [ ] Mock-backed composables returning the Phase 0 types with a simulated delay,
      so loading and error states are real from day one.
- [ ] `Layout/Header.vue` — wordmark (`AppLogo`), nav (Watches · Jewelry ·
      Moissanite · Gifts), search, wishlist, bag, account, `AppThemeToggle`.
      Glass background (`--glass`), hairline bottom border.
- [ ] `Layout/Footer.vue`, `Layout/AnnouncementBar.vue`, `Layout/MobileNav.vue`.
- [ ] `Layout/CartDrawer.vue` — slides from the right, 600ms, 40% backdrop.
- [ ] Base UI in `app/components/App/`: `Button`, `Input`, `Select`, `Textarea`,
      `Checkbox`, `Radio`, `Modal`, `Sheet`, `Skeleton`, `EmptyState`,
      `Breadcrumbs`, `Pagination`, `QuantityStepper`, `Badge`. All 2px radius,
      `--ease-brand` transitions.
- [ ] Page transition: 400ms fade, content enters from 16px below.
- [ ] Reveal animation: 24px rise + fade, 80ms stagger. Respect
      `prefers-reduced-motion` (the media query is already in `main.css`).

## Phase B · Storefront pages

- [ ] `/` — hero ("Luxury, Worn Close."), featured pieces, category tiles,
      "Chosen for the wrist", moissanite section, editorial/campaign strip,
      recently viewed.
- [ ] `/[category]` — grid, filter rail (category, price, availability,
      moissanite), sort, quick view, pagination. Filters drive query params;
      filtered views must set `robots: noindex, follow` and canonical to the
      bare path.
- [ ] `/product/[slug]` — gallery with macro zoom, variant chips, price,
      stock/made-to-order state, add to bag, buy now, specs table (IBM Plex
      Mono), certification note, delivery/returns accordion, "You may also
      consider".
- [ ] `/campaign/[slug]` — editorial layout, full-bleed imagery.
- [ ] `/wishlist` — grid, move to bag, empty state ("Nothing here yet.").
- [ ] `/cart` — line items, quantity, subtotal, delivery estimate, proceed.
- [ ] `/about`, `/contact` (form + WhatsApp specialist), `/faq` (accordion,
      `FAQPage` JSON-LD), `/search`.
- [ ] Legal: `/shipping-returns`, `/privacy`, `/terms`.
- [ ] Every page calls `usePageSeo()` with the right OG card and JSON-LD —
      `Product` cards for PDP, `Collection` for category, `Campaign` for
      editorial, `Default` elsewhere.

## Phase C · Checkout + account

- [ ] `/checkout` — 4 steps matching the prototype: contact → address + delivery →
      payment → review. Step indicator, per-step validation, guest checkout allowed.
- [ ] `Order/PaymentMethodPicker.vue` — **bank transfer** and **pay on delivery**
      only. No card, no Paystack, no Flutterwave.
- [ ] `Order/BankTransferCard.vue` — account details, order number as reference,
      copy-to-clipboard (`app/utils/copy.ts` exists).
- [ ] `Order/DeliveryMethodPicker.vue` — doorstep / park pickup, zone-driven fee.
- [ ] `/order/confirmed`, `/order/[id]` — `Order/Timeline.vue` and
      `Order/StatusBadge.vue` must render **both** lanes correctly.
- [ ] `/track` — guest lookup by order number + email.
- [ ] `/account` with tabs: overview, orders, order detail, profile, addresses,
      preferences. Matches the prototype's account tabs.
- [ ] `/auth/*`: login, signup, forgot-password, reset-password, otp-verification,
      callback, confirm.
- [ ] Account, checkout and wishlist are `noindex` — they are already in
      `robots.txt` and `sitemap.exclude`; add the meta too.

## Phase D · Admin UI

The design project has **no admin screens**. Take BGI's admin structure and
information architecture as-is, restyled with the JewelryBox tokens: obsidian
surfaces, hairline dividers, 2px radius, Marcellus for page titles, IBM Plex Mono
for figures and IDs.

- [ ] `layouts/admin.vue` — sidebar, `noindex` meta.
- [ ] `/admin` — stat tiles, recent orders, low stock.
- [ ] `/admin/orders` — filterable table, `OrderDetailModal`, status advance
      controls that only offer legal transitions for that order's payment method.
- [ ] `/admin/products` + `/new` + `/[id]` — `ProductForm`, `VariantsEditor`,
      `ImageUploader` (drag-drop, reorder, `compressImage.ts` from BGI).
- [ ] `/admin/delivery` — zones CRUD, `ZoneFormModal`, per-state fees.
- [ ] `/admin/announcements` — single-active banner.
- [ ] `/admin/analytics` — revenue chart, status doughnut, top products. Port
      BGI's three chart components.
- [ ] `/admin/settings` — bank account details, contact details, WhatsApp number.

---

# BACKEND LANE

## Phase A · Schema

- [ ] `supabase/migrations/<ts>_init_shop.sql`, modelled on BGI's init:
  - [ ] `profiles` — id, full_name, phone, role, created_at. + `is_admin()`,
        `handle_new_user()` trigger, `protect_profile_role()` trigger.
  - [ ] `products` — slug, name, description, category, brand, price_ngn,
        images[], in_stock, made_to_order, featured, is_moissanite, specs jsonb
        (movement, case size, material, water resistance, stone, cut, clarity),
        created_at. **No grams, no karat.**
  - [ ] `product_variants` — label, options jsonb, price_ngn, in_stock, position.
  - [ ] `delivery_zones` — name, states[], fee_ngn, active, position.
  - [ ] `site_settings` — key/value jsonb (bank details, pickup fee, contact).
  - [ ] `orders` — order_number, user_id, **status** check
        `('received','confirmed','shipped','delivered','cancelled')`,
        **payment_method** check `('bank_transfer','pay_on_delivery')`,
        items jsonb, subtotal_ngn, delivery_method, delivery_zone,
        delivery_fee_ngn, total_ngn, shipping_address jsonb, status_history jsonb,
        paid_at, created_at.
  - [ ] `wishlists`, `announcements` (+ single-active trigger).
- [ ] Constraint: `status = 'confirmed'` requires
      `payment_method = 'bank_transfer'`.
- [ ] `append_order_status_history()` trigger — port from BGI.
- [ ] `advance_order_status()` — validates the transition against the order's
      payment method, sets `paid_at`, rejects illegal jumps. Admin only.
- [ ] `place_order(p_items, p_address, p_delivery, p_payment)` — reprices every
      line server-side from `products`/`product_variants`, resolves the delivery
      fee from `delivery_zones`, generates `JB-XXXXXX`, inserts at `received`.
      Never trusts a client price.
- [ ] `lookup_order(p_order_ref, p_email)` — guest tracking, `security definer`.
- [ ] Full RLS: public read on products/variants/zones/settings/announcements;
      own-row on profiles/orders/wishlists; admin write everywhere.
- [ ] Storage bucket `product-images` + the 4 storage policies.
- [ ] `supabase/seed.sql` — mirror `app/utils/mock/products.ts` exactly so the
      Phase F swap is invisible.

## Phase B · Server routes + email

- [ ] `server/utils/supabase.ts`, `supabaseService.ts` — port from BGI.
- [ ] `server/api/orders/notify.post.ts` — order placed → customer + vendor email.
- [ ] `server/utils/orderEmails.ts` — six templates, rewritten for the new flow:
      order received (transfer — with account details + reference),
      order received (on delivery — amount due at the door),
      payment confirmed, shipped, delivered, cancelled.
- [ ] `server/utils/sendOrderEmails.ts` — Resend. The `resend:*` skills in this
      repo cover deliverability and SPF/DKIM.
- [ ] Extend `server/api/__sitemap__/urls.ts` with published products and
      categories, `lastmod` from `updated_at`. The TODO is already in the file.
- [ ] `server/api/contact.post.ts` — contact form → vendor email, rate limited.

## Phase C · Client data layer

- [ ] `app/composables/useSupabaseClient.ts`, `app/utils/supabase.ts`.
- [ ] `app/utils/api/{shop,orders,admin,wishlist,announcements,locations}.ts` —
      port BGI's structure.
- [ ] Stores: `cart` (persisted), `wishlist`, `address`, `orders`, `app`.
      Port from BGI; drop `currency` and `rates`.
- [ ] Real implementations of every Phase 0 composable.
- [ ] `useAuth` + `middleware/{auth,admin,guest,checkout}.ts`.

---

# Phase F · Integration

- [ ] Swap mock composables for real ones **one at a time**, in this order:
      products → announcements → auth → wishlist → cart → delivery → orders →
      admin. Each swap is its own commit.
- [ ] Delete `app/utils/mock/` once every consumer is live.
- [ ] Verify every loading, empty and error state against a real, slow network.
- [ ] Re-run the SEO checks from `README.md` — canonicals, sitemap, OG cards on
      real product pages.

# Phase G · Tests

BGI has none. Do not repeat that.

- [ ] Vitest + `@nuxt/test-utils`.
- [ ] Unit: `formatPrice`, `seoText` (60/155 caps), `cartLineKey`, `rules`,
      delivery fee resolution, **order status transition validity for both lanes**.
- [ ] Component: `Order/Timeline` for both lanes, `PaymentMethodPicker`,
      `QuantityStepper`, `ProductForm` validation.
- [ ] DB: `place_order` reprices when a client sends a tampered price;
      `advance_order_status` rejects `received → shipped` on bank transfer and
      rejects `confirmed` entirely on pay-on-delivery; RLS denies cross-user
      order reads and non-admin writes.
- [ ] E2E (Playwright): guest bank-transfer checkout, logged-in pay-on-delivery
      checkout, admin advancing an order end to end.

# Phase H · Launch

- [ ] Replace `app/pages/index.vue` (currently coming-soon) with the real home.
- [ ] Add `/about`, `/contact`, `/faq` to `routeRules` prerender.
- [ ] Fill `NUXT_PUBLIC_GTAG_ID`; fill `SOCIAL_X` / `SOCIAL_INSTAGRAM` in
      `app/utils/constants/brand.ts`.
- [ ] Verify Search Console by DNS TXT, submit `sitemap.xml`.
- [ ] Lighthouse on `/`, a category and a PDP. Watch CLS.
- [ ] Rich Results Test: `Organization`, `WebSite`, `Product`, `BreadcrumbList`.
- [ ] Seed real inventory; set bank details and delivery zones in admin.
