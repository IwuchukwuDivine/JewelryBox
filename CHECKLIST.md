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
| `server/utils/orderEmails.ts` | Hand-written inline-styled HTML strings — **not** Resend templates. 4 builders (customer/vendor × placed/status) over a `STATUS_COPY` map. Rewrite copy and brand tokens. |
| `supabase/templates/*.html` + `[auth.email.template.*]` | Six branded auth emails, sent by **Supabase**, not Resend. |
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
      `CartLine`, `Address`, `DeliveryRate`, `DeliveryMethod`,
      `DeliverySelection`, `PaymentMethod`, `OrderStatus`, `Order`,
      `OrderItem`, `OrderStatusEvent`, `ProductFilters`, `PaginatedProducts`,
      `ProductInput`/`VariantInput`/`RateInput`, `PlaceOrderInput`.
- [x] `app/utils/types/api.ts` — **the seam between the lanes.** Repository
      interfaces for products, wishlist, delivery, orders, announcements, auth,
      addresses and all five admin repositories. Frontend mocks implement these;
      backend Supabase modules implement the same ones.
- [x] `app/utils/types/admin.ts` — `ProductDraft`, `VariantDraft`, `RateDraft`,
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
- [x] `app/utils/constants/lagosAreas.ts` — 38 Lagos areas in 4 rider-cost
      groups (Mainland, Island, Lekki–Epe, Outskirts). Seed for the admin
      pricing table; live rates come from the database.
- [x] `app/utils/cartLineKey.ts`, `app/utils/productAvailability.ts`,
      `app/utils/deliveryMethodForState.ts`.
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
- **Delivery is `dispatch | flight`, and the customer never picks it.** Lagos
  goes by dispatch rider, priced **per area**; every other state goes by air
  freight, priced **per state**. Checkout asks *where*, then derives *how* via
  `deliveryMethodForState()`. BGI's GUO/GIG park couriers and zone groupings
  are gone — `delivery_zones` becomes `delivery_rates`, one row per priced
  destination.
- **An unpriced destination is not an error.** No active rate means the order
  is still placed with `delivery_fee_ngn = null`, and the fee follows by
  email — the same way BGI handled an unquoted GIG shipment.
- **Availability is derived, never stored** — `productAvailability()` is the
  only place `in-stock` / `low-stock` / `made-to-order` / `sold` is decided.
- **Prices are whole-naira integers.** No kobo, no floats, anywhere.
- `stock_count` drives the prototype's "2 left"; `null` hides the count.


---

# FRONTEND LANE

Mock data only. No Supabase import anywhere in this lane.

## Phase A · Mock data + shell

- [x] `app/utils/mock/products.ts` — ≥24 pieces across every category, with real
      photography URLs, multiple images each, some out of stock, some variants
      (strap, ring size, chain length), a few `featured`.
- [x] `app/utils/mock/{orders,announcements,user}.ts` — plus `rates.ts` (not
      `zones.ts`: `delivery_zones` became `delivery_rates` in Phase 0) and
      `images.ts`, a pool of HTTP-verified, visually-reviewed photo IDs.
- [x] Mock-backed composables returning the Phase 0 types with a simulated delay,
      so loading and error states are real from day one.
- [x] `Layout/Header.vue` — wordmark (`AppLogo`), nav (Watches · Jewelry ·
      Moissanite · Gifts), search, bag, account, `AppThemeToggle`.
      Glass background (`--glass`), hairline bottom border.
      **No wishlist icon** — dropped to reduce crowding; the account icon earns
      its place because it is the login/signup entry point. Wishlist stays
      reachable from the footer, the mobile nav, and the diamond on every card.
      The wordmark sits in the left cluster, not centred: centring left a dead
      gap between the collections and the mark on wide screens.
