<template>
  <div v-if="groups.length" class="variants">
    <div v-for="group in groups" :key="group.key" class="variants__group">
      <p :id="groupId(group.key)" class="caption variants__label">{{ group.label }}</p>

      <div class="variants__row" role="group" :aria-labelledby="groupId(group.key)">
        <button
          v-for="option in group.values"
          :key="option.value"
          type="button"
          class="chip variants__chip"
          :class="{
            'chip--active': isActive(group.key, option.value),
            'variants__chip--sold': option.soldOut,
          }"
          :disabled="option.soldOut"
          :aria-pressed="isActive(group.key, option.value)"
          @click="pick(group.key, option.value)"
        >
          {{ option.value }}
          <span v-if="option.soldOut" class="sr-only">— sold out</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductVariant } from "~/utils/types/shop";

/**
 * Option chips — strap, ring size, chain length.
 *
 * Designed fresh: the prototype has no variant selector, so the geometry is
 * borrowed wholesale from the filter chip (`.chip`, 9px × 12px, 2px radius,
 * selected inverts) and the group headings from `.caption`.
 *
 * Variants are grouped by the keys in `options`, so `{ strap, size }` draws
 * two rows rather than one row of composite labels. A variant with no
 * `options` at all falls back to a single "Option" row keyed on its label,
 * which is what the fixtures with plain labels need.
 *
 * A value is sold out only when EVERY variant carrying it is out of stock —
 * "40mm" is still available if one of its two straps is.
 */
const props = defineProps<{
  variants: ProductVariant[];
  modelValue: string | null;
}>();

const emit = defineEmits<{ "update:modelValue": [id: string | null] }>();

const uid = useId() ?? "";
const groupId = (key: string) => `variant-${uid}-${key.replace(/\W+/g, "-")}`;

const ordered = computed(() => [...props.variants].sort((a, b) => a.position - b.position));

/** Every variant is read through this, so the fallback shape is universal. */
const optionsOf = (variant: ProductVariant): Record<string, string> =>
  Object.keys(variant.options).length ? variant.options : { Option: variant.label };

const selected = computed(
  () => ordered.value.find((variant) => variant.id === props.modelValue) ?? null,
);

const groups = computed(() => {
  const keys: string[] = [];
  for (const variant of ordered.value) {
    for (const key of Object.keys(optionsOf(variant))) {
      if (!keys.includes(key)) keys.push(key);
    }
  }

  return keys.map((key) => {
    const values: string[] = [];
    for (const variant of ordered.value) {
      const value = optionsOf(variant)[key];
      if (value && !values.includes(value)) values.push(value);
    }

    return {
      key,
      label: key.replace(/[_-]+/g, " "),
      values: values.map((value) => ({
        value,
        soldOut: ordered.value
          .filter((variant) => optionsOf(variant)[key] === value)
          .every((variant) => !variant.in_stock),
      })),
    };
  });
});

const isActive = (key: string, value: string) =>
  selected.value ? optionsOf(selected.value)[key] === value : false;

/**
 * Keep the rest of the selection wherever the catalogue allows it — picking
 * "42mm" should not silently swap the strap the customer already chose.
 */
const pick = (key: string, value: string) => {
  const candidates = ordered.value.filter(
    (variant) => optionsOf(variant)[key] === value,
  );
  if (!candidates.length) return;

  const current = selected.value;
  const keepsSelection = (variant: ProductVariant) => {
    if (!current) return false;
    return Object.entries(optionsOf(current)).every(
      ([otherKey, otherValue]) =>
        otherKey === key || optionsOf(variant)[otherKey] === otherValue,
    );
  };

  const next =
    candidates.find((variant) => variant.in_stock && keepsSelection(variant)) ??
    candidates.find((variant) => variant.in_stock) ??
    candidates.find(keepsSelection) ??
    candidates[0];

  if (next) emit("update:modelValue", next.id);
};
</script>

<style scoped>
.variants {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.variants__group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.variants__label {
  margin: 0;
}

.variants__row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.variants__chip {
  text-transform: none;
  letter-spacing: 0.04em;
  font-size: 12px;
}

.variants__chip--sold {
  text-decoration: line-through;
}
</style>
