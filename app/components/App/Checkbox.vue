<template>
  <div class="app-checkbox" :class="{ 'app-checkbox--disabled': disabled }">
    <label class="app-checkbox__row" :for="controlId">
      <input
        v-bind="$attrs"
        :id="controlId"
        class="app-checkbox__native sr-only"
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        :required="required"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @change="handleChange"
      >

      <span class="app-checkbox__box" aria-hidden="true">
        <lucide-check v-if="modelValue" :size="12" :stroke-width="2.5" />
      </span>

      <span class="app-checkbox__label">
        <slot>
          {{ label
          }}<span
            v-if="required"
            class="app-field__required"
            aria-hidden="true"
            >*</span
          >
        </slot>
      </span>
    </label>

    <p v-if="error" :id="messageId" class="app-field__error app-checkbox__note">
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      :id="messageId"
      class="app-field__hint app-checkbox__note"
    >
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    label?: string;
    hint?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
  }>(),
  {
    disabled: false,
    required: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

const uid = useId() ?? "";
const controlId = computed(() => `app-checkbox-${uid}`);
const messageId = computed(() => `${controlId.value}-message`);

const describedBy = computed(() => {
  if (props.error || props.hint) return messageId.value;
  return undefined;
});

const handleChange = (event: Event) => {
  emit("update:modelValue", (event.target as HTMLInputElement).checked);
};
</script>

<style scoped>
.app-checkbox {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.app-checkbox--disabled {
  opacity: 0.45;
  pointer-events: none;
}

.app-checkbox__row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.app-checkbox__box {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  margin-top: 1px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-brand);
  background: transparent;
  color: transparent;
  transition:
    background-color var(--dur-hover) var(--ease-brand),
    border-color var(--dur-hover) var(--ease-brand),
    color var(--dur-hover) var(--ease-brand);
}

.app-checkbox__native:checked + .app-checkbox__box {
  background: var(--text-primary);
  border-color: var(--text-primary);
  color: var(--surface);
}

.app-checkbox__native:focus-visible + .app-checkbox__box {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

.app-checkbox__label {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.app-checkbox__note {
  padding-left: 26px;
}
</style>
