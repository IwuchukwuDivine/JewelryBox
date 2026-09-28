<template>
  <NuxtLink v-if="to" :to="to" :aria-label="`${SITE_NAME} home`" class="app-logo">
    <component :is="mark" />
  </NuxtLink>
  <span v-else class="app-logo" role="img" :aria-label="SITE_NAME">
    <component :is="mark" />
  </span>
</template>

<script setup lang="ts">
import { h } from "vue";
import { SITE_NAME, LOCKUP_DARK, LOCKUP_LIGHT } from "~/utils/constants/brand";

/**
 * The brand mark.
 *
 * The wordmark is primary and is *type*, not an image — Marcellus, single
 * weight, CamelCase so the two words read as one object. The monogram is
 * the symbol, used where the wordmark would fall below its 96px minimum.
 * Only `lockup` reaches for the raster, because that artwork is a drawn
 * lockup rather than something type can reproduce.
 *
 * Colour comes from `currentColor`, so the mark follows the theme.
 */
const props = withDefaults(
  defineProps<{
    variant?: "wordmark" | "monogram" | "lockup";
    /** Wrap in a link. Omit for decorative placements. */
    to?: string;
    /** Font size for the type marks; width for the lockup. */
    size?: string;
  }>(),
  { variant: "wordmark", to: "/", size: "" },
);

const { isDark } = useTheme();

const wordmark = () =>
  h(
    "span",
    { class: "app-logo__wordmark", style: props.size ? { fontSize: props.size } : {} },
    SITE_NAME,
  );

/* Brand book: the J tucks under the B at -0.18em and drops below the
   baseline like a clasp hook. */
const monogram = () =>
  h(
    "span",
    { class: "app-logo__monogram", style: props.size ? { fontSize: props.size } : {} },
    [h("span", { class: "app-logo__monogram-j" }, "J"), h("span", null, "B")],
  );

const lockup = () =>
  h("img", {
    src: isDark.value ? LOCKUP_DARK : LOCKUP_LIGHT,
    alt: SITE_NAME,
    width: 2002,
    height: 1152,
    class: "app-logo__lockup",
    style: props.size ? { width: props.size } : {},
  });

const mark = computed(() => {
  if (props.variant === "monogram") return monogram;
  if (props.variant === "lockup") return lockup;
  return wordmark;
});
</script>

<style scoped>
.app-logo {
  display: inline-flex;
  align-items: center;
  color: inherit;
  text-decoration: none;
}

.app-logo__wordmark {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 1.5rem;
  letter-spacing: 0.02em;
  line-height: 1;
  white-space: nowrap;
}

.app-logo__monogram {
  display: inline-flex;
  align-items: baseline;
  font-family: var(--font-display);
  font-weight: 400;
  font-size: 1.5rem;
  line-height: 1;
}

.app-logo__monogram-j {
  letter-spacing: -0.18em;
}

.app-logo__lockup {
  display: block;
  width: 180px;
  height: auto;
}
</style>
