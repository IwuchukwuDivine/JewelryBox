<template>
  <span class="spinner" role="status">
    <span class="spinner__track" aria-hidden="true">
      <span class="spinner__sweep" />
    </span>
    <span class="sr-only">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
/**
 * Loading indicator. Nothing bounces and nothing spins in this brand, so this
 * is the house motif instead: a 1px hairline with an accent sweep drawn across
 * it, the same `jbLine` figure that runs under the monogram at boot.
 */
const props = withDefaults(
  defineProps<{ size?: string; label?: string }>(),
  { size: "16px", label: "Loading" },
);

const cssSize = computed(() => props.size);
</script>

<style scoped>
.spinner {
  position: relative;
  display: inline-block;
  vertical-align: middle;
  line-height: 0;
}

.spinner__track {
  display: block;
  position: relative;
  width: v-bind(cssSize);
  height: 1px;
  overflow: hidden;
  background: var(--border-default);
}

.spinner__sweep {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 1px;
  background: var(--accent);
  animation: jbLine 1.4s var(--ease-brand) infinite;
}

</style>