- [x] `Layout/Footer.vue`, `Layout/AnnouncementBar.vue`, `Layout/MobileNav.vue`.
- [x] `Layout/CartDrawer.vue` — slides from the right, 600ms, 40% backdrop.
- [x] Base UI in `app/components/App/`: `Button`, `Input`, `Select`, `Textarea`,
      `Checkbox`, `Radio`, `Modal`, `Sheet`, `Skeleton`, `EmptyState`,
      `Breadcrumbs`, `Pagination`, `QuantityStepper`, `Badge`. All 2px radius,
      `--ease-brand` transitions.
- [x] Page transition: 400ms fade, content enters from 16px below.
- [x] Reveal animation: 24px rise + fade, 80ms stagger. Respect
      `prefers-reduced-motion` (the media query is already in `main.css`).

## Phase B · Storefront pages

- [x] `/` — hero ("Luxury, Worn Close."), featured pieces, category tiles,
      "Chosen for the wrist", moissanite section, editorial/campaign strip,
      recently viewed.
- [x] `/[category]` — grid, filter rail (category, price, availability,
      moissanite), sort, quick view, pagination. Filters drive query params;
      filtered views must set `robots: noindex, follow` and canonical to the
      bare path.
- [x] `/product/[slug]` — gallery with macro zoom, variant chips, price,
      stock/made-to-order state, add to bag, buy now, specs table (IBM Plex
      Mono), certification note, delivery/returns accordion, "You may also
      consider".
- [x] `/campaign/[slug]` — editorial layout, full-bleed imagery.
- [x] `/wishlist` — grid, move to bag, empty state ("Nothing here yet.").
- [x] `/cart` — line items, quantity, subtotal, delivery estimate, proceed.
- [x] `/about`, `/contact` (form + WhatsApp specialist), `/faq` (accordion,
      `FAQPage` JSON-LD), `/search`.
- [x] Legal: `/shipping-returns`, `/privacy`, `/terms`.
- [x] Every page calls `usePageSeo()` with the right OG card and JSON-LD —
      `Product` cards for PDP, `Collection` for category, `Campaign` for
      editorial, `Default` elsewhere.

## Phase C · Checkout + account

- [x] `/checkout` — **3 input steps plus a receipt**, which is what the prototype
      actually has (`Step {n} / 3`): contact → address + delivery → payment. The
      order summary is visible throughout, so "review" is continuous rather than
      a fourth screen. The "4 steps" above was a miscount of the design source.
      Step indicator, per-step validation, guest checkout allowed.
- [x] `Order/PaymentMethodPicker.vue` — **bank transfer** and **pay on delivery**
      only. No card, no Paystack, no Flutterwave.
- [x] `Order/BankTransferCard.vue` — account details, order number as reference,
      copy-to-clipboard (`app/utils/copy.ts` exists).
- [x] `Order/DeliveryDestination.vue` — **not a method picker.** State select;
      when the state is Lagos an area select appears; the resolved method and
      fee are then *shown*, not chosen. Unpriced destination renders
      "Delivery quoted after you order" and still allows checkout.
- [x] `/order/confirmed`, `/order/[id]` — `Order/Timeline.vue` and
      `Order/StatusBadge.vue` must render **both** lanes correctly.
- [x] `/track` — guest lookup by order number + email.
- [x] `/account` with tabs: overview, orders, order detail, profile, addresses,
      preferences. Matches the prototype's account tabs.
- [x] `/auth/*`: login, signup, forgot-password, reset-password, otp-verification,
      callback, confirm.
- [x] Account, checkout and wishlist are `noindex` — they are already in
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
- [ ] `/admin/delivery` — two tables: **Lagos areas** (dispatch) and
      **States** (flight), each a name + fee + active row. `RateFormModal`,
      inline fee editing and a bulk fee update, since a courier price rise
      moves many rows at once. Seed the area picker from
      `constants/lagosAreas.ts`.
- [ ] `/admin/announcements` — single-active banner.
- [ ] `/admin/analytics` — revenue chart, status doughnut, top products. Port
      BGI's three chart components.
- [ ] `/admin/settings` — bank account details, contact details, WhatsApp number.

---

# BACKEND LANE

## Phase A · Schema

