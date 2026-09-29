<template>
  <div class="stepper" :class="{ 'stepper--disabled': disabled }">
    <button
      type="button"
      class="stepper__btn"
      :disabled="disabled || modelValue <= min"
      aria-label="Decrease quantity"
      @click="step(-1)"
    >
      <lucide-minus :size="14" :stroke-width="1.5" />
    </button>

    <span class="stepper__value" aria-live="polite">{{ modelValue }}</span>

    <button
      type="button"
      class="stepper__btn"
      :disabled="disabled || modelValue >= max"
      aria-label="Increase quantity"
      @click="step(1)"
    >
      <lucide-plus :size="14" :stroke-width="1.5" />
    </button>
  </div>
</template>

<script setup lang="ts">
/**
 * Quantity control for the bag line and the buy bar.
 *
 * Two 36px taps around a tabular figure. The buttons go dead at the
 * bounds rather than clamping silently, so the limit is visible.
 */
const props = withDefaults(
  defineProps<{
    modelValue: number;
    min?: number;
    max?: number;
    disabled?: boolean;
  }>(),
  { min: 1, max: 99, disabled: false },
);

const emit = defineEmits<{ "update:modelValue": [value: number] }>();

function step(delta: number) {
  if (props.disabled) return;
  const next = Math.min(Math.max(props.modelValue + delta, props.min), props.max);
  if (next !== props.modelValue) emit("update:modelValue", next);
}
</script>

<style scoped>
.stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
}

.stepper--disabled {
  opacity: 0.5;
}

.stepper__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  background: none;
  color: var(--text-primary);
  cursor: pointer;
  transition: opacity var(--dur-hover) var(--ease-brand);
}

.stepper__btn:hover:not(:disabled) {
  opacity: 0.6;
}

.stepper__btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stepper__btn:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: -2px;
}

.stepper__value {
  min-width: 24px;
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1;
  text-align: center;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}
</style>
