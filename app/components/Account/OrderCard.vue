<template>
  <NuxtLink class="luxe-card order-card" :to="`/order/${order.order_number}`">
    <NuxtImg
      v-if="cover"
      :src="cover"
      alt=""
      width="56"
      height="64"
      fit="cover"
      loading="lazy"
      class="order-card__image"
    />
    <span v-else class="order-card__image order-card__image--blank" aria-hidden="true" />

    <span class="order-card__body">
      <span class="mono-meta">{{ order.order_number }} · {{ placed }}</span>
      <span class="order-card__name">{{ headline }}</span>
      <span class="order-card__status" :class="`order-card__status--${status.tone}`">
        <span aria-hidden="true">●</span> {{ status.customerLabel }}
      </span>
    </span>

    <span class="price order-card__total">{{ formatPrice(order.total_ngn) }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { Order } from "~/utils/types/shop";

/**
 * One order, as it appears on the account.
 *
 * The status colour is not chosen here: `statusDefinition()` carries the tone
 * for every status in the lifecycle, and the class below only spends it on a
 * semantic token. A second mapping in this file would be a second truth.
 */
const props = defineProps<{ order: Order }>();

const status = computed(() => statusDefinition(props.order.status));

const cover = computed(() => props.order.items[0]?.image ?? "");

const placed = computed(() => formatDate(props.order.created_at));

/** The first piece names the order; the rest are counted. */
const headline = computed(() => {
  const [first, ...rest] = props.order.items;
  if (!first) return "Order";
  return rest.length ? `${first.name} + ${rest.length} more` : first.name;
});
</script>

<style scoped>
.order-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: var(--surface-elevated);
  color: var(--text-primary);
  text-decoration: none;
  transition: border-color var(--dur-hover) var(--ease-brand);
}

.order-card:hover {
  border-color: var(--border-strong);
}

.order-card:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

.order-card__image {
  flex: 0 0 auto;
  display: block;
  width: 56px;
  height: 64px;
  object-fit: cover;
}

.order-card__image--blank {
  background: var(--surface-muted);
}

.order-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.order-card__name {
  font-size: 14px;
  line-height: 1.3;
}

.order-card__status {
  font-size: 12px;
  line-height: 1;
  color: var(--text-secondary);
}

.order-card__status--neutral {
  color: var(--text-secondary);
}
.order-card__status--info {
  color: var(--color-info);
}
.order-card__status--success {
  color: var(--color-success);
}
.order-card__status--warning {
  color: var(--color-warning);
}
.order-card__status--error {
  color: var(--color-error);
}

.order-card__total {
  flex: 0 0 auto;
  font-size: 13px;
}
</style>
