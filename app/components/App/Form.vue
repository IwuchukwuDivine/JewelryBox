<template>
  <form class="app-form" novalidate @submit="handleSubmit">
    <slot v-bind="{ isValid, isSubmitting }" />
  </form>
</template>

<script setup lang="ts">
import type { Ref } from "vue";
import type { FormContext } from "~/utils/types/forms";

/**
 * The validation aggregator.
 *
 * Every field that can be invalid registers its own `isValid` ref here on
 * mount and drops it on unmount, so the form reports one truth and never
 * has to know what its children are. An empty form is valid.
 */
const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    loading?: boolean;
  }>(),
  {
    modelValue: false,
    loading: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [valid: boolean];
  submit: [];
  invalid: [];
}>();

/** Reactive so registering or dropping a field re-runs `isValid`. */
const inputs = reactive(new Map<symbol, Ref<boolean>>());

/**
 * `toRaw` unwraps the proxy a reactive Map puts around the stored refs, so
 * `.value` tracks the field's own dependency rather than the Map's.
 */
const isValid = computed(() =>
  [...inputs.keys()].every((key) => {
    const field = inputs.get(key);
    return field ? toRaw(field).value : true;
  }),
);

const isSubmitting = computed(() => props.loading);

const registerInput = (id: symbol, valid: Ref<boolean>) => {
  inputs.set(id, valid);
};

const unregisterInput = (id: symbol) => {
  inputs.delete(id);
};

provide<FormContext>("formContext", { registerInput, unregisterInput });

watch(
  isValid,
  (valid) => {
    emit("update:modelValue", valid);
  },
  { immediate: true },
);

const handleSubmit = (event: Event) => {
  event.preventDefault();
  if (isValid.value) emit("submit");
  else emit("invalid");
};

defineExpose({ isValid });
</script>

<style scoped>
.app-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}
</style>
