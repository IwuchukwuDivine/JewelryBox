<template>
  <header class="admin-head">
    <div class="admin-head__text">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h1 class="display-heading admin-head__title">{{ title }}</h1>
      <p v-if="meta" class="mono-meta admin-head__meta">{{ meta }}</p>
    </div>

    <div v-if="$slots.default" class="admin-head__actions">
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
/**
 * The opening line of every admin page.
 *
 * Deliberately not `Content/PageHeader` — that one is the editorial block for
 * /about and the legal routes, at 36–44px with a lede and no room for
 * controls. An admin page needs a compact title with its primary action
 * beside it.
 */
defineProps<{
  title: string;
  /** Accent mono line above the title. */
  eyebrow?: string;
  /** Mono line below it — a count, a range, a total. */
  meta?: string;
}>();
</script>

<style scoped>
.admin-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 20px;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--border-default);
}

.admin-head__title {
  margin: 6px 0 0;
  font-size: 26px;
  line-height: 1.15;
}

.admin-head__meta {
  margin: 8px 0 0;
}

.admin-head__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

@media (min-width: 768px) {
  .admin-head__title {
    font-size: 30px;
  }
}
</style>
