<template>
  <article
    class="luxe-card address-card"
    :class="{ 'address-card--default': address.is_default }"
  >
    <p v-if="address.is_default" class="mono-meta address-card__default">Default</p>

    <p class="address-card__name">{{ address.full_name }}</p>

    <p class="address-card__lines">
      {{ street }}<br>
      {{ region }} · {{ address.phone }}
    </p>
  </article>
</template>

<script setup lang="ts">
import type { Address } from "~/utils/types/shop";

/**
 * A saved delivery address.
 *
 * The default one is framed in champagne and says so — everything else is
 * identical, because an address is read, not compared.
 */
const props = defineProps<{
  address: Address & { id: string; is_default: boolean };
}>();

const street = computed(() =>
  [props.address.line1, props.address.line2, props.address.area]
    .filter(Boolean)
    .join(", "),
);

const region = computed(() =>
  [props.address.city, props.address.state].filter(Boolean).join(", "),
);
</script>

<style scoped>
.address-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  background: var(--surface-elevated);
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.address-card--default {
  border-color: var(--accent);
}

.address-card__default {
  margin: 0 0 2px;
  color: var(--accent);
}

.address-card__name {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
}

.address-card__lines {
  margin: 0;
}
</style>
