<template>
  <span class="skeleton" :class="`skeleton--${variant}`" aria-hidden="true" />
</template>

<script setup lang="ts">
/**
 * Loading placeholder. The shimmer itself lives on the global `.skeleton`
 * class; this only sets the geometry, bound straight into the scoped rule so
 * no inline style attribute is needed.
 */
const props = withDefaults(
  defineProps<{
    variant?: "text" | "rect" | "circle";
    width?: string;
    height?: string;
    radius?: string;
  }>(),
  { variant: "rect", width: "100%" },
);

const cssWidth = computed(() => props.width);

const cssHeight = computed(() => {
  if (props.height) return props.height;
  if (props.variant === "text") return "1em";
  /* A circle squares itself off `aspect-ratio` when no height is given. */
  if (props.variant === "circle") return "auto";
  return "100%";
});

/* 50% is for avatars only — which is exactly what the circle variant is. */
const cssRadius = computed(() =>
  props.variant === "circle" ? "50%" : (props.radius ?? "var(--radius-brand)"),
);

const cssAspect = computed(() =>
  props.variant === "circle" && !props.height ? "1" : "auto",
);

const cssMargin = computed(() => (props.variant === "text" ? "0.35em" : "0"));
</script>

<style scoped>
.skeleton {
  width: v-bind(cssWidth);
  height: v-bind(cssHeight);
  aspect-ratio: v-bind(cssAspect);
  border-radius: v-bind(cssRadius);
  margin-bottom: v-bind(cssMargin);
}
</style>
