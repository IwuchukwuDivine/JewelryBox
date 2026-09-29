<template>
  <div class="accordion">
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { AccordionContext } from "~/utils/types/forms";

/**
 * Disclosure group — FAQ, product specs, care and shipping.
 *
 * The parent owns which panels are open and hands children an
 * `AccordionContext` through provide; `AppAccordionItem` only reads it.
 * Single-open is the default and a second click on the open panel closes
 * it, so a reader can shut the group entirely.
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string | string[] | null;
    /** Let several panels stand open at once. */
    multiple?: boolean;
  }>(),
  { modelValue: null, multiple: false },
);

const emit = defineEmits<{ "update:modelValue": [value: string | string[] | null] }>();

function normalise(value: string | string[] | null | undefined): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? [...value] : [value];
}

/* Mirrored locally so the group also works without a v-model. */
const openValues = ref<string[]>(normalise(props.modelValue));

watch(
  () => props.modelValue,
  (value) => {
    openValues.value = normalise(value);
  },
);

function isOpen(value: string) {
  return openValues.value.includes(value);
}

function toggle(value: string) {
  let next: string[];
  if (isOpen(value)) next = openValues.value.filter((item) => item !== value);
  else if (props.multiple) next = [...openValues.value, value];
  else next = [value];

  openValues.value = next;
  emit("update:modelValue", props.multiple ? next : (next[0] ?? null));
}

provide<AccordionContext>("accordionContext", { isOpen, toggle });
</script>

<style scoped>
.accordion {
  display: block;
  width: 100%;
}
</style>
