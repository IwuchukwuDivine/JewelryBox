<template>
  <div
    ref="root"
    class="app-field app-select"
    :class="{
      'app-field--error': showError,
      'app-field--disabled': !editable,
      'app-select--prepend': !!prependIcon,
    }"
  >
    <span v-if="label" :id="labelId" class="app-field__label">
      {{ label
      }}<span v-if="required" class="app-field__required" aria-hidden="true"
        >*</span
      >
    </span>

    <div class="app-select__anchor">
      <component
        :is="prependIcon"
        v-if="prependIcon"
        class="app-select__icon"
        :size="16"
        :stroke-width="1.5"
      />

      <button
        ref="trigger"
        type="button"
        class="app-field__control app-select__trigger"
        role="combobox"
        aria-haspopup="listbox"
        :aria-expanded="isOpen"
        :aria-controls="listId"
        :aria-labelledby="label ? labelId : undefined"
        :aria-activedescendant="
          isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined
        "
        :aria-invalid="showError ? 'true' : undefined"
        :aria-describedby="describedBy"
        :disabled="!editable"
        @click="toggle"
        @keydown="handleKeydown"
        @blur="handleBlur"
      >
        <span
          class="app-select__value"
          :class="{ 'app-select__value--empty': !selectedOption }"
        >
          {{ selectedOption ? selectedOption.label : placeholder }}
        </span>
        <lucide-chevron-down
          class="app-select__chevron"
          :class="{ 'app-select__chevron--open': isOpen }"
          :size="16"
          :stroke-width="1.5"
        />
      </button>

      <ul
        v-show="isOpen"
        :id="listId"
        ref="panel"
        class="app-select__panel"
        :class="{ 'app-select__panel--up': dropUp }"
        role="listbox"
        :aria-labelledby="label ? labelId : undefined"
        @mousedown.prevent
      >
        <li
          v-for="(option, index) in options"
          :id="optionId(index)"
          :key="String(option.value)"
          class="app-select__option"
          :class="{
            'app-select__option--active': index === activeIndex,
            'app-select__option--selected': option.value === modelValue,
            'app-select__option--disabled': option.disabled,
          }"
          role="option"
          :aria-selected="option.value === modelValue"
          :aria-disabled="option.disabled ? 'true' : undefined"
          @click="select(index)"
          @mousemove="hover(index)"
        >
          <span class="app-select__option-label">{{ option.label }}</span>
          <lucide-check
            v-if="option.value === modelValue"
            :size="14"
            :stroke-width="2"
          />
        </li>
      </ul>
    </div>

    <p v-if="showError" :id="messageId" class="app-field__error">
      {{ displayError }}
    </p>
    <p v-else-if="hint" :id="messageId" class="app-field__hint">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import { onClickOutside } from "@vueuse/core";
import type { FormContext } from "~/utils/types/forms";

/**
 * A listbox, not a native `<select>`. The native control cannot carry the
 * house underline, so the whole thing is rebuilt — keyboard, roles and all.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string | number | null;
    options: SelectOption[];
    label?: string;
    placeholder?: string;
    editable?: boolean;
    required?: boolean;
    prependIcon?: Component;
    error?: string;
    hint?: string;
  }>(),
  {
    placeholder: "Select…",
    editable: true,
    required: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string | number | null];
  "update:valid": [valid: boolean];
  change: [value: string | number | null];
}>();

const formContext = inject<FormContext | undefined>("formContext", undefined);

const inputId = Symbol("app-select");

const uid = useId() ?? "";
const labelId = computed(() => `app-select-${uid}-label`);
const listId = computed(() => `app-select-${uid}-list`);
const messageId = computed(() => `app-select-${uid}-message`);
const optionId = (index: number) => `app-select-${uid}-option-${index}`;

const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const panel = ref<HTMLElement | null>(null);

const isOpen = ref(false);
const activeIndex = ref(-1);
const dropUp = ref(false);
const isTouched = ref(false);

const selectedOption = computed(() =>
  props.options.find((option) => option.value === props.modelValue),
);

/* ── Validity ─────────────────────────────────────────────────────────── */

const isValid = ref(true);

const runValidation = () => {
  isValid.value =
    !props.required || (props.modelValue !== null && props.modelValue !== "");
  emit("update:valid", isValid.value);
};

const displayError = computed(() => {
  if (props.error) return props.error;
  if (isTouched.value && !isValid.value) return "Choose an option.";
  return "";
});
const showError = computed(() => !!displayError.value);

