<template>
  <AppContainer as="main" class="bag">
    <AppBreadcrumbs :items="crumbs" />

    <header class="bag__head">
      <p v-if="mounted" class="mono-meta">Bag · {{ count }}</p>
      <h1 class="display-heading bag__title">Your bag</h1>
    </header>

    <!-- The bag is persisted in localStorage, so it cannot be rendered on the
         server. Hold its shape until mount rather than reflowing into it. -->
    <div v-if="!mounted" class="bag__layout">
      <div class="bag__lines">
        <div v-for="n in 2" :key="n" class="bag__placeholder">
          <AppSkeleton width="84px" height="104px" />
          <div class="bag__placeholder-body">
            <AppSkeleton variant="text" width="30%" />
            <AppSkeleton variant="text" width="72%" />
            <AppSkeleton variant="text" width="26%" />
          </div>
        </div>
      </div>
      <div class="bag__aside">
        <AppSkeleton height="248px" />
      </div>
    </div>

    <AppEmptyState
      v-else-if="isEmpty"
      title="Nothing here yet."
      message="Perhaps something caught your eye?"
    >
      <AppButton to="/">Explore the Collection</AppButton>
    </AppEmptyState>

    <div v-else class="bag__layout">
      <section class="bag__lines" aria-label="Pieces in your bag">
        <p class="display-heading bag__lede">Your collection is taking shape.</p>

        <ul class="bag__list">
          <li
            v-for="(line, index) in items"
            :key="cartLineKey(line)"
            v-reveal="index"
            class="bag__item"
          >
            <CartLineItem :line="line" />
          </li>
        </ul>

        <div class="bag__tools">
          <button type="button" class="text-link" @click="clearOpen = true">
            Clear bag
          </button>
        </div>
      </section>

      <aside class="bag__aside" aria-label="Order summary">
        <div class="luxe-card bag__summary">
          <h2 class="mono-meta bag__summary-title">Summary</h2>

          <div class="bag__row">
            <span class="bag__label">Subtotal</span>
            <span class="price bag__value">{{ formatPrice(subtotal) }}</span>
          </div>

          <p class="bag__note">Delivery calculated at checkout.</p>

          <hr class="hairline">

          <div class="bag__row">
            <span class="bag__label bag__label--total">Total</span>
            <span class="price bag__total">{{ formatPrice(subtotal) }}</span>
          </div>

          <AppButton block size="lg" to="/checkout">Checkout</AppButton>

          <AppButton variant="text" to="/" class="bag__continue">
            Continue shopping
          </AppButton>
        </div>
      </aside>
    </div>

    <AppModal v-model="clearOpen" title="Clear your bag?" size="sm">
      <p class="bag__confirm">
        Every piece comes out of the bag. Anything you saved stays in your
        wishlist.
      </p>

      <template #actions="{ close }">
        <AppButton variant="outline" size="sm" @click="close">
          Keep them
        </AppButton>
        <AppButton size="sm" @click="clearBag(close)">Clear bag</AppButton>
      </template>
    </AppModal>
  </AppContainer>
</template>

<script setup lang="ts">
/**
 * The bag at page scale — the same vocabulary as the drawer, given room.
 * Line items are `<CartLineItem>`, exactly as in `Layout/CartDrawer.vue`;
 * this page adds the trail, the summary card and the clear confirmation.
 */
const mounted = useMounted();
const { items, count, subtotal, isEmpty, clear } = useCart();

const crumbs = [{ label: "Home", to: "/" }, { label: "Bag" }];

const clearOpen = ref(false);

const clearBag = (close: () => void) => {
  clear();
  close();
  useToast("success", "Bag cleared.");
};

usePageSeo({
  title: "Your Bag",
  description:
    "The pieces you are ready to take home. Bank transfer or pay on delivery, insured delivery across Nigeria.",
  path: "/cart",
  // A bag is one person's private state; there is nothing here to index.
  robots: "noindex, follow",
});
</script>

<style scoped>
.bag {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-block: 24px 64px;
}

.bag__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bag__title {
  margin: 0;
  font-size: clamp(28px, 6vw, 36px);
  line-height: 1.05;
}

.bag__layout {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.bag__lines {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.bag__lede {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
}

.bag__list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.bag__item {
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-default);
}

.bag__item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.bag__tools {
  display: flex;
  justify-content: flex-start;
}

/* ── Pre-hydration shape ─────────────────────────────────────────────── */

.bag__placeholder {
  display: flex;
  gap: 14px;
  padding-bottom: 24px;
}

.bag__placeholder-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

/* ── Summary ─────────────────────────────────────────────────────────── */

.bag__aside {
  min-width: 0;
}

.bag__summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
}

.bag__summary-title {
  margin: 0 0 4px;
}

.bag__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.bag__label {
  font-size: 13px;
  color: var(--text-secondary);
}

.bag__label--total {
  color: var(--text-primary);
}

.bag__value {
  font-size: 14px;
}

.bag__total {
  font-size: 18px;
  color: var(--text-primary);
}

.bag__note {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.bag__continue {
  align-self: center;
  margin-top: 4px;
}

.bag__confirm {
  margin: 0;
}

@media (min-width: 1024px) {
  .bag__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 48px;
    align-items: start;
  }

  .bag__aside {
    position: sticky;
    /* Clears the glass header without a magic number of its own. */
    top: calc(80px + var(--top));
  }
}
</style>
