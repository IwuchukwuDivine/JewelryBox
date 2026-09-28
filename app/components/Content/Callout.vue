<template>
  <aside class="luxe-card c-callout">
    <p class="c-callout__text">
      <slot>{{ text }}</slot>
    </p>

    <slot name="action">
      <AppButton v-if="actionLabel && to" size="sm" :to="to" class="c-callout__action">
        {{ actionLabel }}
      </AppButton>
    </slot>
  </aside>
</template>

<script setup lang="ts">
/**
 * The bordered box that closes a written page — a sentence and one way out.
 * Used by the FAQ and the legal routes to hand a reader to the concierge.
 */
defineProps<{
  text?: string;
  actionLabel?: string;
  to?: string;
}>();
</script>

<style scoped>
.c-callout {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px;
}

.c-callout__text {
  margin: 0;
  flex: 1 1 14ch;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text-secondary);
}

.c-callout__action {
  flex: 0 0 auto;
}
</style>
