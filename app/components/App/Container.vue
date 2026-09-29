<template>
  <component :is="as" class="section-shell" :class="{ 'jb-container--narrow': narrow }">
    <slot />
  </component>
</template>

<script setup lang="ts">
/**
 * Page gutter wrapper.
 *
 * `.section-shell` in main.css owns the max-width and the responsive
 * gutters — this component only picks the element and, for prose pages,
 * tightens the measure. Never restate the gutters here.
 */
withDefaults(
  defineProps<{
    /** Element to render. `section`, `header`, `main`, `article`… */
    as?: string;
    /** Cap the measure at 720px. About, legal, FAQ. */
    narrow?: boolean;
  }>(),
  { as: "div", narrow: false },
);
</script>

<style scoped>
/* One class deeper than .section-shell, so it wins the max-width. */
.jb-container--narrow.section-shell {
  max-width: 720px;
}
</style>
