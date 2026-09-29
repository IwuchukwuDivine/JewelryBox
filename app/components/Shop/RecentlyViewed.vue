<template>
  <section v-if="hasAny" class="recent">
    <p class="mono-meta recent__title">{{ title }}</p>

    <ul class="rail recent__rail">
      <li v-for="product in products" :key="product.id">
        <NuxtLink class="recent__card" :to="`/product/${product.slug}`">
          <NuxtImg
            :src="product.images[0]"
            :alt="product.name"
            class="recent__image"
            width="240"
            height="240"
            sizes="120px"
            loading="lazy"
          />

          <span class="recent__name">{{ product.name }}</span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
/**
 * "Recently viewed" — the rail under a collection grid.
 *
 * The slugs live in a persisted store, so `useRecentlyViewed()` reports
 * nothing until mount: the section simply is not there on the server, and
 * appears once the browser's own history is known. That is deliberate —
 * rendering a placeholder for it would reserve space that may never fill.
 */
const props = withDefaults(
  defineProps<{
    /** Slug to leave out — the piece currently on screen. */
    exclude?: string;
    title?: string;
  }>(),
  { title: "Recently viewed" },
);

const { products, hasAny } = useRecentlyViewed(() => props.exclude);
</script>

<style scoped>
.recent {
  display: flex;
  flex-direction: column;
}

.recent__title {
  margin: 0 0 14px;
  padding-inline: 20px;
}

.recent__rail {
  margin: 0;
  padding: 0 20px;
  list-style: none;
}

.recent__card {
  display: flex;
  flex-direction: column;
  width: 120px;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
  background: var(--surface-muted);
  color: var(--text-primary);
  text-decoration: none;
  transition: border-color var(--dur-hover) var(--ease-brand);
}

.recent__card:hover {
  border-color: var(--border-strong);
}

.recent__card:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

.recent__image {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  height: auto;
  object-fit: cover;
}

.recent__name {
  padding: 8px;
  font-size: 12px;
  line-height: 1.3;
}

@media (min-width: 768px) {
  .recent__title,
  .recent__rail {
    padding-inline: 32px;
  }
}

@media (min-width: 1024px) {
  .recent__title,
  .recent__rail {
    padding-inline: 48px;
  }
}
</style>
