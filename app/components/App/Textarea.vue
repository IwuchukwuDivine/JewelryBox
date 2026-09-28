<template>
  <div
    class="app-field"
    :class="{
      'app-field--error': showError,
      'app-field--disabled': !editable,
    }"
  >
    <label v-if="label" class="app-field__label" :for="controlId">
      {{ label
      }}<span v-if="required" class="app-field__required" aria-hidden="true"
        >*</span
      >
    </label>

    <textarea
      v-bind="$attrs"
      :id="controlId"
      class="app-field__control app-textarea__control"
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="!editable"
      :required="required"
      :aria-invalid="showError ? 'true' : undefined"
      :aria-describedby="describedBy"
      @input="handleInput"
      @blur="handleBlur"
    />

    <p v-if="showError" :id="messageId" class="app-field__error">
      {{ displayError }}
    </p>
    <p v-else-if="hint" :id="messageId" class="app-field__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import type { FormContext, Rule } from "~/utils/types/forms";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue: string | number;
    label?: string;
    placeholder?: string;
    rows?: number;
    editable?: boolean;
    required?: boolean;
    error?: string;
    hint?: string;
    rules?: Rule[];
    id?: string;
  }>(),
  {
    rows: 4,
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

const inputId = Symbol("app-textarea");

const uid = useId() ?? "";
const controlId = computed(() => props.id ?? `app-textarea-${uid}`);
const messageId = computed(() => `${controlId.value}-message`);

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
  const target = event.target as HTMLTextAreaElement;
  isTouched.value = true;
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
.app-textarea__control {
  resize: none;
  min-height: 0;
}
</style>
