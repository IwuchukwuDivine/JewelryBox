<template>
  <AppContainer as="section" class="tiles">
    <AppSectionHeader eyebrow="01 / The Collection" :meta="linesLabel" />

    <p v-if="isError" class="tiles__error">
      The collection could not be loaded just now. Please refresh.
    </p>

    <div v-else class="tiles__grid">
      <NuxtLink
        v-for="(tile, i) in tiles"
        :key="tile.slug"
        v-reveal="i"
        class="tiles__tile"
        :to="tile.to"
      >
        <NuxtImg
          v-if="tile.image"
          :src="tile.image"
          :alt="tile.alt"
          width="600"
          height="880"
          sizes="xs:50vw sm:50vw md:33vw lg:20vw xl:20vw"
          loading="lazy"
          decoding="async"
          class="tiles__img"
        />
        <div class="tiles__wash" />
        <div class="tiles__caption">
          <span class="display-heading tiles__name">{{ tile.name }}</span>
          <span class="tiles__count">{{ tile.count }} pieces &rarr;</span>
        </div>
      </NuxtLink>
    </div>
  </AppContainer>
</template>

<script setup lang="ts">
import { PRODUCT_CATEGORIES } from "~/utils/constants/catalog";

/*
 * The prototype hardcodes "02 Lines" beside a two-tile grid. We render all
 * five of PRODUCT_CATEGORIES, so the literal would contradict what is on
 * screen — derived from the data instead, in the prototype's padded format.
 */
const linesLabel = computed(
  () => `${String(PRODUCT_CATEGORIES.length).padStart(2, "0")} Lines`,
);

/**
 * The lines of the house, one tile each.
 *
 * Counts and tile photography are read from the catalogue in a single query
 * and bucketed by category — never hard-coded, so a tile can never claim
 * stock the grid behind it does not have.
 */
const { data, isError, suspense } = useProductsQuery({ perPage: 500, page: 1 });

// Server-rendered: the counts are part of the first paint, and the tiles must
// not reflow in after hydration.
await suspense();

const tiles = computed(() =>
  PRODUCT_CATEGORIES.map((category) => {
    const items = (data.value?.items ?? []).filter(
      (product) => product.category === category.value,
    );

    return {
      slug: category.slug,
      name: category.plural,
      to: `/${category.slug}`,
      count: items.length,
      // The first piece in the line stands in for it. Real category
      // photography (`category.heroImage`) lands at Phase F.
      image: items[0]?.images[0] ?? "",
      alt: `${category.plural} — ${category.headline}`,
    };
  }),
);
</script>

<style scoped>
.tiles {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 56px;
}

.tiles__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.tiles__tile {
  position: relative;
  aspect-ratio: 3 / 4.4;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
  background: var(--surface-muted);
  text-decoration: none;
}

.tiles__tile:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

.tiles__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--dur-reveal) var(--ease-brand);
}

.tiles__tile:hover .tiles__img {
  transform: scale(1.03);
}

/* Caption ground. Obsidian in both themes — the bone type on top of it has
   to read over photography, not over the page surface. */
.tiles__wash {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 45%,
    color-mix(in srgb, var(--color-obsidian) 92%, transparent)
  );
}

.tiles__caption {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tiles__name {
  font-size: 24px;
  line-height: 1;
  color: var(--color-bone);
}

.tiles__count {
  font-size: 11px;
  line-height: 1.4;
  color: var(--color-bone-soft);
}

.tiles__error {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-secondary);
}

@media (min-width: 768px) {
  .tiles {
    padding-top: 80px;
  }

  .tiles__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .tiles__grid {
    grid-template-columns: repeat(5, 1fr);
  }
}
</style>
