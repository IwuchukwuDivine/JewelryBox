<template>
  <section class="c-hero">
    <NuxtImg
      :src="image"
      :alt="alt"
      class="c-hero__image"
      width="1600"
      height="900"
      sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw xxl:100vw"
      fit="cover"
      preload
    />

    <div class="c-hero__veil" aria-hidden="true" />

    <div class="c-hero__body">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h1 class="display-heading c-hero__title">{{ title }}</h1>
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Full-bleed editorial hero — an image, a gradient that hands off to the page
 * surface, and the heading sitting on that hand-off.
 *
 * The prototype veils with a literal obsidian-to-background gradient. Here the
 * gradient is mixed from `--surface` instead, so the type lands on the page's
 * own ground in both themes and no colour is hardcoded.
 *
 * Height is fixed rather than aspect-driven: the image is absolutely
 * positioned inside it, so nothing shifts as it loads.
 */
withDefaults(
  defineProps<{
    image: string;
    title: string;
    eyebrow?: string;
    /** Decorative by default — the heading already carries the meaning. */
    alt?: string;
    height?: string;
  }>(),
  { alt: "", height: "520px" },
);
</script>

<style scoped>
.c-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: v-bind(height);
  overflow: hidden;
  padding: 0 20px 32px;
}

.c-hero__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: jbScale var(--dur-hero) var(--ease-brand) both;
}

.c-hero__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    color-mix(in srgb, var(--surface) 55%, transparent) 48%,
    var(--surface) 100%
  );
}

.c-hero__body {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 1280px;
  margin-inline: auto;
}

.c-hero__title {
  margin: 0;
  font-size: clamp(32px, 7vw, 44px);
  line-height: 1;
  text-wrap: balance;
}

@media (min-width: 768px) {
  .c-hero {
    padding: 0 32px 40px;
  }
}

@media (min-width: 1024px) {
  .c-hero {
    padding: 0 48px 48px;
  }

  .c-hero__title {
    max-width: 18ch;
  }
}
</style>
