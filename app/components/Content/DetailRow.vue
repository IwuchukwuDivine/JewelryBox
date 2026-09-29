<template>
  <component
    :is="tag"
    class="list-row c-row"
    :class="{ 'c-row--static': !interactive }"
    :to="to || undefined"
    :href="href || undefined"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener' : undefined"
  >
    <span class="c-row__label">{{ label }}</span>
    <span class="c-row__value">
      <slot>{{ value }}</slot>
    </span>
  </component>
</template>

<script setup lang="ts">
/**
 * One line of a detail list — label left, value right, hairline under.
 *
 * Static by default: the contact details are facts to read, not links to
 * follow. Pass `to` or `href` when a row really does go somewhere, and it
 * becomes a link with the `.list-row` hover.
 *
 * Only an http(s) `href` opens in a new tab. `tel:` and `mailto:` hand off to
 * another application and must not, or the browser is left on a blank tab.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    value?: string;
    /** Internal route. */
    to?: string;
    /** External URL — opens in a new tab. */
    href?: string;
  }>(),
  { to: "", href: "" },
);

const interactive = computed(() => Boolean(props.to || props.href));

const external = computed(() => /^https?:/i.test(props.href));

const tag = computed(() => {
  if (props.to) return resolveComponent("NuxtLink");
  if (props.href) return "a";
  return "div";
});
</script>

<style scoped>
.c-row {
  font-size: 14px;
}

/* `.list-row` is built for tapping; a fact is not tappable. */
.c-row--static {
  cursor: default;
}

.c-row--static:hover {
  opacity: 1;
}

.c-row__label {
  flex: 0 0 auto;
  color: var(--text-secondary);
}

.c-row__value {
  min-width: 0;
  text-align: right;
  color: var(--text-primary);
}
</style>