- [x] `supabase/migrations/<ts>_init_shop.sql`, modelled on BGI's init:
  - [x] `profiles` — id, full_name, phone, role, created_at. + `is_admin()`,
        `handle_new_user()` trigger, `protect_profile_role()` trigger.
  - [x] `products` — slug, name, description, category, brand, price_ngn,
        images[], in_stock, made_to_order, featured, is_moissanite, specs jsonb
        (movement, case size, material, water resistance, stone, cut, clarity),
        created_at. **No grams, no karat.**
  - [x] `product_variants` — label, options jsonb, price_ngn, in_stock, position.
  - [x] `delivery_rates` — mode `('dispatch','flight')`, name, state, fee_ngn,
        active, position. A `dispatch` row is a Lagos area and must carry
        `state = 'Lagos'`; a `flight` row is a state and must not. Enforce
        both with a check constraint, and `unique (mode, name)`.
  - [x] `site_settings` — key/value jsonb (bank account details, contact
        details, WhatsApp number).
  - [x] `orders` — order_number, user_id, **status** check
        `('received','confirmed','shipped','delivered','cancelled')`,
        **payment_method** check `('bank_transfer','pay_on_delivery')`,
        items jsonb, delivery_method `('dispatch','flight')`,
        delivery_destination (area or state name), delivery_fee_ngn **nullable**,
        subtotal_ngn, total_ngn, shipping_address jsonb, status_history jsonb,
        paid_at, created_at.
  - [x] `wishlists`, `announcements` (+ single-active trigger).
- [x] Constraint: `status = 'confirmed'` requires
      `payment_method = 'bank_transfer'`.
- [x] `append_order_status_history()` trigger — port from BGI.
- [x] `advance_order_status()` — validates the transition against the order's
      payment method, sets `paid_at`, rejects illegal jumps. Admin only.
- [x] `place_order(p_items, p_address, p_delivery, p_payment)` — reprices every
      line server-side from `products`/`product_variants`, resolves the delivery
      fee from `delivery_rates`, generates `JB-XXXXXX`, inserts at `received`.
      Never trusts a client price.
  - [x] Derives `delivery_method` from the address state server-side — Lagos →
        dispatch, anything else → flight — rather than trusting the client, and
        rejects a `rate_id` whose state does not match the address.
  - [x] Accepts an order to an unpriced destination with a null fee.
- [x] `lookup_order(p_order_ref, p_email)` — guest tracking, `security definer`.
- [x] Full RLS: public read on products/variants/rates/settings/announcements;
      own-row on profiles/orders/wishlists; admin write everywhere.
- [x] Storage bucket `product-images` + the 4 storage policies.
- [x] `supabase/seed.sql` — mirror `app/utils/mock/products.ts` exactly so the
      Phase F swap is invisible.

## Phase B · Server routes + email

- [x] `server/utils/supabase.ts`, `supabaseService.ts` — port from BGI.
- [x] `server/api/orders/notify.post.ts` — order placed → customer + vendor email.
- [x] `server/utils/orderEmails.ts` — port BGI's structure: brand tokens as
      consts, an `esc()` helper, partials (`itemRows`, `totalsRows`,
      `addressBlock`, `button`), a `shell()` document wrapper, a
      `STATUS_COPY: Record<OrderStatus, {subject, heading, body}>` map, and
      four payload builders (customer/vendor × placed/status).
      **Emails live in the repo as HTML, not as Resend-hosted templates** —
      they interpolate order data and must be version-controlled with the code.
  - [x] Copy rewritten for the two lanes: a bank-transfer "received" email
        carries the account details and the order number as reference; a
        pay-on-delivery "received" email states the amount due at the door.
  - [x] `STATUS_COPY` keyed to the new statuses — `received`, `confirmed`,
        `shipped`, `delivered`, `cancelled`. BGI's `pending`/`paid`/`processing`
        keys do not exist here.
