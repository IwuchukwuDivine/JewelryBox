<template>
  <AppContainer as="main" class="done">
    <div class="done__inner">
      <AppLogo variant="monogram" size="56px" :to="undefined" />

      <p class="eyebrow">{{ eyebrow }}</p>

      <h1 class="display-heading done__title">Your piece is being prepared.</h1>

      <p class="done__lede">
        A confirmation has been sent to
        <span class="done__email">{{ emailLabel }}</span>. Your piece will be
        sealed, insured and prepared for the journey — we will write again the
        moment it leaves us.
      </p>

      <!-- Bank transfer: the account, and the order number as the reference. -->
      <OrderBankTransferCard v-if="order && isTransfer" :order="order" class="done__bank" />

      <div class="done__actions">
        <AppButton :to="trackTo" size="lg" class="done__action">Track Order</AppButton>
        <AppButton to="/" variant="outline" size="lg" class="done__action">
          Continue
        </AppButton>
      </div>

      <p v-if="reference" class="done__ref mono-meta">
        Keep {{ reference }} for your records.
      </p>
    </div>
  </AppContainer>
</template>

<script setup lang="ts">
/**
 * The receipt — the fourth screen of a three-step checkout.
 *
 * It reads `?ref=` rather than holding state, so a reload, a back button or a
 * pasted link all land on the same page. The order itself comes from
 * `useOrderQuery`, which recovers the device-local pointer `placeOrder()`
 * just wrote — that is what makes this work for a guest with no session.
 */
const route = useRoute();

const reference = computed(() => String(route.query.ref ?? "").trim());

const { data: order } = useOrderQuery(reference);

const eyebrow = computed(() =>
  reference.value ? `Order ${reference.value} · Confirmed` : "Order confirmed",
);

const emailLabel = computed(
  () => order.value?.shipping_address.email ?? "your email address",
);

const isTransfer = computed(
  () => order.value?.payment_method === "bank_transfer",
);

const trackTo = computed(() =>
  reference.value ? `/track?ref=${encodeURIComponent(reference.value)}` : "/track",
);

usePageSeo({
  title: "Order confirmed",
  description: "Your order is with us and your piece is being prepared.",
  path: "/order/confirmed",
  robots: "noindex, nofollow",
});
</script>

<style scoped>
.done {
  padding-block: 24px 64px;
}

.done__inner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 24px;
  min-height: 70dvh;
  max-width: 560px;
  margin-inline: auto;
  animation: jbRise 0.8s var(--ease-brand) both;
}

.done__title {
  margin: 0;
  font-size: 36px;
  line-height: 1.05;
  text-wrap: balance;
}

.done__lede {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.done__email {
  color: var(--text-primary);
}

.done__bank {
  margin-top: 4px;
}

.done__actions {
  display: flex;
  gap: 8px;
}

.done__action {
  flex: 1;
}

.done__ref {
  margin: 0;
}
</style>
