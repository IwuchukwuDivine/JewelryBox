<template>
  <AppContainer as="main" class="wish">
    <header class="wish__head">
      <div class="wish__heading">
        <p class="mono-meta">Saved · {{ mounted ? count : 0 }}</p>
        <h1 class="display-heading wish__title">Wishlist</h1>
      </div>

      <AppChip class="wish__share" @click="share">Share</AppChip>
    </header>

    <!-- Saved ids live in localStorage; they are not knowable on the server. -->
    <div v-if="loading" class="wish__grid">
      <div v-for="n in 2" :key="n" class="luxe-card wish__card">
        <AppSkeleton width="96px" height="116px" />
        <div class="wish__body">
          <AppSkeleton variant="text" width="34%" />
          <AppSkeleton variant="text" width="76%" />
          <AppSkeleton variant="text" width="28%" />
          <AppSkeleton height="40px" />
        </div>
      </div>
    </div>

    <AppEmptyState
      v-else-if="!products.length"
      title="Keep the pieces you love close."
      message="Tap the diamond on any piece to save it here."
    >
      <AppButton to="/">Explore the Collection</AppButton>
    </AppEmptyState>

    <div v-else class="wish__grid">
      <article
        v-for="(product, index) in products"
        :key="product.id"
        v-reveal="index"
        class="luxe-card wish__card"
      >
        <NuxtLink class="wish__media" :to="`/product/${product.slug}`">
          <NuxtImg
            :src="cover(product)"
            :alt="product.name"
            width="96"
            height="116"
            fit="cover"
            loading="lazy"
          />
        </NuxtLink>

        <div class="wish__body">
          <p class="mono-meta">{{ product.brand }}</p>

          <NuxtLink class="display-heading wish__name" :to="`/product/${product.slug}`">
            {{ product.name }}
          </NuxtLink>

          <p class="price wish__price">{{ formatPrice(product.price_ngn) }}</p>

          <p class="wish__avail" :class="`wish__avail--${productAvailability(product)}`">
            {{ availabilityLabel(product) }}
          </p>

          <div class="wish__actions">
            <AppButton
              size="sm"
              class="wish__add"
              :disabled="productAvailability(product) === 'sold'"
              @click="addToBag(product)"
            >
              Add to Bag
            </AppButton>

            <AppButton size="sm" variant="outline" @click="remove(product.id)">
              Remove
            </AppButton>
          </div>
        </div>
      </article>
    </div>
  </AppContainer>
</template>

<script setup lang="ts">
import type { Product } from "~/utils/types/shop";

/**
 * Saved pieces, as horizontal cards rather than the product grid — a saved
 * piece is a decision waiting to be made, so each one carries its price, its
 * stock state and the two actions that resolve it.
 */
const mounted = useMounted();
const { ids, count, remove } = useWishlist();
const { add } = useCart();

const { data, isPending } = useProductsByIdsQuery(ids);
const products = computed(() => data.value ?? []);

/**
 * A disabled vue-query is still `pending`, so an empty wishlist would sit on
 * skeletons forever — the saved ids have to gate it, not the query alone.
 */
const loading = computed(
  () => !mounted.value || (ids.value.length > 0 && isPending.value),
);

const cover = (product: Product): string => product.images[0] ?? "";

/**
 * `productAvailability()` decides the state; this only words it. The colour
 * mapping is the prototype's: in stock reads success, made to order is a fact
 * rather than a warning, and anything scarce or gone is flagged.
 */
const availabilityLabel = (product: Product): string => {
  switch (productAvailability(product)) {
    case "sold":
      return "Sold";
    case "made-to-order":
      return "Made to order";
    case "low-stock":
      return product.stock_count === 1 ? "1 left" : `${product.stock_count} left`;
    default:
      return "In stock";
  }
};

const addToBag = (product: Product) => {
  add(product);
  useToast("success", `${product.name} is in your bag.`);
};

const share = async () => {
  await copy(getAbsoluteUrl("/wishlist"), "Wishlist link copied");
};

usePageSeo({
  title: "Wishlist",
  description:
    "The pieces you have saved. Watches, fine jewelry and moissanite held for when you are ready.",
  path: "/wishlist",
  // One person's saves. Nothing to index, and nothing stable to index either.
  robots: "noindex, follow",
});
</script>

<style scoped>
.wish {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-block: 24px 64px;
}

.wish__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.wish__heading {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wish__title {
  margin: 0;
  font-size: 36px;
  line-height: 1;
}

.wish__share {
  flex: 0 0 auto;
}

.wish__grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wish__card {
  display: flex;
  gap: 14px;
  padding: 12px;
}

.wish__media {
  flex: 0 0 96px;
  display: block;
  overflow: hidden;
  border-radius: var(--radius-brand);
}

.wish__media :deep(img) {
  display: block;
  width: 96px;
  height: 116px;
  object-fit: cover;
}

.wish__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.wish__name {
  font-size: 17px;
  line-height: 1.2;
  color: var(--text-primary);
  text-decoration: none;
  transition: opacity var(--dur-hover) var(--ease-brand);
}

.wish__name:hover {
  opacity: 0.7;
}

.wish__price {
  margin: 0;
  font-size: 14px;
}

.wish__avail {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted);
}

.wish__avail--in-stock {
  color: var(--color-success);
}

.wish__avail--low-stock {
  color: var(--color-warning);
}

.wish__avail--sold {
  color: var(--color-error);
}

.wish__actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
}

.wish__add {
  flex: 1;
}

@media (min-width: 768px) {
  .wish__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
}
</style>
