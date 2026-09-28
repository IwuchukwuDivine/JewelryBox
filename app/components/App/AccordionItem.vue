<template>
  <div class="acc-item">
    <button
      :id="triggerId"
      type="button"
      class="acc-item__trigger"
      :aria-expanded="open"
      :aria-controls="panelId"
      @click="context?.toggle(value)"
    >
      <span class="display-heading acc-item__title">{{ title }}</span>
      <span class="acc-item__glyph" :class="{ 'acc-item__glyph--open': open }" aria-hidden="true">
        <span class="acc-item__bar" />
        <span class="acc-item__bar acc-item__bar--vertical" />
      </span>
    </button>

    <div
      v-if="open"
      :id="panelId"
      role="region"
      :aria-labelledby="triggerId"
      class="acc-item__body"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AccordionContext } from "~/utils/types/forms";

/**
 * One panel of an `AppAccordion`.
 *
 * The glyph is a plus that turns into a cross — a quarter turn over 400ms.
 * No chevron: the mark stays square with the rest of the system. The body
 * is removed from the tree when closed, so assistive tech never reads a
 * panel that is not on screen.
 */
const props = defineProps<{ value: string; title: string }>();

const context = inject<AccordionContext | null>("accordionContext", null);

const uid = useId();
const panelId = `acc-panel-${uid}`;
const triggerId = `acc-trigger-${uid}`;

const open = computed(() => context?.isOpen(props.value) ?? false);
</script>

<style scoped>
.acc-item {
  border-bottom: 1px solid var(--border-default);
}

.acc-item__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  min-height: 56px;
  padding: 14px 0;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}

.acc-item__trigger:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

.acc-item__title {
  font-size: 18px;
  line-height: 1.3;
}

/* The rotating plus. Two hairlines so it inherits colour and stays crisp. */
.acc-item__glyph {
  position: relative;
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  color: var(--text-primary);
  transition: transform 400ms var(--ease-brand);
}

.acc-item__glyph--open {
  transform: rotate(45deg);
}

.acc-item__bar {
  position: absolute;
  top: 50%;
  left: 0;
  width: 12px;
  height: 1px;
  margin-top: -0.5px;
  background: currentColor;
}

.acc-item__bar--vertical {
  transform: rotate(90deg);
}

.acc-item__body {
  padding: 0 0 20px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
  animation: jbRise 0.5s var(--ease-brand) both;
}

@media (prefers-reduced-motion: reduce) {
  .acc-item__glyph {
    transition: none;
  }
  .acc-item__body {
    animation: none;
  }
}
</style>
