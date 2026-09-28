<template>
  <div class="hairline-table__cell stat-tile">
    <p class="display-heading stat-tile__figure">{{ figure }}</p>
    <p class="mono-meta stat-tile__label">{{ label }}</p>
  </div>
</template>

<script setup lang="ts">
/**
 * One cell of the account's three-figure strip.
 *
 * The 1px gap between tiles is the `.hairline-table` grid the parent owns —
 * this only sets the figure and its label.
 */
defineProps<{
  figure: string | number;
  label: string;
}>();
</script>

<style scoped>
.stat-tile__figure {
  margin: 0 0 4px;
  font-size: 24px;
  line-height: 1;
}

.stat-tile__label {
  margin: 0;
  font-size: 9px;
  letter-spacing: 0.1em;
}
</style>
