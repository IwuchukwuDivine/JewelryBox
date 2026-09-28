<template>
  <AppContainer as="main" class="ord">
    <AppBreadcrumbs :items="crumbs" />

    <!-- The guest pointer lives in localStorage, so nothing is knowable until
         mount. Hold the shape rather than reflowing into it. -->
    <div v-if="loading" class="ord__layout">
      <div class="ord__main">
        <AppSkeleton variant="text" width="42%" />
        <AppSkeleton variant="text" width="68%" height="30px" />
        <AppSkeleton height="220px" />
      </div>
      <div class="ord__aside">
        <AppSkeleton height="240px" />
      </div>
    </div>

    <AppEmptyState
      v-else-if="!order"
      title="We could not find that order."
      message="Check the order number — it looks like JB-7K3QMZ — or write to the house and we will find it for you."
    >
      <AppButton to="/track">Track an order</AppButton>
      <AppButton to="/contact" variant="outline">Contact the house</AppButton>
    </AppEmptyState>

    <template v-else>
      <header class="ord__head">
        <div class="ord__heading">
          <p class="mono-meta">Order {{ order.order_number }}</p>
          <h1 class="display-heading ord__title">Placed {{ formatDate(order.created_at) }}</h1>
        </div>

        <OrderStatusBadge
          :status="order.status"
          :payment-method="order.payment_method"
        />
      </header>

      <div class="ord__layout">
        <div class="ord__main">
          <section class="ord__block" aria-label="Progress">
            <h2 class="mono-meta ord__block-title">Progress</h2>
            <OrderTimeline :order="order" />

            <p v-if="refundNote" class="ord__note">{{ refundNote }}</p>
          </section>

          <section class="ord__block" aria-label="Pieces in this order">
            <h2 class="mono-meta ord__block-title">
              {{ order.items.length }}
              {{ order.items.length === 1 ? "piece" : "pieces" }}
            </h2>

            <ul class="ord__lines">
              <li v-for="line in lines" :key="cartLineKey(line)" class="ord__line">
                <CartLineItem :line="line" readonly />
              </li>
            </ul>
          </section>

          <section class="ord__block" aria-label="Delivery address">
            <h2 class="mono-meta ord__block-title">
              {{ carriage }} · {{ order.delivery_destination }}
            </h2>

            <address class="ord__address">
              <span>{{ order.shipping_address.full_name }}</span>
              <span>{{ order.shipping_address.line1 }}</span>
              <span v-if="order.shipping_address.line2">
                {{ order.shipping_address.line2 }}
              </span>
              <span>
                {{ order.shipping_address.city }}, {{ order.shipping_address.state }}
              </span>
              <span>{{ order.shipping_address.phone }}</span>
              <span>{{ order.shipping_address.email }}</span>
            </address>

            <p v-if="order.shipping_address.notes" class="ord__note">
              “{{ order.shipping_address.notes }}”
            </p>
          </section>
        </div>

        <aside class="ord__aside">
          <OrderSummary
            :item-count="order.items.length"
            :subtotal="order.subtotal_ngn"
            :delivery-fee="order.delivery_fee_ngn"
            :payment-method="order.payment_method"
            :destination="order.delivery_destination"
            unpriced-label="To be confirmed"
          >
            <p class="ord__paid" :class="{ 'ord__paid--yes': moneyReceived }">
              {{ paymentLine }}
            </p>
          </OrderSummary>

          <OrderBankTransferCard v-if="showBankCard" :order="order" />

          <a class="luxe-card ord__help" :href="whatsappUrl" target="_blank" rel="noopener">
            <lucide-message-circle
              :size="18"
              :stroke-width="1.5"
              class="ord__help-icon"
              aria-hidden="true"
            />
            <span class="ord__help-body">
              <span class="display-heading ord__help-title">Ask about this order</span>
              <span class="ord__help-note">
                WhatsApp the house with {{ order.order_number }} — usually a
                reply in under 10 minutes.
              </span>
            </span>
            <span class="ord__help-arrow" aria-hidden="true">&rarr;</span>
          </a>
        </aside>
      </div>
    </template>
  </AppContainer>
</template>

<script setup lang="ts">
import type { CartLine, Order, OrderItem } from "~/utils/types/shop";

/**
 * One order, by id or by order number.
 *
 * `useOrderQuery` accepts either, and for a guest it falls back to the
 * device-local `{ order_number, email }` pointer — which is why `/track`
 * navigating here works without a session.
 */
const route = useRoute();
const mounted = useMounted();

const reference = computed(() => String(route.params.id ?? "").trim());

const { data: order, isPending } = useOrderQuery(reference);

// `enabled` is false without a reference, and a disabled query stays `pending`
// forever — so an empty reference must fall straight through to the not-found
// state rather than spinning.
const loading = computed(
  () => Boolean(reference.value) && (!mounted.value || isPending.value),
);

const crumbs = computed(() => [
  { label: "Home", to: "/" },
  { label: "Orders", to: "/track" },
  { label: order.value?.order_number ?? reference.value },
]);

/**
 * Order lines rendered through `<CartLineItem readonly>` rather than a second
 * line component. An order line carries no slug or category — the readonly
 * form links to neither, so both are placeholders here and are never read.
 */
