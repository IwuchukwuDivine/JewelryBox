<template>
  <AppSheet v-model="cartOpen" side="right" :title="`Your bag · ${count}`">
    <div v-if="isEmpty" class="bag__empty">
      <AppEmptyState
        title="Nothing here yet."
        message="Perhaps something caught your eye?"
      >
        <AppButton to="/" @click="closeAll">Explore the Collection</AppButton>
      </AppEmptyState>
    </div>

    <div v-else class="bag">
      <p class="display-heading bag__lede">Your collection is taking shape.</p>

      <ul class="bag__list">
        <li v-for="line in items" :key="cartLineKey(line)" class="bag__item">
          <CartLineItem :line="line" />
        </li>
      </ul>
    </div>

    <template #footer>
      <div v-if="!isEmpty" class="bag__foot">
        <div class="bag__row">
          <span class="bag__label">Subtotal</span>
          <span class="price bag__total">{{ formatPrice(subtotal) }}</span>
        </div>
        <p class="bag__note">Delivery calculated at checkout.</p>
        <AppButton block size="lg" to="/checkout" @click="closeAll">Checkout</AppButton>
      </div>
    </template>
  </AppSheet>
</template>

<script setup lang="ts">
const { cartOpen, closeAll } = useOverlays();
const { items, count, subtotal, isEmpty } = useCart();

// A navigation out of the drawer should not leave it hanging open.
const route = useRoute();
watch(() => route.fullPath, closeAll);
</script>

<style scoped>
.bag {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bag__lede {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
}

.bag__list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.bag__item {
  animation: jbRise 0.5s var(--ease-brand) both;
}

.bag__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50dvh;
}

.bag__foot {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bag__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.bag__label {
  font-size: 13px;
  color: var(--text-secondary);
}

.bag__total {
  font-size: 16px;
  color: var(--text-primary);
}

.bag__note {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}
</style>
