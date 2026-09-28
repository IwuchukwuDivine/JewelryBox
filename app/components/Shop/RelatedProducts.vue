<template>
  <section v-if="isPending || products.length" class="related">
    <p class="mono-meta related__title">{{ title }}</p>

    <div v-if="isPending" class="rail related__rail" aria-hidden="true">
      <AppSkeleton
        v-for="n in limit"
        :key="n"
        class="related__placeholder"
        height="240px"
        width="150px"
      />
    </div>

    <ul v-else class="rail related__rail">
      <li v-for="(product, index) in products" :key="product.id">
        <NuxtLink v-reveal="index" class="related__card" :to="`/product/${product.slug}`">
          <NuxtImg
            :src="product.images[0]"
            :alt="product.name"
            class="related__image"
            width="300"
            height="375"
            sizes="150px"
            loading="lazy"
          />

          <span class="related__meta">
            <span class="related__name">{{ product.name }}</span>
            <span class="price related__price">{{ formatPrice(product.price_ngn) }}</span>
          </span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
/**
 * "You may also consider" — the related rail under a product.
 *
 * A snap rail rather than a grid, because it is an aside: the shopper is
 * reading one piece and may glance sideways. Cards are 150px at 4/5, which
 * is the prototype's geometry.
 */
const props = withDefaults(
  defineProps<{
    /** Slug of the piece being viewed. Related is resolved from it. */
    slug: string;
    limit?: number;
    title?: string;
  }>(),
  { limit: 4, title: "You may also consider" },
);

const { data, isPending } = useRelatedQuery(
  () => props.slug,
  () => props.limit,
);

const products = computed(() => data.value ?? []);
</script>

<style scoped>
.related {
  display: flex;
  flex-direction: column;
}

.related__title {
  margin: 0 0 14px;
  padding-inline: 20px;
}

.related__rail {
  margin: 0;
  padding: 0 20px;
  list-style: none;
}

.related__placeholder {
  flex: 0 0 150px;
}

.related__card {
  display: flex;
  flex-direction: column;
  width: 150px;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
  background: var(--surface-muted);
  color: var(--text-primary);
  text-decoration: none;
  transition: border-color var(--dur-hover) var(--ease-brand);
}

.related__card:hover {
  border-color: var(--border-strong);
}

.related__card:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

.related__image {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 5;
  height: auto;
  object-fit: cover;
}

.related__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px;
}

.related__name {
  font-size: 13px;
  line-height: 1.3;
}

.related__price {
  font-size: 12px;
  color: var(--text-secondary);
}

@media (min-width: 768px) {
  .related__title,
  .related__rail {
    padding-inline: 32px;
  }
}

@media (min-width: 1024px) {
  .related__title,
  .related__rail {
    padding-inline: 48px;
  }
}
</style>