const toLine = (item: OrderItem): CartLine => ({
  product_id: item.product_id,
  quantity: item.quantity,
  slug: "",
  name: item.name,
  brand: item.brand,
  price_ngn: item.price_ngn,
  image: item.image,
  category: "rings",
  ...(item.variant_id
    ? { variant_id: item.variant_id, variant_label: item.variant_label }
    : {}),
});

const lines = computed<CartLine[]>(() => (order.value?.items ?? []).map(toLine));

const carriage = computed(() =>
  order.value?.delivery_method === "dispatch" ? "Dispatch rider" : "Air freight",
);

/* ── Money ────────────────────────────────────────────────────────────── */

/**
 * Whether money has actually reached the shop for this order.
 *
 * DO NOT reduce this to `isPaid(order.status, order.payment_method)`. That
 * reads the *current* status, and the one order that most needs the question
 * answered is a cancelled one — whose current status is `cancelled` and so
 * never paid under either lane. A transfer cancelled after `confirmed` took
 * real money, and this page must not tell the customer otherwise while the
 * cancellation email in their inbox promises a refund.
 *
 * So all three signals are consulted, exactly as `server/utils/orderEmails.ts`
 * does: the current status, `paid_at` (set at `confirmed` for transfers and at
 * `delivered` for pay-on-delivery, never cleared), and `isPaid()` over the
 * whole history.
 */
const paidFor = (value: Order): boolean =>
  isPaid(value.status, value.payment_method) ||
  value.paid_at !== null ||
  value.status_history.some((event) => isPaid(event.status, value.payment_method));

const moneyReceived = computed(() => (order.value ? paidFor(order.value) : false));

const paymentLine = computed(() => {
  const value = order.value;
  if (!value) return "";

  const method =
    value.payment_method === "bank_transfer" ? "Bank transfer" : "Pay on delivery";

  if (value.status === "cancelled") {
    return moneyReceived.value
      ? `${method} · paid, refund in progress`
      : `${method} · cancelled, nothing was charged`;
  }

  if (moneyReceived.value) {
    return value.paid_at
      ? `${method} · paid ${formatDate(value.paid_at)}`
      : `${method} · paid`;
  }

  return value.payment_method === "bank_transfer"
    ? `${method} · awaiting your transfer`
    : `${method} · payable at the door`;
});

const refundNote = computed(() => {
  const value = order.value;
  if (!value || value.status !== "cancelled" || !moneyReceived.value) return "";
  return "A payment was received against this order and is being refunded in full to the account it came from. Allow up to five working days for it to appear.";
});

/** Only while a transfer is still owed — never once the money is in. */
const showBankCard = computed(() => {
  const value = order.value;
  if (!value) return false;
  return (
    value.payment_method === "bank_transfer" &&
    value.status !== "cancelled" &&
    !moneyReceived.value
  );
});

/*
 * TODO(launch): the concierge number is duplicated from `pages/contact.vue`.
 * Both should read `site_settings` once the admin surface lands, so a change
 * of number does not have to be found in two files.
 */
const CONCIERGE_WHATSAPP = "2348000000000";

const whatsappUrl = computed(() => {
  const ref = order.value?.order_number ?? reference.value;
  return `https://wa.me/${CONCIERGE_WHATSAPP}?text=${encodeURIComponent(
    `Hello JewelryBox, I have a question about order ${ref}.`,
  )}`;
});

usePageSeo({
  title: () => `Order ${order.value?.order_number ?? reference.value}`,
  description: "Your order, its progress and its delivery details.",
  path: () => `/order/${reference.value}`,
  // One person's private order. Nothing here is for a crawler, and the page
  // should not pass link equity to the pieces on it either.
  robots: "noindex, nofollow",
});
</script>

<style scoped>
.ord {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-block: 24px 64px;
}

.ord__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.ord__heading {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.ord__title {
  margin: 0;
  font-size: clamp(24px, 5vw, 32px);
  line-height: 1.1;
}

.ord__layout {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.ord__main {
  display: flex;
  flex-direction: column;
  gap: 32px;
  min-width: 0;
}

.ord__block {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ord__block-title {
  margin: 0;
}

.ord__lines {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ord__line {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-default);
}

.ord__line:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.ord__address {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 14px;
  font-style: normal;
  line-height: 1.5;
  color: var(--text-secondary);
}

.ord__note {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-muted);
}

/* ── Aside ───────────────────────────────────────────────────────────── */

.ord__aside {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.ord__paid {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted);
}

.ord__paid--yes {
  color: var(--color-success);
}

.ord__help {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  color: inherit;
  text-decoration: none;
  transition: border-color var(--dur-hover) var(--ease-brand);
}

.ord__help:hover {
  border-color: var(--border-strong);
}

.ord__help-icon {
  flex: 0 0 auto;
  color: var(--accent);
}

.ord__help-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.ord__help-title {
  font-size: 16px;
  line-height: 1.2;
}

.ord__help-note {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted);
}

.ord__help-arrow {
  flex: 0 0 auto;
  color: var(--text-muted);
}

@media (min-width: 1024px) {
  .ord__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 48px;
    align-items: start;
  }

  .ord__aside {
    position: sticky;
    /* Clears the glass header without a magic number of its own. */
    top: calc(80px + var(--top));
  }
}
</style>
