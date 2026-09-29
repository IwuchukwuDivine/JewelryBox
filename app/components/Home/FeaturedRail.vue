<template>
  <section class="edit">
    <AppContainer class="edit__head">
      <AppSectionHeader
        eyebrow="02 / The Watch Edit"
        title="Chosen for the wrist."
        to="/watches"
        link-label="All"
      />
    </AppContainer>

    <p v-if="isError" class="edit__error section-shell">
      The edit could not be loaded just now. Please refresh.
    </p>

    <div v-else class="rail edit__rail">
      <ShopProductCard
        v-for="(product, i) in products"
        :key="product.id"
        class="edit__card"
        :product="product"
        :index="i"
        :show-quick-view="false"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * The watch edit — four featured pieces on a snap rail.
 *
 * Server-rendered, because the rail is the first product content a visitor
 * sees and a skeleton that swaps for real cards after hydration is the layout
 * shift the launch checklist calls out.
 */
const { data, isError, suspense } = useFeaturedQuery(6);

await suspense();

const products = computed(() => data.value ?? []);
</script>

<style scoped>
.edit {
  padding-top: 64px;
}

.edit__head {
  padding-bottom: 18px;
}

/* The rail runs full-bleed, so it cannot inherit `.section-shell`'s centred
   max-width — it reproduces the same effective gutter instead, or the first
   card stops lining up with the heading above 1280px. */
.edit__rail {
  padding-block: 0 4px;
  padding-inline: calc(max(0px, (100% - 1280px) / 2) + 20px);
}

.edit__card {
  flex: 0 0 250px;
}

.edit__error {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-secondary);
}

@media (min-width: 768px) {
  .edit {
    padding-top: 88px;
  }

  .edit__rail {
    padding-inline: calc(max(0px, (100% - 1280px) / 2) + 32px);
  }
}

@media (min-width: 1024px) {
  .edit__rail {
    padding-inline: calc(max(0px, (100% - 1280px) / 2) + 48px);
  }

  .edit__card {
    flex: 0 0 300px;
  }
}
</style>
