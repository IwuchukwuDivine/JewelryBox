<template>
  <header class="sec-head">
    <div v-if="hasTopRow" class="sec-head__row">
      <span v-if="eyebrow" class="mono-meta">{{ eyebrow }}</span>
      <span v-else />

      <slot name="meta">
        <NuxtLink v-if="to" :to="to" class="sec-head__link">
          {{ linkLabel }}
          <span aria-hidden="true">&rarr;</span>
        </NuxtLink>
        <span v-else-if="meta" class="mono-meta">{{ meta }}</span>
      </slot>
    </div>

    <slot name="title">
      <component
        :is="tag"
        v-if="title"
        class="display-heading sec-head__title"
        :class="`sec-head__title--${size}`"
      >
        {{ title }}
      </component>
    </slot>

    <p v-if="subtitle" class="sec-head__subtitle">{{ subtitle }}</p>
  </header>
</template>

<script setup lang="ts">
/**
 * The header that opens every section of the storefront.
 *
 * A mono line on the left, a count or a way out on the right, then the
 * Marcellus heading beneath. `meta` and `to` share the right slot — a link
 * wins when both are given, because a link is the more useful of the two.
 */
const props = withDefaults(
  defineProps<{
    title?: string;
    /** Mono line, left. "01 / The Collection". */
    eyebrow?: string;
    /** Mono line, right. "02 Lines". */
    meta?: string;
    subtitle?: string;
    /** Turns the right slot into a link. */
    to?: string;
    linkLabel?: string;
    /** Heading level. */
    tag?: string;
    size?: "sm" | "md" | "lg";
  }>(),
  {
    title: "",
    eyebrow: "",
    meta: "",
    subtitle: "",
    to: "",
    linkLabel: "All",
    tag: "h2",
    size: "md",
  },
);

const slots = useSlots();

const hasTopRow = computed(
  () => Boolean(props.eyebrow || props.meta || props.to) || Boolean(slots.meta),
);
</script>

<style scoped>
.sec-head {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sec-head__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.sec-head__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--dur-hover) var(--ease-brand);
}

.sec-head__link:hover {
  color: var(--text-primary);
}

.sec-head__link:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 3px;
}

.sec-head__title {
  margin: 0;
  line-height: 1.12;
}

.sec-head__title--sm {
  font-size: clamp(18px, 2.2vw, 22px);
}

.sec-head__title--md {
  font-size: clamp(24px, 3.2vw, 30px);
}

.sec-head__title--lg {
  font-size: clamp(30px, 5vw, 44px);
}

.sec-head__subtitle {
  margin: 0;
  max-width: 56ch;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-secondary);
}
</style>
