<template>
  <component
    :is="tag"
    :class="classes"
    :type="isNativeButton ? type : undefined"
    :to="to || undefined"
    :href="href || undefined"
    :disabled="isNativeButton ? disabled || loading : undefined"
    :aria-disabled="!isNativeButton && (disabled || loading) ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
  >
    <AppSpinner v-if="loading" :size="spinnerSize" :label="loadingLabel" />
    <slot v-else name="leading" />

    <span class="app-btn__label"><slot /></span>

    <slot name="trailing" />
  </component>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** `solid` and `outline` both render 48px tall at `md`; `text` is the underlined link form. */
    variant?: "solid" | "outline" | "text";
    size?: "sm" | "md" | "lg";
    type?: "button" | "submit" | "reset";
    /** Internal route — renders a NuxtLink. */
    to?: string;
    /** External URL — renders an anchor. */
    href?: string;
    disabled?: boolean;
    loading?: boolean;
    block?: boolean;
    loadingLabel?: string;
  }>(),
  {
    variant: "solid",
    size: "md",
    type: "button",
    to: "",
    href: "",
    disabled: false,
    loading: false,
    block: false,
    loadingLabel: "Working",
  },
);

const tag = computed(() => {
  if (props.to) return resolveComponent("NuxtLink");
  if (props.href) return "a";
  return "button";
});

const isNativeButton = computed(() => !props.to && !props.href);

const spinnerSize = computed(() => (props.size === "sm" ? "14px" : "18px"));

const classes = computed(() => [
  "app-btn",
  `app-btn--${props.variant}`,
  `app-btn--${props.size}`,
  {
    // The brand's button treatments already live in main.css — compose them.
    "btn-solid": props.variant === "solid",
    "btn-outline": props.variant === "outline",
    "text-link": props.variant === "text",
    "app-btn--block": props.block,
    "app-btn--disabled": props.disabled || props.loading,
  },
]);
</script>

<style scoped>
.app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
  white-space: nowrap;
}

.app-btn--block {
  display: flex;
  width: 100%;
}

.app-btn__label {
  display: inline-flex;
  align-items: center;
}

/* `text` keeps its underline from .text-link; the label must not gain a second one. */
.app-btn--text {
  gap: 6px;
}

.app-btn:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

/* Sizes. The outline form loses 1px on each side to its border so that both
   variants land on the same height — the spec's 16px/15px padding pair. */
.app-btn--sm.btn-solid {
  padding: 12px 18px;
}
.app-btn--sm.btn-outline {
  padding: 11px 18px;
}
.app-btn--lg.btn-solid {
  padding: 18px 28px;
}
.app-btn--lg.btn-outline {
  padding: 17px 28px;
}

/* An anchor or NuxtLink has no :disabled, so the state is carried by a class. */
.app-btn--disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
</style>
