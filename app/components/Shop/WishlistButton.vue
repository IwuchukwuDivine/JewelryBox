<template>
  <button
    type="button"
    class="wish"
    :class="[`wish--${tone}`, { 'wish--saved': saved }]"
    :aria-pressed="saved"
    :aria-label="saved ? `Remove ${label} from saved pieces` : `Save ${label}`"
    @click.stop.prevent="save"
  >
    <span class="diamond" :class="{ 'diamond--filled': saved }" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
/**
 * The house's saved-piece marker: an 11px diamond that fills when saved.
 *
 * `tone="overlay"` is the form that sits on top of a photograph — a blurred
 * dark ground so the outline survives a bright frame. `tone="plain"` is the
 * bare 44px tap used in a light column.
 *
 * The filled state is persisted in localStorage, so it is held back until
 * mount: the server has no way to know what this browser saved, and drawing
 * it early is a hydration mismatch.
 */
const props = withDefaults(
  defineProps<{
    productId: string;
    /** Only used for analytics — the wishlist itself keys on the id. */
    slug?: string;
    /** Name of the piece, for the accessible label. */
    label?: string;
    tone?: "plain" | "overlay";
  }>(),
  { label: "this piece", tone: "plain" },
);

const { has, toggle } = useWishlist();
const mounted = useMounted();

const saved = computed(() => (mounted.value ? has(props.productId) : false));

const save = () => {
  toggle(props.productId, props.slug);
};
</script>

<style scoped>
.wish {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-brand);
  transition:
    color var(--dur-hover) var(--ease-brand),
    opacity var(--dur-hover) var(--ease-brand);
}

.wish:hover {
  color: var(--text-primary);
}

.wish:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

.wish--saved {
  color: var(--accent);
}

/* Over a photograph: a blurred dark ground, bone outline. */
.wish--overlay {
  background: var(--overlay-default);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: var(--color-bone);
}

.wish--overlay:hover {
  color: var(--color-bone);
  opacity: 0.8;
}

.wish--overlay.wish--saved {
  color: var(--color-champagne);
}
</style>
