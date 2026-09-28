<template>
  <fieldset
    class="app-radio"
    :class="{ 'app-radio--error': !!error }"
    :aria-invalid="error ? 'true' : undefined"
    :aria-describedby="error ? messageId : undefined"
  >
    <legend v-if="label" class="app-field__label app-radio__legend">
      {{ label
      }}<span v-if="required" class="app-field__required" aria-hidden="true"
        >*</span
      >
    </legend>

    <label
      v-for="option in options"
      :key="option.value"
      class="app-radio__card"
      :class="{
        'app-radio__card--selected': option.value === modelValue,
        'app-radio__card--disabled': option.disabled,
      }"
    >
      <input
        class="app-radio__native sr-only"
        type="radio"
        :name="groupName"
        :value="option.value"
        :checked="option.value === modelValue"
        :disabled="option.disabled"
        :required="required"
        @change="emit('update:modelValue', option.value)"
      >

      <span class="app-radio__mark" aria-hidden="true">
        <span class="app-radio__dot" />
      </span>

      <span class="app-radio__body">
        <span class="app-radio__title">{{ option.label }}</span>
        <span v-if="option.description" class="app-radio__description">
          {{ option.description }}
        </span>
      </span>

      <slot
        name="option"
        v-bind="{ option, selected: option.value === modelValue }"
      />
    </label>

    <p v-if="error" :id="messageId" class="app-field__error">{{ error }}</p>
  </fieldset>
</template>

<script setup lang="ts">
/**
 * A radio card set — the checkout payment picker's shape. The group is the
 * component, because that is how it is always consumed. A real fieldset and
 * real native radios carry the keyboard and screen-reader behaviour.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string | null;
    options: RadioOption[];
    name?: string;
    label?: string;
    required?: boolean;
    error?: string;
  }>(),
  {
    required: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:valid": [valid: boolean];
}>();

const uid = useId() ?? "";
const groupName = computed(() => props.name ?? `app-radio-${uid}`);
const messageId = computed(() => `app-radio-${uid}-message`);

const isValid = computed(
  () => !props.required || (props.modelValue !== null && props.modelValue !== ""),
);

watch(
  isValid,
  (valid) => {
    emit("update:valid", valid);
  },
  { immediate: true },
);
</script>

<script lang="ts">
export interface RadioOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}
</script>

<style scoped>
.app-radio {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
}

.app-radio__legend {
  padding: 0;
  margin-bottom: 4px;
}
.app-radio--error .app-radio__legend {
  color: var(--color-error);
}

.app-radio__card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--surface-muted);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
  cursor: pointer;
  transition: border-color var(--dur-hover) var(--ease-brand);
}
.app-radio__card--selected {
  border-color: var(--text-primary);
}
.app-radio--error .app-radio__card {
  border-color: var(--color-error);
}
.app-radio__card--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.app-radio__mark {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  border: 1px solid var(--text-primary);
  border-radius: 50%;
}

.app-radio__dot {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: transparent;
  transition: background-color var(--dur-hover) var(--ease-brand);
}
.app-radio__card--selected .app-radio__dot {
  background: var(--text-primary);
}

.app-radio__native:focus-visible + .app-radio__mark {
  outline: 2px solid var(--ring-default);
  outline-offset: 3px;
}

.app-radio__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.app-radio__title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--text-primary);
}

.app-radio__description {
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-secondary);
}
</style>
