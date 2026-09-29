<template>
  <div class="c-num">
    <span class="mono-meta c-num__number">{{ number }}</span>

    <div class="c-num__body">
      <component :is="tag" class="display-heading c-num__title">
        {{ title }}
      </component>
      <p v-if="body" class="c-num__text">{{ body }}</p>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * A numbered editorial block — the four movements of the About page.
 * 48px mono gutter, then the heading and its paragraph.
 */
withDefaults(
  defineProps<{
    /** "01", "02" … Set in mono, not counted by CSS, so it can skip. */
    number: string;
    title: string;
    body?: string;
    tag?: string;
  }>(),
  { tag: "h2" },
);
</script>

<style scoped>
.c-num {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 12px;
}

.c-num__number {
  padding-top: 6px;
}

.c-num__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.c-num__title {
  margin: 0;
  font-size: 26px;
  line-height: 1.15;
}

.c-num__text {
  margin: 0;
  max-width: 62ch;
  font-size: 15px;
  line-height: 1.65;
  color: var(--text-secondary);
}
</style>
