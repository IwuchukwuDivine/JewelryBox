<template>
  <div class="tabs" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="(tab, index) in tabs"
      :key="tab.value"
      :ref="(el) => setTabEl(el, index)"
      type="button"
      role="tab"
      class="tabs__tab"
      :class="{ 'tabs__tab--active': tab.value === modelValue }"
      :aria-selected="tab.value === modelValue"
      :disabled="tab.disabled"
      :tabindex="index === rovingIndex ? 0 : -1"
      @click="select(index)"
      @keydown="onKeydown($event, index)"
    >
      <slot name="tab" :tab="tab" :active="tab.value === modelValue">
        <component
          :is="tab.icon"
          v-if="tab.icon"
          :size="14"
          :stroke-width="1.5"
          class="tabs__icon"
        />
        <span>{{ tab.label }}</span>
        <span v-if="tab.badge !== undefined" class="tabs__badge">{{ tab.badge }}</span>
      </slot>
    </button>
  </div>
</template>

<script setup lang="ts">
export interface TabDefinition {
  value: string | number;
  label: string;
  /** A lucide component, passed by reference. */
  icon?: Component;
  badge?: string | number;
  disabled?: boolean;
}

/**
 * The account and product-detail tab row.
 *
 * A scrolling row of labels on a single hairline: the active tab draws its
 * own underline one pixel low so it lands on that hairline rather than
 * beside it. Arrows walk the row and skip whatever is disabled; Home and
 * End jump to the ends. Focus is roving — one tab in the tab order.
 */
const props = withDefaults(
  defineProps<{
    modelValue: string | number;
    tabs: TabDefinition[];
    ariaLabel?: string;
  }>(),
  { ariaLabel: "Tabs" },
);

const emit = defineEmits<{ "update:modelValue": [value: string | number] }>();

const tabEls = ref<(HTMLButtonElement | null)[]>([]);

function setTabEl(el: unknown, index: number) {
  tabEls.value[index] = (el as HTMLButtonElement | null) ?? null;
}

const activeIndex = computed(() =>
  props.tabs.findIndex((tab) => tab.value === props.modelValue),
);

/** The single tab that holds a tabindex of 0. */
const rovingIndex = computed(() =>
  activeIndex.value >= 0 ? activeIndex.value : seek(props.tabs.length - 1, 1),
);

/** Next enabled tab from `from`, walking `dir` and wrapping. -1 if none. */
function seek(from: number, dir: 1 | -1): number {
  const count = props.tabs.length;
  if (count === 0) return -1;
  let i = from;
  for (let step = 0; step < count; step += 1) {
    i = (i + dir + count) % count;
    if (!props.tabs[i]?.disabled) return i;
  }
  return -1;
}

function select(index: number) {
  const tab = props.tabs[index];
  if (!tab || tab.disabled) return;
  if (tab.value !== props.modelValue) emit("update:modelValue", tab.value);
}

function focusTab(index: number) {
  if (index < 0) return;
  select(index);
  tabEls.value[index]?.focus();
}

function onKeydown(event: KeyboardEvent, index: number) {
  const count = props.tabs.length;
  let target = -1;

  if (event.key === "ArrowRight") target = seek(index, 1);
  else if (event.key === "ArrowLeft") target = seek(index, -1);
  else if (event.key === "Home") target = seek(count - 1, 1);
  else if (event.key === "End") target = seek(0, -1);
  else return;

  event.preventDefault();
  focusTab(target);
}
</script>

<style scoped>
.tabs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-default);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tabs__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  margin-bottom: -1px;
  padding: 12px 10px;
  border: none;
  border-bottom: 1px solid transparent;
  background: none;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--text-muted);
  cursor: pointer;
  transition:
    color var(--dur-hover) var(--ease-brand),
    border-color var(--dur-hover) var(--ease-brand);
}

.tabs__tab:hover:not(:disabled):not(.tabs__tab--active) {
  color: var(--text-secondary);
}

.tabs__tab--active {
  color: var(--text-primary);
  border-bottom-color: var(--text-primary);
}

.tabs__tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tabs__tab:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: -2px;
}

.tabs__icon {
  flex: 0 0 auto;
}

.tabs__badge {
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.12em;
  color: var(--accent);
}
</style>
