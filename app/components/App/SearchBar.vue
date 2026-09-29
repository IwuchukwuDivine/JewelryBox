<template>
  <div class="app-searchbar">
    <lucide-search
      class="app-searchbar__icon"
      :size="18"
      :stroke-width="1.5"
      aria-hidden="true"
    />

    <input
      ref="field"
      class="app-searchbar__input"
      type="search"
      :value="modelValue"
      :placeholder="placeholder"
      autocomplete="off"
      enterkeyhint="search"
      aria-label="Search"
      @input="handleInput"
      @keydown.enter.prevent="flush"
    >

    <button
      v-if="modelValue"
      type="button"
      class="app-searchbar__clear"
      aria-label="Clear search"
      @click="clear"
    >
      <lucide-x :size="16" :stroke-width="1.5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { watchDebounced } from "@vueuse/core";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    debounce?: number;
    autofocus?: boolean;
  }>(),
  {
    placeholder: "Search watches, rings, moissanite…",
    debounce: 350,
    autofocus: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  search: [query: string];
}>();

const field = ref<HTMLInputElement | null>(null);

const handleInput = (event: Event) => {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
};

/** Enter jumps the queue — the shopper has already decided. */
const flush = () => {
  emit("search", props.modelValue);
};

const clear = () => {
  emit("update:modelValue", "");
  emit("search", "");
  field.value?.focus();
};

watchDebounced(
  () => props.modelValue,
  (query) => {
    emit("search", query);
  },
  { debounce: () => props.debounce },
);

onMounted(() => {
  if (props.autofocus) field.value?.focus();
});
</script>

<style scoped>
.app-searchbar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.app-searchbar__icon {
  flex: 0 0 auto;
  color: var(--text-muted);
}

.app-searchbar__input {
  flex: 1;
  min-width: 0;
  font-family: var(--font-body);
  font-size: 17px;
  line-height: 1.4;
  padding: 12px 0;
  color: var(--text-primary);
  background: transparent;
  border: none;
  outline: none;
  appearance: none;
}
.app-searchbar__input::placeholder {
  color: var(--text-muted);
}
.app-searchbar__input::-webkit-search-cancel-button {
  display: none;
}

.app-searchbar__clear {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  margin-right: -6px;
  padding: 0;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--dur-hover) var(--ease-brand);
}
.app-searchbar__clear:hover {
  color: var(--text-primary);
}
.app-searchbar__clear:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}
</style>
