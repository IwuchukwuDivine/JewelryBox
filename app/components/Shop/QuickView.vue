<template>
  <AppSheet
    :model-value="modelValue"
    title="Quick view"
    side="bottom"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="product" class="quick-view">
      <NuxtImg
        :src="product.images[0]"
        :alt="product.name"
        class="quick-view__image"
        width="120"
        height="150"
        sizes="120px"
      />

      <div class="quick-view__body">
        <span class="mono-meta">{{ product.brand }}</span>

        <p class="display-heading quick-view__name">{{ product.name }}</p>

        <span class="price quick-view__price">{{ formatPrice(product.price_ngn) }}</span>

        <span class="quick-view__availability" :style="{ color: availabilityColour }">
          ● {{ availabilityLabel }}
        </span>

        <p class="quick-view__blurb">{{ blurb }}</p>
      </div>
    </div>

    <template #footer>
      <div v-if="product" class="quick-view__actions">
        <AppButton class="quick-view__action" variant="solid" @click="addToBag">
          Add to Bag
        </AppButton>

        <AppButton
          class="quick-view__action"
          variant="outline"
          :to="`/product/${product.slug}`"
          @click="close"
        >
          View Piece →
        </AppButton>
      </div>
    </template>
  </AppSheet>
</template>

<script setup lang="ts">
import type { Availability, Product } from "~/utils/types/shop";

/**
 * The quick-view tray — the bottom `AppSheet`.
 *
 * Opened from a product card's `quickView` emit on a collection grid. It is
 * deliberately thin: one frame, the brand, the name, the price, the stock
 * state and the opening sentence, then the two decisions a shopper actually
 * wants from a grid — add it, or go and read the whole thing.
 */
const props = defineProps<{
  modelValue: boolean;
  product: Product | null;
}>();

const emit = defineEmits<{ "update:modelValue": [open: boolean] }>();

const { add } = useCart();

const AVAILABILITY_LABEL: Record<Availability, string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  "made-to-order": "Made to order",
  sold: "Sold out",
};

const AVAILABILITY_COLOUR: Record<Availability, string> = {
  "in-stock": "var(--color-success)",
  "low-stock": "var(--color-warning)",
  "made-to-order": "var(--color-info)",
  sold: "var(--text-muted)",
};

const availability = computed<Availability>(() =>
  props.product ? productAvailability(props.product) : "sold",
);

const availabilityLabel = computed(() => AVAILABILITY_LABEL[availability.value]);
const availabilityColour = computed(() => AVAILABILITY_COLOUR[availability.value]);

/** The first sentence only — the tray is a glance, not the description. */
const blurb = computed(() => {
  const text = props.product?.description?.trim() ?? "";
  return text.split(/(?<=[.!?])\s+/)[0] ?? text;
});

const close = () => emit("update:modelValue", false);

const addToBag = () => {
  const product = props.product;
  if (!product) return;
  add(product, 1);
  useToast("success", `${product.name} added to your bag.`);
  close();
};
</script>

<style scoped>
.quick-view {
  display: flex;
  gap: 14px;
}

.quick-view__image {
  flex: 0 0 auto;
  width: 120px;
  height: 150px;
  object-fit: cover;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
}

.quick-view__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quick-view__name {
  margin: 0;
  font-size: 22px;
  line-height: 1.1;
}

.quick-view__price {
  font-size: 16px;
}

.quick-view__availability {
  font-size: 11px;
}

.quick-view__blurb {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.quick-view__actions {
  display: flex;
  gap: 8px;
}

.quick-view__action {
  flex: 1;
}
</style>
