<template>
  <div class="filter-bar glass-bar">
    <div class="filter-bar__inner">
      <!-- Row 1 — the chip row. Mobile truth; replaced by ShopFilterRail at lg. -->
      <div class="filter-bar__chips" role="group" aria-label="Filter pieces">
        <button
          v-for="option in FILTER_OPTIONS"
          :key="option.value"
          type="button"
          class="chip"
          :class="{ 'chip--active': option.value === filter }"
          :aria-pressed="option.value === filter"
          @click="emit('update:filter', option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <!-- Row 2 — the count against the sort. -->
      <div class="filter-bar__meta">
        <span class="mono-meta" aria-live="polite">{{ countLabel }}</span>

        <label class="filter-bar__sort">
          <span class="sr-only">Sort pieces by</span>
          <span class="mono-meta filter-bar__sort-label" aria-hidden="true">
            Sort &middot; {{ sortLabel }}
          </span>
          <select class="filter-bar__select" :value="sort" @change="onSort">
            <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">
              Sort · {{ option.label }}
            </option>
          </select>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductFilter, ProductSort } from "~/utils/types/shop";

/**
 * The sticky filter bar over a collection grid.
 *
 * Sits at `top: 56px` — directly under the header — on `--z-sticky`, so the
 * header always wins and the buy bar always wins over both.
 *
 * Entirely controlled: it reads the filter and sort it was handed and emits
 * the change. The page owns the route, because on this storefront the route
 * IS the filter state.
 */
const props = defineProps<{
  filter: ProductFilter;
  sort: ProductSort;
  total: number;
}>();

const emit = defineEmits<{
  "update:filter": [filter: ProductFilter];
  "update:sort": [sort: ProductSort];
}>();

const countLabel = computed(() => `${props.total} ${props.total === 1 ? "piece" : "pieces"}`);

/** What the visible label shows, since the real `<select>` is transparent. */
const sortLabel = computed(
  () => SORT_OPTIONS.find((o) => o.value === props.sort)?.label ?? SORT_OPTIONS[0]!.label,
);

const onSort = (event: Event) => {
  emit("update:sort", (event.target as HTMLSelectElement).value as ProductSort);
};
</script>

<style scoped>
.filter-bar {
  position: sticky;
  top: 56px;
  z-index: var(--z-sticky);
  border-bottom: 1px solid var(--border-default);
}

.filter-bar__inner {
  display: flex;
  flex-direction: column;
  max-width: 1280px;
  margin-inline: auto;
}

.filter-bar__chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 12px 20px 0;
}

.filter-bar__chips::-webkit-scrollbar {
  display: none;
}

.filter-bar__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 20px 12px;
}

.filter-bar__sort {
  position: relative;
  display: flex;
  align-items: center;
}

.filter-bar__sort-label {
  display: block;
  padding: 6px 0;
  color: var(--text-primary);
  text-align: right;
  pointer-events: none;
}

/*
 * The native `<select>` is transparent and laid over the label above.
 *
 * It has to read 16px or iOS Safari zooms the viewport the moment it is
 * focused, and never zooms back — but this bar's design calls for a 10px mono
 * label. So the visible text is the span and the real control sits invisibly
 * on top at a size iOS accepts. The native picker is still what opens, which
 * is the right control on a phone.
 */
.filter-bar__select {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  appearance: none;
  border: none;
  background: none;
  font-size: 16px;
  opacity: 0;
  cursor: pointer;
}

/* The control is invisible, so the focus ring goes on what is visible. */
.filter-bar__sort:focus-within {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

@media (min-width: 768px) {
  .filter-bar__chips {
    padding-inline: 32px;
  }

  .filter-bar__meta {
    padding-inline: 32px;
  }
}

/* At lg the vocabulary moves into ShopFilterRail beside the grid. */
@media (min-width: 1024px) {
  .filter-bar__chips {
    display: none;
  }

  .filter-bar__meta {
    padding: 14px 48px;
  }

  /* The sort moves into the rail at this width; one control, not two. */
  .filter-bar__sort {
    display: none;
  }
}
</style>