const describedBy = computed(() => {
  if (showError.value || props.hint) return messageId.value;
  return undefined;
});

watch(() => props.modelValue, runValidation);

onMounted(() => {
  runValidation();
  formContext?.registerInput(inputId, isValid);
});

onUnmounted(() => {
  formContext?.unregisterInput(inputId);
});

/* ── Open / close ─────────────────────────────────────────────────────── */

/** Walks the list in `step` direction, wrapping, and skips disabled rows. */
const firstEnabled = (from: number, step: number) => {
  const total = props.options.length;
  if (total === 0) return -1;
  for (let i = 0; i < total; i += 1) {
    const index = (((from + step * i) % total) + total) % total;
    if (!props.options[index]?.disabled) return index;
  }
  return -1;
};

const hover = (index: number) => {
  if (props.options[index]?.disabled) return;
  activeIndex.value = index;
};

/** Flip the panel above the line when the viewport runs out below it. */
const placePanel = async () => {
  await nextTick();
  const anchor = trigger.value?.getBoundingClientRect();
  const height = panel.value?.offsetHeight ?? 0;
  if (!anchor) return;
  const roomBelow = window.innerHeight - anchor.bottom;
  dropUp.value = roomBelow < height + 12 && anchor.top > height + 12;
};

const open = () => {
  if (!props.editable || isOpen.value) return;
  isOpen.value = true;
  const selected = props.options.findIndex(
    (option) => option.value === props.modelValue,
  );
  activeIndex.value = selected >= 0 ? selected : firstEnabled(0, 1);
  void placePanel();
};

const close = () => {
  isOpen.value = false;
  activeIndex.value = -1;
};

const toggle = () => {
  if (isOpen.value) close();
  else open();
};

const select = (index: number) => {
  const option = props.options[index];
  if (!option || option.disabled) return;
  isTouched.value = true;
  emit("update:modelValue", option.value);
  emit("change", option.value);
  close();
  trigger.value?.focus();
};

const move = (step: number) => {
  const from = activeIndex.value < 0 ? 0 : activeIndex.value + step;
  activeIndex.value = firstEnabled(from, step);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.editable) return;

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      if (isOpen.value) move(1);
      else open();
      break;
    case "ArrowUp":
      event.preventDefault();
      if (isOpen.value) move(-1);
      else open();
      break;
    case "Enter":
    case " ":
      event.preventDefault();
      if (isOpen.value) select(activeIndex.value);
      else open();
      break;
    case "Escape":
      if (isOpen.value) {
        event.preventDefault();
        close();
      }
      break;
    case "Home":
      if (isOpen.value) {
        event.preventDefault();
        activeIndex.value = firstEnabled(0, 1);
      }
      break;
    case "End":
      if (isOpen.value) {
        event.preventDefault();
        activeIndex.value = firstEnabled(props.options.length - 1, -1);
      }
      break;
    case "Tab":
      close();
      break;
    default:
      break;
  }
};

const handleBlur = () => {
  isTouched.value = true;
};

onClickOutside(root, () => {
  if (isOpen.value) close();
});
</script>

<script lang="ts">
/**
 * Declared here rather than in `utils/types/forms.ts` so the option shape
 * travels with the component. Any object of this shape is accepted.
 */
export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}
</script>

<style scoped>
.app-select__anchor {
  position: relative;
  display: block;
  width: 100%;
}

.app-select__icon {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
  z-index: 1;
}

.app-select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  cursor: pointer;
}
.app-select--prepend .app-select__trigger {
  padding-left: 26px;
}

.app-select__value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-select__value--empty {
  color: var(--text-muted);
}

.app-select__chevron {
  flex: 0 0 auto;
  color: var(--text-muted);
  transition: transform var(--dur-hover) var(--ease-brand);
}
.app-select__chevron--open {
  transform: rotate(180deg);
}

.app-select__panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: var(--z-overlay);
  max-height: 240px;
  margin: 0;
  padding: 4px 0;
  overflow-y: auto;
  list-style: none;
  background: var(--surface-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
  animation: jbFade var(--dur-hover) var(--ease-brand);
}
.app-select__panel--up {
  top: auto;
  bottom: calc(100% + 4px);
}

.app-select__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background-color var(--dur-hover) var(--ease-brand),
    color var(--dur-hover) var(--ease-brand);
}
.app-select__option--active {
  background: var(--surface-muted);
  color: var(--text-primary);
}
.app-select__option--selected {
  color: var(--text-primary);
}
.app-select__option--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.app-select__option-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
