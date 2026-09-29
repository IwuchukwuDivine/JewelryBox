<template>
  <div class="empty-state">
    <component
      :is="icon"
      v-if="icon"
      :size="28"
      :stroke-width="1.5"
      class="empty-state__icon"
    />
    <span v-else-if="mark" class="diamond empty-state__mark" aria-hidden="true" />

    <h2 class="empty-state__title display-heading">{{ title }}</h2>

    <p v-if="message" class="empty-state__message">{{ message }}</p>

    <div v-if="$slots.default" class="empty-state__actions">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";

/**
 * Nothing-here state. The house mark — a 28px champagne square turned 45° —
 * stands in for an icon; the empty wishlist and the empty bag both use it.
 */
withDefaults(
  defineProps<{
    title: string;
    message?: string;
    icon?: Component;
    mark?: boolean;
  }>(),
  { mark: true },
);
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 72px 20px;
  text-align: center;
}

.empty-state__icon {
  color: var(--accent);
}

/* The rotated square needs its diagonal cleared, hence the extra margin. */
.empty-state__mark {
  width: 28px;
  height: 28px;
  color: var(--accent);
  margin: 6px 0 12px;
}

.empty-state__title {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
  max-width: 22ch;
}

.empty-state__message {
  margin: -4px 0 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--text-secondary);
  max-width: 42ch;
}

.empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
}
</style>
