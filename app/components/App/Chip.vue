<template>
  <button
    v-if="as === 'button'"
    type="button"
    class="chip"
    :class="{ 'chip--active': active }"
    :disabled="disabled"
    :aria-pressed="active"
    @click="emit('click', $event)"
  >
    <slot />
  </button>

  <span
    v-else
    class="chip"
    :class="{ 'chip--active': active, 'chip--disabled': disabled }"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
/**
 * Filter / variant / category chip. The look belongs to the global `.chip`
 * and `.chip--active` classes; this only wraps them in the right element and
 * reports its state.
 */
withDefaults(
  defineProps<{
    active?: boolean;
    as?: "button" | "span";
    disabled?: boolean;
  }>(),
  { active: false, as: "button" },
);

const emit = defineEmits<{ click: [event: MouseEvent] }>();
</script>

<style scoped>
/* `.chip:disabled` and `:focus-visible` now live in main.css. This covers the
   non-interactive `span` form, which cannot carry :disabled. */
.chip--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
