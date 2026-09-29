<template>
  <nav aria-label="Breadcrumb" class="crumbs">
    <ol class="crumbs__list">
      <li v-for="(item, index) in items" :key="`${index}-${item.label}`" class="crumbs__item">
        <NuxtLink
          v-if="item.to && index < items.length - 1"
          :to="item.to"
          class="crumbs__link"
        >
          {{ item.label }}
        </NuxtLink>
        <span v-else-if="index < items.length - 1" class="crumbs__step">
          {{ item.label }}
        </span>
        <span v-else aria-current="page" class="crumbs__current">
          {{ item.label }}
        </span>

        <lucide-chevron-right
          v-if="index < items.length - 1"
          :size="12"
          :stroke-width="1.5"
          class="crumbs__sep"
          aria-hidden="true"
        />
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
export interface BreadcrumbItem {
  label: string;
  /** Omit on the trail's last step — it never links. */
  to?: string;
}

/**
 * The trail above a product, collection or account screen.
 *
 * The last item is always the current page: it renders as a span with
 * `aria-current`, even when a `to` was passed, so a caller can hand over
 * one uniform array per route.
 */
defineProps<{ items: BreadcrumbItem[] }>();
</script>

<style scoped>
.crumbs__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.crumbs__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.crumbs__link,
.crumbs__step,
.crumbs__current {
  font-family: var(--font-body);
  font-size: 11px;
  line-height: 1.5;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.crumbs__link,
.crumbs__step {
  color: var(--text-muted);
  text-decoration: none;
}

.crumbs__link {
  transition: color var(--dur-hover) var(--ease-brand);
}

.crumbs__link:hover {
  color: var(--text-primary);
}

.crumbs__link:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 3px;
}

.crumbs__current {
  color: var(--text-primary);
}

.crumbs__sep {
  flex: 0 0 auto;
  color: var(--text-muted);
}
</style>
