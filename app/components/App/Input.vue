<template>
  <div
    class="app-field app-input"
    :class="{
      'app-field--error': showError,
      'app-field--disabled': !editable,
      'app-input--prepend': !!prependIcon,
      'app-input--append': hasAppend,
    }"
  >
    <label v-if="label" class="app-field__label" :for="controlId">
      {{ label
      }}<span v-if="required" class="app-field__required" aria-hidden="true"
        >*</span
      >
    </label>

    <div class="app-input__row">
      <component
        :is="prependIcon"
        v-if="prependIcon"
        class="app-input__icon app-input__icon--lead"
        :size="16"
        :stroke-width="1.5"
      />

      <input
        v-bind="$attrs"
        :id="controlId"
        class="app-field__control"
        :type="resolvedType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="!editable"
        :required="required"
        :aria-invalid="showError ? 'true' : undefined"
        :aria-describedby="describedBy"
        @input="handleInput"
        @blur="handleBlur"
      >

      <button
        v-if="isPassword"
        type="button"
        class="app-input__reveal"
        :aria-label="isRevealed ? 'Hide password' : 'Show password'"
        :aria-pressed="isRevealed"
        @click="isRevealed = !isRevealed"
      >
        <lucide-eye-off v-if="isRevealed" :size="16" :stroke-width="1.5" />
        <lucide-eye v-else :size="16" :stroke-width="1.5" />
      </button>

      <component
        :is="appendIcon"
        v-else-if="appendIcon"
        class="app-input__icon app-input__icon--trail"
        :size="16"
        :stroke-width="1.5"
      />
    </div>

    <p v-if="showError" :id="messageId" class="app-field__error">
      {{ displayError }}
    </p>
    <p v-else-if="hint" :id="messageId" class="app-field__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import type { FormContext, Rule } from "~/utils/types/forms";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue: string | number;
    label?: string;
    placeholder?: string;
    type?: string;
    editable?: boolean;
    required?: boolean;
    prependIcon?: Component;
    appendIcon?: Component;
    error?: string;
    hint?: string;
    rules?: Rule[];
    id?: string;
  }>(),
  {
    type: "text",
    editable: true,
    required: false,
    placeholder: "",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string | number];
  "update:valid": [valid: boolean];
}>();

const formContext = inject<FormContext | undefined>("formContext", undefined);

/** Identity for the parent form's registry — one symbol per instance. */
const inputId = Symbol("app-input");

const uid = useId() ?? "";
const controlId = computed(() => props.id ?? `app-input-${uid}`);
const messageId = computed(() => `${controlId.value}-message`);

const isPassword = computed(() => props.type === "password");
const isRevealed = ref(false);
const resolvedType = computed(() => {
  if (!isPassword.value) return props.type;
  return isRevealed.value ? "text" : "password";
});
const hasAppend = computed(() => isPassword.value || !!props.appendIcon);

/** Red stays hidden until the field has been used or left. */
const isTouched = ref(false);
const ruleError = ref("");
const isValid = ref(true);

const runValidation = () => {
  const rules = props.rules ?? [];
  const failed = rules.find((entry) => !entry.rule(props.modelValue));
  ruleError.value = failed?.message ?? "";
  isValid.value = !failed;
  emit("update:valid", isValid.value);
};

const displayError = computed(() => {
  if (props.error) return props.error;
  return isTouched.value ? ruleError.value : "";
});
const showError = computed(() => !!displayError.value);

const describedBy = computed(() => {
  if (showError.value || props.hint) return messageId.value;
  return undefined;
});

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  isTouched.value = true;
  if (props.type === "number") {
    emit("update:modelValue", target.value === "" ? "" : Number(target.value));
    return;
  }
  emit("update:modelValue", target.value);
};

const handleBlur = () => {
  isTouched.value = true;
  runValidation();
};

watch(() => props.modelValue, runValidation);
watch(() => props.rules, runValidation, { deep: true });

onMounted(() => {
  runValidation();
  formContext?.registerInput(inputId, isValid);
});

onUnmounted(() => {
  formContext?.unregisterInput(inputId);
});
</script>

<style scoped>
/* The underline belongs to .app-field__control, so icons are laid over the
   row rather than beside it — that keeps the line running edge to edge. */
.app-input__row {
  position: relative;
  display: block;
  width: 100%;
}

.app-input__icon {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}
.app-input__icon--lead {
  left: 0;
}
.app-input__icon--trail {
  right: 0;
}

.app-input--prepend .app-field__control {
  padding-left: 26px;
}
.app-input--append .app-field__control {
  padding-right: 30px;
}

.app-input__reveal {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: color var(--dur-hover) var(--ease-brand);
}
.app-input__reveal:hover {
  color: var(--text-primary);
}
.app-input__reveal:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

/* Strip the number spinners — the underline spec has no room for them. */
.app-field__control[type="number"] {
  appearance: textfield;
}
</style>
