<template>
  <AppContainer as="section" class="curated">
    <AppSectionHeader eyebrow="04 / Curated" meta="08 Edits" />

    <div class="curated__list">
      <NuxtLink
        v-for="(edit, i) in EDITS"
        :key="edit.name"
        v-reveal="i"
        class="list-row curated__row"
        :to="edit.to"
      >
        <span class="display-heading curated__name">{{ edit.name }}</span>
        <span class="curated__end">
          <span class="mono-meta">{{ edit.count }}</span>
          <span class="curated__arrow" aria-hidden="true">&rarr;</span>
        </span>
      </NuxtLink>
    </div>
  </AppContainer>
</template>

<script setup lang="ts">
/**
 * The eight curated edits.
 *
 * The prototype's edits are editorial groupings that the catalogue has no
 * route for ("For Her", "Statement Pieces"), so each one lands on the nearest
 * real destination: a `COLLECTIONS` slug, narrowed by a query the catalogue
 * whitelist actually accepts (`filter` and `sort` in `useProducts.ts`). No
 * invented routes.
 *
 * Counts are the prototype's editorial figures, not live totals — they
 * describe the edit, not the grid behind it.
 */
const EDITS = [
  { name: "For Her", count: "48", to: "/jewelry" },
  { name: "For Him", count: "36", to: "/watches" },
  { name: "Everyday Luxury", count: "52", to: "/jewelry?filter=in-stock" },
  { name: "Statement Pieces", count: "19", to: "/jewelry?sort=price-desc" },
  { name: "Gifts", count: "40", to: "/gifts" },
  { name: "Under ₦100,000", count: "27", to: "/jewelry?filter=under" },
  { name: "Moissanite", count: "33", to: "/moissanite" },
  { name: "Luxury Watches", count: "24", to: "/watches?sort=price-desc" },
] as const;
</script>

<style scoped>
.curated {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 64px;
}

.curated__list {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border-default);
}

.curated__row {
  color: var(--text-primary);
}

.curated__name {
  font-size: 20px;
  line-height: 1.2;
}

.curated__end {
  display: flex;
  align-items: center;
  gap: 12px;
}

.curated__arrow {
  color: var(--text-secondary);
}

@media (min-width: 768px) {
  .curated {
    padding-top: 88px;
  }

  /* Two columns of rows on wider canvases — eight rows is a long scroll.
     The opening rule then belongs to the first row of each column, not to the
     list, or the second column would start without one. */
  .curated__list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 48px;
    border-top: 0;
  }

  .curated__row:nth-child(-n + 2) {
    border-top: 1px solid var(--border-default);
  }
}
</style>
