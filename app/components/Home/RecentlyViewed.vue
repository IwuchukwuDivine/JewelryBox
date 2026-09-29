<template>
  <section v-if="hasAny" class="recent">
    <AppContainer class="recent__head">
      <AppSectionHeader eyebrow="05 / Seen" title="Recently viewed" size="sm" />
    </AppContainer>

    <div class="rail recent__rail">
      <ShopProductCard
        v-for="(product, i) in products"
        :key="product.id"
        class="recent__card"
        :product="product"
        :index="i"
        :show-quick-view="false"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * What this browser has already looked at.
 *
 * The store is persisted, so `useRecentlyViewed()` reports nothing until the
 * page has mounted — which is why the whole section is absent from the server
 * render rather than rendered empty.
 */
const { products, hasAny } = useRecentlyViewed();
</script>

<style scoped>
.recent {
  padding-top: 64px;
}

.recent__head {
  padding-bottom: 18px;
}

/* Full-bleed, so it restates `.section-shell`'s gutter. See FeaturedRail. */
.recent__rail {
  padding-block: 0 4px;
  padding-inline: calc(max(0px, (100% - 1280px) / 2) + 20px);
}

.recent__card {
  flex: 0 0 180px;
}

@media (min-width: 768px) {
  .recent {
    padding-top: 88px;
  }

  .recent__rail {
    padding-inline: calc(max(0px, (100% - 1280px) / 2) + 32px);
  }

  .recent__card {
    flex: 0 0 220px;
  }
}

@media (min-width: 1024px) {
  .recent__rail {
    padding-inline: calc(max(0px, (100% - 1280px) / 2) + 48px);
  }
}
</style>
