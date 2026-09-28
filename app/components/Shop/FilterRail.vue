<template>
  <aside class="filter-rail" aria-label="Refine the collection">
    <div class="filter-rail__group">
      <p id="filter-rail-refine" class="caption filter-rail__heading">Refine</p>

      <div class="filter-rail__stack" role="group" aria-labelledby="filter-rail-refine">
        <button
          v-for="option in FILTER_OPTIONS"
          :key="option.value"
          type="button"
          class="chip filter-rail__chip"
          :class="{ 'chip--active': option.value === filter }"
          :aria-pressed="option.value === filter"
          @click="emit('update:filter', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <hr class="hairline">

    <div class="filter-rail__group">
      <p id="filter-rail-sort" class="caption filter-rail__heading">Sort</p>

      <div class="filter-rail__stack" role="group" aria-labelledby="filter-rail-sort">
        <button
          v-for="option in SORT_OPTIONS"
          :key="option.value"
          type="button"
          class="chip filter-rail__chip"
          :class="{ 'chip--active': option.value === sort }"
          :aria-pressed="option.value === sort"
          @click="emit('update:sort', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { ProductFilter, ProductSort } from "~/utils/types/shop";

/**
 * The desktop filter column, from `lg` up.
 *
 * Invented — the prototype is a 390px canvas and has no rail at all. So it
 * stays deliberately plain: the same chip vocabulary as the mobile bar,
 * stacked rather than scrolled, under `.caption` headings. Nothing new is
 * introduced here that the mobile row does not already say.
 *
 * Controlled, like ShopFilterBar: the page owns the route.
 */
defineProps<{
  filter: ProductFilter;
  sort: ProductSort;
}>();

const emit = defineEmits<{
  "update:filter": [filter: ProductFilter];
  "update:sort": [sort: ProductSort];
}>();
</script>

<style scoped>
.filter-rail {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: sticky;
  /* Header (56) + the sticky filter bar above the grid. */
  top: 124px;
}

.filter-rail__group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-rail__heading {
  margin: 0;
}

.filter-rail__stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

/* Stacked chips read as a list, so they share one left edge and one width. */
.filter-rail__chip {
  width: 100%;
  text-align: left;
}
</style>
