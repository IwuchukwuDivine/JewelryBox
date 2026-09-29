<template>
  <div class="gallery">
    <div
      ref="stage"
      class="gallery__stage"
      :class="{ 'gallery__stage--zoomed': zoomed }"
      @pointerenter="onEnter"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onRelease"
      @pointercancel="onRelease"
      @pointerleave="onLeave"
    >
      <NuxtImg
        :key="current"
        :src="currentSrc"
        :alt="alt"
        class="gallery__image"
        width="800"
        height="1000"
        sizes="xs:100vw sm:100vw md:640px lg:560px xl:560px"
        :loading="current === 0 ? 'eager' : 'lazy'"
        :fetchpriority="current === 0 ? 'high' : 'auto'"
      />

      <span
        v-if="zoomed"
        class="gallery__zoom"
        :style="zoomStyle"
        aria-hidden="true"
      />

      <span class="inset-frame" aria-hidden="true" />

      <span class="mono-meta gallery__position">{{ position }}</span>

      <ShopWishlistButton
        class="gallery__wish"
        :product-id="productId"
        :slug="slug"
        :label="alt"
        tone="overlay"
      />
    </div>

    <div v-if="images.length > 1" class="gallery__thumbs">
      <button
        v-for="(image, index) in images"
        :key="image"
        type="button"
        class="gallery__thumb"
        :class="{ 'gallery__thumb--active': index === current }"
        :aria-label="`View frame ${index + 1} of ${images.length}`"
        :aria-current="index === current ? 'true' : undefined"
        @click="select(index)"
      >
        <NuxtImg
          :src="image"
          :alt="`${alt} — frame ${index + 1}`"
          class="gallery__thumb-image"
          width="120"
          height="120"
          sizes="120px"
          loading="lazy"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery, usePreferredReducedMotion } from "@vueuse/core";

/**
 * The product gallery.
 *
 * Main frame at 4/5 with the hairline `.inset-frame`, the position counter
 * top-left in mono (`01 / 04`) and the saved-piece diamond top-right on a
 * blurred dark ground. Thumbnails below at 1/1; the active one takes the
 * primary border at full opacity, the rest sit at `.55`.
 *
 * MACRO ZOOM — designed fresh; the prototype only stubs a "ZOOM · 360°"
 * button. A second layer paints the same frame at `--zoom-scale` and its
 * `background-position` follows the pointer, so nothing is transformed and
 * the layout never moves:
 *
 *   ≥lg with a real hover  →  engages on pointerenter, follows the mouse
 *   touch / pen            →  engages on press, follows the drag, ends on lift
 *
 * The stage is a plain div with pointer-only handlers, so keyboard and
 * screen-reader users walk straight past it to the thumbnails; and
 * `prefers-reduced-motion: reduce` switches the whole thing off.
 */
const props = withDefaults(
  defineProps<{
    images: string[];
    /** Piece name — used for the image alt text and the wishlist label. */
    alt: string;
    productId: string;
    slug: string;
    /** How far the macro layer magnifies. 2 = 200%. */
    scale?: number;
  }>(),
  { scale: 2 },
);

const stage = ref<HTMLElement | null>(null);
const current = ref(0);

/* Walking to another piece must not leave the viewer on frame 4 of 1. */
watch(
  () => props.images,
  () => {
    current.value = 0;
  },
);

const currentSrc = computed(() => props.images[current.value] ?? props.images[0] ?? "");

const pad = (value: number) => String(value).padStart(2, "0");
const position = computed(() => `${pad(current.value + 1)} / ${pad(props.images.length)}`);

const select = (index: number) => {
  if (index === current.value) return;
  current.value = index;
  zoomed.value = false;
};

/* ── Macro zoom ───────────────────────────────────────────────────────── */

const reducedMotion = usePreferredReducedMotion();
/* `hover: hover` keeps a desktop-width tablet out of the mouse branch. */
const canHover = useMediaQuery("(min-width: 1024px) and (hover: hover)");

const zoomEnabled = computed(() => reducedMotion.value !== "reduce" && Boolean(currentSrc.value));

const zoomed = ref(false);
const origin = ref({ x: 50, y: 50 });
const pressing = ref(false);

const zoomStyle = computed(() => ({
  backgroundImage: `url("${currentSrc.value}")`,
  backgroundSize: `${props.scale * 100}%`,
  backgroundPosition: `${origin.value.x}% ${origin.value.y}%`,
}));

const trackPointer = (event: PointerEvent) => {
  const box = stage.value?.getBoundingClientRect();
  if (!box || !box.width || !box.height) return;
  const x = ((event.clientX - box.left) / box.width) * 100;
  const y = ((event.clientY - box.top) / box.height) * 100;
  origin.value = {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
};

const onEnter = (event: PointerEvent) => {
  if (!zoomEnabled.value || event.pointerType !== "mouse" || !canHover.value) return;
  trackPointer(event);
  zoomed.value = true;
};

const onDown = (event: PointerEvent) => {
  if (!zoomEnabled.value || event.pointerType === "mouse") return;
  pressing.value = true;
  trackPointer(event);
  zoomed.value = true;
};

const onMove = (event: PointerEvent) => {
  if (!zoomed.value) return;
  if (event.pointerType === "mouse" ? !canHover.value : !pressing.value) return;
  trackPointer(event);
};

const onRelease = (event: PointerEvent) => {
  if (event.pointerType === "mouse") return;
  pressing.value = false;
  zoomed.value = false;
};

const onLeave = () => {
  pressing.value = false;
  zoomed.value = false;
};
</script>

<style scoped>
.gallery {
  display: flex;
  flex-direction: column;
}

.gallery__stage {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: var(--surface-muted);
  /* Press-and-drag zooms; a vertical swipe still scrolls the page. */
  touch-action: pan-y;
}

.gallery__stage--zoomed {
  cursor: zoom-in;
}

.gallery__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: jbFade var(--dur-reveal) var(--ease-brand) both;
}

.gallery__zoom {
  position: absolute;
  inset: 0;
  background-repeat: no-repeat;
  pointer-events: none;
  animation: jbFade var(--dur-hover) var(--ease-brand) both;
}

.gallery__position {
  position: absolute;
  top: 22px;
  left: 22px;
  padding: 4px 6px;
  color: var(--color-bone);
  background: var(--overlay-default);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.gallery__wish {
  position: absolute;
  top: 14px;
  right: 14px;
}

.gallery__thumbs {
  display: flex;
  gap: 6px;
  padding-top: 10px;
}

.gallery__thumb {
  flex: 1;
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
  background: var(--surface-muted);
  opacity: 0.55;
  cursor: pointer;
  transition:
    border-color var(--dur-hover) var(--ease-brand),
    opacity var(--dur-hover) var(--ease-brand);
}

.gallery__thumb:hover {
  opacity: 0.85;
}

.gallery__thumb--active {
  border-color: var(--text-primary);
  opacity: 1;
}

.gallery__thumb:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

.gallery__thumb-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
