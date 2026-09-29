<template>
  <div
    class="app-otp"
    :class="{ 'app-otp--disabled': disabled }"
    role="group"
    aria-label="One-time code"
  >
    <input
      v-for="(digit, index) in digits"
      :key="index"
      :ref="(el) => setCell(el, index)"
      class="app-field__control app-otp__cell"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="1"
      :value="digit"
      :disabled="disabled"
      :aria-label="`Digit ${index + 1} of ${length}`"
      @input="handleInput($event, index)"
      @keydown="handleKeydown($event, index)"
      @paste="handlePaste"
      @focus="handleFocus(index)"
    >
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: string;
    length?: number;
    disabled?: boolean;
  }>(),
  {
    length: 6,
    disabled: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  complete: [code: string];
}>();

const cells = ref<HTMLInputElement[]>([]);

const setCell = (el: unknown, index: number) => {
  if (el instanceof HTMLInputElement) cells.value[index] = el;
};

/** One character per cell, padded so the row never collapses. */
const digits = computed(() => {
  const code = props.modelValue.replace(/\D/g, "").slice(0, props.length);
  return Array.from({ length: props.length }, (_, i) => code[i] ?? "");
});

const commit = (next: string) => {
  const code = next.replace(/\D/g, "").slice(0, props.length);
  emit("update:modelValue", code);
  if (code.length === props.length) emit("complete", code);
};

const focusCell = (index: number) => {
  const cell = cells.value[Math.min(Math.max(index, 0), props.length - 1)];
  cell?.focus();
  cell?.select();
};

const handleInput = (event: Event, index: number) => {
  const target = event.target as HTMLInputElement;
  const typed = target.value.replace(/\D/g, "");

  if (!typed) {
    // A cleared cell — keep the DOM in step with the model and clear the slot.
    target.value = "";
    const next = [...digits.value];
    next[index] = "";
    commit(next.join(""));
    return;
  }

  const next = [...digits.value];
  // A burst (autofill, fast typing) spills forward from this cell.
  typed.split("").forEach((character, offset) => {
    if (index + offset < props.length) next[index + offset] = character;
  });
  target.value = next[index] ?? "";
  commit(next.join(""));
  focusCell(index + typed.length);
};

const handleKeydown = (event: KeyboardEvent, index: number) => {
  if (event.key === "Backspace") {
    if (digits.value[index]) return;
    event.preventDefault();
    const next = [...digits.value];
    next[index - 1] = "";
    commit(next.join(""));
    focusCell(index - 1);
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    focusCell(index - 1);
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    focusCell(index + 1);
  }
};

const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault();
  const pasted = (event.clipboardData?.getData("text") ?? "").replace(
    /\D/g,
    "",
  );
  if (!pasted) return;
  commit(pasted);
  focusCell(Math.min(pasted.length, props.length - 1));
};

const handleFocus = (index: number) => {
  cells.value[index]?.select();
};
</script>

<style scoped>
.app-otp {
  display: flex;
  gap: 10px;
  width: 100%;
}
.app-otp--disabled {
  opacity: 0.45;
  pointer-events: none;
}

.app-otp__cell {
  /*
   * An <input> carries a large intrinsic width (~20 characters), and `flex: 1`
   * does not constrain it under intrinsic sizing. Six of them made this row's
   * max-content width over 1000px, which stretched the shrink-to-fit wrapper
   * in the auth layout and pushed the card off centre. An explicit basis caps
   * it; flex still distributes the remaining space.
   */
  flex: 1 1 40px;
  width: 40px;
  max-width: 56px;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 20px;
  text-align: center;
  letter-spacing: 0.02em;
}
</style>
