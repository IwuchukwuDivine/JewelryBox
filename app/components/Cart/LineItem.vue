<template>
  <article class="line">
    <NuxtLink v-if="!readonly" class="line__media" :to="`/product/${line.slug}`">
      <NuxtImg :src="line.image" :alt="line.name" width="84" height="104" fit="cover" loading="lazy" />
    </NuxtLink>
    <div v-else class="line__media">
      <NuxtImg :src="line.image" :alt="line.name" width="84" height="104" fit="cover" loading="lazy" />
    </div>

    <div class="line__body">
      <p class="mono-meta">{{ line.brand }}</p>

      <component
        :is="readonly ? 'p' : resolveComponent('NuxtLink')"
        class="display-heading line__name"
        :to="readonly ? undefined : `/product/${line.slug}`"
      >
        {{ line.name }}
      </component>

      <p v-if="line.variant_label" class="line__variant">{{ line.variant_label }}</p>

      <p class="price line__price">{{ formatPrice(line.price_ngn) }}</p>

      <div v-if="!readonly" class="line__actions">
        <AppQuantityStepper
          :model-value="line.quantity"
          @update:model-value="setQuantity(key, $event)"
        />
        <button class="line__remove" type="button" @click="remove(key)">Remove</button>
      </div>
      <p v-else class="mono-meta">Qty {{ line.quantity }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { CartLine } from "~/utils/types/shop";

const props = withDefaults(
  defineProps<{
    line: CartLine;
    /** Order items reuse this component with the controls stripped out. */
    readonly?: boolean;
  }>(),
  { readonly: false },
);

const { setQuantity, remove } = useCart();

const key = computed(() => cartLineKey(props.line));
</script>

<style scoped>
.line {
  display: flex;
  gap: 14px;
}

.line__media {
  flex: 0 0 84px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
  overflow: hidden;
}

.line__media :deep(img) {
  display: block;
  width: 100%;
  height: 104px;
  object-fit: cover;
}

.line__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.line__name {
  margin: 0;
  font-size: 16px;
  line-height: 1.2;
  color: var(--text-primary);
  text-decoration: none;
}

.line__variant {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.line__price {
  margin: 0;
  font-size: 14px;
}

.line__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding-top: 8px;
}

.line__remove {
  padding: 0;
  border: none;
  background: none;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--dur-hover) var(--ease-brand);
}

.line__remove:hover {
  color: var(--text-primary);
}
</style>
