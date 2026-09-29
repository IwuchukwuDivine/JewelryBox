<template>
  <article class="pcard" :class="{ 'pcard--wide': wide }">
    <div class="pcard__media">
      <NuxtImg
        :src="hero"
        :alt="`${product.brand} ${product.name}`"
        :width="wide ? 800 : 640"
        :height="wide ? 600 : 800"
        sizes="xs:50vw sm:50vw md:33vw lg:25vw xl:25vw"
        loading="lazy"
        decoding="async"
        class="pcard__img"
      />

      <span class="mono-meta pcard__index">{{ indexLabel }}</span>

      <button
        type="button"
        class="pcard__wish"
        :aria-label="saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`"
        :aria-pressed="saved"
        @click="onToggleWish"
      >
        <span class="diamond" :class="{ 'diamond--filled': saved }" />
      </button>

      <button
        v-if="showQuickView"
        type="button"
        class="pcard__quick"
        @click="emit('quickView', product)"
      >
        Quick view
      </button>
    </div>

    <div class="pcard__meta">
      <span class="pcard__brand">{{ product.brand }}</span>

      <NuxtLink class="display-heading pcard__name" :to="`/product/${product.slug}`">
        {{ product.name }}
      </NuxtLink>

      <p class="pcard__prices">
        <span v-if="product.compare_at_ngn" class="price pcard__was">
          {{ formatPrice(product.compare_at_ngn) }}
        </span>
        <span class="price pcard__price">{{ formatPrice(product.price_ngn) }}</span>
      </p>

      <p class="pcard__stock" :class="`pcard__stock--${availability}`">
        <span class="pcard__dot" aria-hidden="true" />
        {{ stockLabel }}
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Product } from "~/utils/types/shop";

/**
 * The catalogue card — the one product tile used by every grid and rail.
 *
 * Stock state comes from `productAvailability()` and nowhere else; the card
 * never re-derives it from `in_stock` or `stock_count`.
 *
 * The whole card is a link to the product, drawn by stretching the name's
 * `::after` over the tile. The wishlist and quick-view controls sit above it
 * in the stacking order so they stay clickable and never navigate.
 */
const props = withDefaults(
  defineProps<{
    product: Product;
    /** Position in the grid — drives the mono index chip. */
    index?: number;
    /** 4/3 rather than 4/5. Used by the full-bleed row in a grid. */
    wide?: boolean;
    showQuickView?: boolean;
  }>(),
  { index: 0, wide: false, showQuickView: true },
);

const emit = defineEmits<{ quickView: [product: Product] }>();

const { has, toggle } = useWishlist();

// Saves are persisted per browser, so they must not render during SSR.
const mounted = useMounted();
const saved = computed(() => mounted.value && has(props.product.id));

const hero = computed(() => props.product.images[0] ?? "");

const indexLabel = computed(() => String(props.index + 1).padStart(2, "0"));

const availability = computed(() => productAvailability(props.product));

const stockLabel = computed(() => {
  switch (availability.value) {
    case "low-stock":
      return `${props.product.stock_count} left`;
    case "made-to-order":
      return "Made to order";
    case "sold":
      return "Sold";
    default:
      return "In stock";
  }
});

const onToggleWish = () => {
  toggle(props.product.id, props.product.slug);
};
</script>

<style scoped>
.pcard {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Media ─────────────────────────────────────────────────────────── */

.pcard__media {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
  background: var(--surface-muted);
}

.pcard--wide .pcard__media {
  aspect-ratio: 4 / 3;
}

.pcard__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--dur-hover) var(--ease-brand);
}

.pcard:hover .pcard__img {
  transform: scale(1.02);
}

/* Chips and controls sit on photography, so their ground is mixed from the
   brand's obsidian rather than a theme surface — it must stay dark in both
   themes for the bone type on it to read. */
.pcard__index {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  padding: 4px 6px;
  font-size: 9px;
  color: var(--color-bone);
  background: color-mix(in srgb, var(--color-obsidian) 55%, transparent);
}

.pcard__wish {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-bone);
  cursor: pointer;
  transition: opacity var(--dur-hover) var(--ease-brand);
}

.pcard__wish:hover {
  opacity: 0.7;
}

.pcard__wish:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: -2px;
}

.pcard__quick {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  z-index: 2;
  padding: 10px;
  border: none;
  border-radius: var(--radius-brand);
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-bone);
  background: color-mix(in srgb, var(--color-obsidian) 72%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  transition: opacity var(--dur-hover) var(--ease-brand);
}

.pcard__quick:hover {
  opacity: 0.82;
}

.pcard__quick:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

/* ── Meta ──────────────────────────────────────────────────────────── */

.pcard__meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pcard__brand {
  font-size: 10px;
  line-height: 1.4;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.pcard__name {
  font-size: 16px;
  line-height: 1.2;
  text-decoration: none;
}

/* The link that makes the whole tile tappable. */
.pcard__name::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
}

.pcard__name:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

.pcard__prices {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0;
}

.pcard__was {
  font-size: 12px;
  color: var(--text-muted);
  text-decoration: line-through;
}

.pcard__price {
  font-size: 14px;
  color: var(--text-primary);
}

.pcard__stock {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-muted);
}

.pcard__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.pcard__stock--in-stock {
  color: var(--color-success);
}

.pcard__stock--low-stock {
  color: var(--color-warning);
}
</style>
