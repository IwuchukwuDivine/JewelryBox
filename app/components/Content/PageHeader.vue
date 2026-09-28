<template>
  <header class="c-head">
    <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>

    <component
      :is="tag"
      class="display-heading c-head__title"
      :class="`c-head__title--${size}`"
    >
      {{ title }}
    </component>

    <p v-if="lede" class="c-head__lede">{{ lede }}</p>

    <p v-if="updated" class="mono-meta c-head__updated">
      Last updated {{ updated }}
    </p>

    <slot />
  </header>
</template>

<script setup lang="ts">
/**
 * The opening block of a written page — contact, FAQ, and the three legal
 * routes. An accent mono line, the Marcellus heading, then whatever the page
 * needs to say before its body starts.
 *
 * `md` is the prototype's 36px heading; `lg` is the About hero's 44px. Both
 * clamp down for the 390px canvas the design was drawn on.
 */
withDefaults(
  defineProps<{
    title: string;
    /** Accent mono line above the heading. */
    eyebrow?: string;
    /** One sentence under the heading. */
    lede?: string;
    /** Renders the "Last updated …" mono line. Legal pages. */
    updated?: string;
    size?: "md" | "lg";
    tag?: string;
  }>(),
  { size: "md", tag: "h1" },
);
</script>

<style scoped>
.c-head {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.c-head__title {
  margin: 0;
  text-wrap: balance;
}

.c-head__title--md {
  font-size: clamp(28px, 6vw, 36px);
  line-height: 1.05;
}

.c-head__title--lg {
  font-size: clamp(32px, 7vw, 44px);
  line-height: 1;
}

.c-head__lede {
  margin: 0;
  max-width: 54ch;
  font-size: 15px;
  line-height: 1.65;
  color: var(--text-secondary);
}

.c-head__updated {
  margin: 4px 0 0;
}
</style>