- [x] `server/utils/sendOrderEmails.ts` — BGI hits `https://api.resend.com/emails`
      with a raw `fetch` and no SDK. **Decide first:** keep that, or use the
      `resend` SDK for idempotency keys and typed errors. The `resend:*` skills
      in this repo cover the trade-off, deliverability and SPF/DKIM.
- [x] `supabase/templates/{confirmation,recovery,invite,email_change,magic_link,password_changed_notification}.html`
      — branded auth emails sent by Supabase, not Resend. Wire via
      `[auth.email.template.*]` in `config.toml`.
      **Gotcha from BGI:** `[auth.email.template.*]` paths resolve from the
      project root (`./supabase/templates/…`) while
      `[auth.email.notification.*]` resolve from `./supabase/` (`./templates/…`).
      That inconsistency is real — do not "fix" it.
- [x] Extend `server/api/__sitemap__/urls.ts` with published products and
      categories, `lastmod` from `updated_at`. The TODO is already in the file.
- [x] `server/api/contact.post.ts` — contact form → vendor email, rate limited.

## Phase C · Client data layer

- [ ] `app/utils/supabase.ts` is done (backend). The composable half went to the
      frontend lane as `useAuth` — see the lane split note below.
- [x] `app/utils/api/{shop,orders,admin,wishlist,announcements,delivery}.ts` —
      port BGI's structure, implementing the interfaces in `types/api.ts`.
- [x] Stores: `cart` (persisted), `wishlist`, `address`, `orders`, `app`.
      Port from BGI; drop `currency` and `rates`.
- [x] Real implementations of every Phase 0 composable.
- [x] `useAuth` + `middleware/{auth,admin,guest,checkout}.ts`.

---

> **Lane split, as built.** The backend lane owned `supabase/`, `server/`,
> `app/utils/api/`, `app/utils/supabase.ts` and `tests/`. The remaining Phase C
> items — stores, composables, `useAuth` and the middleware — were built by the
> frontend lane instead, because both lanes ran concurrently in one working tree
> and those paths were already theirs. They are ticked above as frontend work.
>
> `middleware/admin.ts` is the one exception: it is not built, because Phase D
> is deferred and nothing routes to `/admin` yet.
>
> Backend surfaces all built. Phase G's component and E2E tests, and the `seoText` / `rules` unit
> tests, remain with the frontend lane.

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

- [x] Vitest + `@nuxt/test-utils`.
- [ ] Unit: `formatPrice`, `seoText` (60/155 caps), `cartLineKey`, `rules`,
      **order status transition validity for both lanes**, and
      `deliveryMethodForState` (Lagos in any casing → dispatch).
- [ ] Component: `Order/Timeline` for both lanes, `PaymentMethodPicker`,
      `QuantityStepper`, `ProductForm` validation.
- [x] DB: `place_order` picks the Lagos area fee for a Lagos address and the
      state fee otherwise; rejects a `rate_id` from the wrong state; accepts an
      unpriced destination with a null fee. `place_order` reprices when a
      client sends a tampered price;
      `advance_order_status` rejects `received → shipped` on bank transfer and
      rejects `confirmed` entirely on pay-on-delivery; RLS denies cross-user
      order reads and non-admin writes.
- [ ] E2E (Playwright): guest bank-transfer checkout, logged-in pay-on-delivery
      checkout, admin advancing an order end to end.

# Phase H · Launch

- [x] Replace `app/pages/index.vue` (currently coming-soon) with the real home.
- [ ] Add `/about`, `/contact`, `/faq` to `routeRules` prerender.
- [ ] Fill `NUXT_PUBLIC_GTAG_ID`; fill `SOCIAL_X` / `SOCIAL_INSTAGRAM` in
      `app/utils/constants/brand.ts`.
- [ ] Verify Search Console by DNS TXT, submit `sitemap.xml`.
- [ ] Lighthouse on `/`, a category and a PDP. Watch CLS.
- [ ] Rich Results Test: `Organization`, `WebSite`, `Product`, `BreadcrumbList`.
- [ ] Seed real inventory; set bank details and delivery zones in admin.
