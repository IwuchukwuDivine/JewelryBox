<template>
  <nav v-if="totalPages > 1" class="pager" aria-label="Pagination">
    <button
      type="button"
      class="pager__arrow"
      :disabled="current <= 1"
      aria-label="Previous page"
      @click="go(current - 1)"
    >
      <lucide-chevron-left :size="14" :stroke-width="1.5" />
    </button>

    <ol class="pager__list">
      <li v-for="(item, index) in pageItems" :key="`${index}-${item}`">
        <span v-if="item === ELLIPSIS" class="pager__gap" aria-hidden="true">
          {{ ELLIPSIS }}
        </span>
        <button
          v-else
          type="button"
          class="chip"
          :class="{ 'chip--active': item === current }"
          :aria-current="item === current ? 'page' : undefined"
          :aria-label="`Page ${item}`"
          @click="go(item as number)"
        >
          {{ item }}
        </button>
      </li>
    </ol>

    <button
      type="button"
      class="pager__arrow"
      :disabled="current >= totalPages"
      aria-label="Next page"
      @click="go(current + 1)"
    >
      <lucide-chevron-right :size="14" :stroke-width="1.5" />
    </button>
  </nav>
</template>

<script setup lang="ts">
/**
 * Page walker for the collection grid and order history.
 *
 * Numbers borrow the `.chip` vocabulary so pagination reads as the same
 * family as the filter row. Seven or fewer pages are listed whole; past
 * that the window is three wide and stays three wide at both ends, so the
 * control never changes width as you walk it.
 */
const ELLIPSIS = "…" as const;

const props = defineProps<{ page: number; totalPages: number }>();
const emit = defineEmits<{ "update:page": [page: number] }>();

const current = computed(() =>
  Math.min(Math.max(props.page, 1), Math.max(props.totalPages, 1)),
);

const pageItems = computed<(number | typeof ELLIPSIS)[]>(() => {
  const total = props.totalPages;
  if (total <= 1) return [];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  let start = current.value - 1;
  let end = current.value + 1;

  // Clamp the window inside the interior so it keeps its three slots.
  if (start < 2) {
    start = 2;
    end = 4;
  }
  if (end > total - 1) {
    end = total - 1;
    start = total - 3;
  }

  const items: (number | typeof ELLIPSIS)[] = [1];
  if (start > 2) items.push(ELLIPSIS);
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < total - 1) items.push(ELLIPSIS);
  items.push(total);
  return items;
});

function go(page: number) {
  const next = Math.min(Math.max(page, 1), props.totalPages);
  if (next !== props.page) emit("update:page", next);
}
</script>

<style scoped>
.pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.pager__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pager__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    color var(--dur-hover) var(--ease-brand),
    border-color var(--dur-hover) var(--ease-brand),
    opacity var(--dur-hover) var(--ease-brand);
}

.pager__arrow:hover:not(:disabled) {
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.pager__arrow:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pager__arrow:focus-visible,
.chip:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

.pager__gap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1;
  color: var(--text-muted);
}
</style>
