<template>
  <span v-if="$slots.default" class="badge-anchor">
    <slot />
    <span
      v-if="visible"
      class="badge badge--anchored"
      :class="`badge--${tone}`"
      >{{ label }}</span
    >
  </span>

  <span v-else-if="visible" class="badge" :class="`badge--${tone}`">{{
    label
  }}</span>
</template>

<script setup lang="ts">
/**
 * Count pill. Two modes:
 *
 *   with a slot → a positioned anchor around a bag / wishlist icon
 *   without one → a standalone pill
 *
 * It renders nothing at all for `undefined`, `""` or a zero without
 * `showZero`, which is what lets a caller pass `:value="mounted ? count : undefined"`
 * and keep the server and client markup identical.
 */
const props = withDefaults(
  defineProps<{
    value?: number | string;
    max?: number;
    tone?: "accent" | "success" | "danger" | "neutral";
    showZero?: boolean;
  }>(),
  { max: 99, tone: "accent", showZero: false },
);

const numeric = computed(() => {
  if (typeof props.value === "number") return props.value;
  if (props.value === undefined || props.value.trim() === "") return undefined;
  const parsed = Number(props.value);
  return Number.isFinite(parsed) ? parsed : undefined;
});

const visible = computed(() => {
  if (props.value === undefined || props.value === "") return false;
  if (numeric.value === 0 && !props.showZero) return false;
  return true;
});

const label = computed(() => {
  const n = numeric.value;
  if (n !== undefined && n > props.max) return `${props.max}+`;
  return String(props.value);
});
</script>

<style scoped>
.badge-anchor {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 16px;
  height: 16px;
  padding: 0 5px;
  /* 8px is half the height: a pill, not a rounded box. */
  border-radius: 8px;
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  background: var(--accent);
  color: var(--on-accent);
}

/* Sits on the top-right of the 44px icon button it wraps. */
.badge--anchored {
  position: absolute;
  top: 6px;
  right: 6px;
  pointer-events: none;
}

.badge--success {
  background: var(--color-success);
  color: var(--surface);
}
.badge--danger {
  background: var(--color-error);
  color: var(--surface);
}
.badge--neutral {
  background: var(--text-muted);
  color: var(--surface);
}
</style>
