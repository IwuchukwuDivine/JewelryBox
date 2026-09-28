<template>
  <blockquote class="display-heading c-quote">
    <slot />
    <footer v-if="cite" class="mono-meta c-quote__cite">{{ cite }}</footer>
  </blockquote>
</template>

<script setup lang="ts">
/**
 * The house line, set large against a single champagne rule. No quote marks
 * are added — pass them in the slot if the page wants them.
 */
defineProps<{ cite?: string }>();
</script>

<style scoped>
.c-quote {
  margin: 0;
  padding-left: 20px;
  border-left: 1px solid var(--accent);
  font-size: 26px;
  line-height: 1.3;
  text-wrap: pretty;
}

.c-quote__cite {
  margin-top: 14px;
}
</style>
