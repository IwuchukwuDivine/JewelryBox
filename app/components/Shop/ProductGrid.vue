<template>
  <div class="pgrid">
    <template v-if="loading">
      <div v-for="n in SKELETON_COUNT" :key="`sk-${n}`" class="pgrid__item">
        <AppSkeleton class="pgrid__skeleton-media" />
        <AppSkeleton variant="text" width="40%" height="10px" />
        <AppSkeleton variant="text" width="75%" height="16px" />
        <AppSkeleton variant="text" width="35%" height="14px" />
      </div>
    </template>

    <template v-else>
      <div
        v-for="(product, i) in products"
        :key="product.id"
        class="pgrid__item"
        :class="{ 'pgrid__item--wide': isWide(i) }"
      >
        <ShopProductCard
          :product="product"
          :index="i"
          :wide="isWide(i)"
          :show-quick-view="showQuickView"
          @quick-view="emit('quickView', $event)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Product } from "~/utils/types/shop";

/**
 * The catalogue grid. Two columns on the 390px canvas, three at `md`, four at
 * `lg` — the 20px/8px gap pair is the prototype's.
 *
 * No `v-reveal` in here, deliberately: the directive is registered by a
 * client-only plugin, so it never resolves during SSR. Vue tolerates that in
 * the vnode render path (`withDirectives` skips an undefined directive) but
 * throws in the string path (`ssrGetDirectiveProps`) — and this component's
 * plain `<div>` root puts all of its children on the string path. Reveal the
 * grid from the page if it needs it.
 *
 * `wideEveryFifth` is the editorial rhythm from the category screen: on the
 * narrow canvas every fifth piece runs the full width at 4/3, which breaks up
 * a long column of identical tiles. From `md` up there are enough columns that
 * the trick is unnecessary, so the row folds back into a normal cell.
 */
const props = withDefaults(
  defineProps<{
    products: Product[];
    loading?: boolean;
    wideEveryFifth?: boolean;
    showQuickView?: boolean;
  }>(),
  { loading: false, wideEveryFifth: false, showQuickView: true },
);

const emit = defineEmits<{ quickView: [product: Product] }>();

const SKELETON_COUNT = 6;

const isWide = (index: number) => props.wideEveryFifth && index % 5 === 0;
</script>

<style scoped>
.pgrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 8px;
}

.pgrid__item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.pgrid__item--wide {
  grid-column: 1 / -1;
}

.pgrid__skeleton-media {
  aspect-ratio: 4 / 5;
  height: auto;
}

@media (min-width: 768px) {
  .pgrid {
    grid-template-columns: repeat(3, 1fr);
  }

  /* Enough columns that the full-bleed row is no longer needed. */
  .pgrid__item--wide {
    grid-column: auto;
  }

  .pgrid__item--wide :deep(.pcard--wide .pcard__media) {
    aspect-ratio: 4 / 5;
  }
}

@media (min-width: 1024px) {
  .pgrid {
    grid-template-columns: repeat(4, 1fr);
    gap: 28px 16px;
  }
}
</style>
