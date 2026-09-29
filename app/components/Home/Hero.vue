<template>
  <section class="hero">
    <div ref="parallax" class="hero__parallax">
      <div class="hero__frame">
        <NuxtImg
          :src="HERO_IMAGE"
          alt="A steel wristwatch resting on oxblood leather"
          width="1400"
          height="1750"
          sizes="xs:100vw sm:100vw md:100vw lg:100vw xl:100vw"
          preload
          fetchpriority="high"
          decoding="async"
          class="hero__img"
        />
      </div>
    </div>

    <div class="hero__veil" />
    <div class="inset-frame hero__inset" />

    <div class="hero__corners section-shell">
      <span class="mono-meta hero__corner">SS&middot;26 — EDIT 01</span>
      <span class="mono-meta hero__corner">LAGOS 6.45&deg;N 3.39&deg;E</span>
    </div>

    <div class="hero__cue" aria-hidden="true">
      <span class="hero__cue-line" />
      <span class="hero__cue-text">Scroll</span>
    </div>

    <div class="hero__body section-shell">
      <div class="hero__stack">
        <p class="eyebrow hero__eyebrow">Watches &middot; Fine Jewelry &middot; Moissanite</p>

        <h1 class="display-heading hero__title">Luxury,<br>Worn Close.</h1>

        <p class="hero__lede">
          Pieces chosen for how they feel years after the box is opened.
        </p>

        <div class="hero__actions">
          <AppButton to="/watches" variant="solid" class="hero__btn">
            Shop Watches
          </AppButton>
          <AppButton to="/jewelry" variant="outline" class="hero__btn">
            Explore Jewelry
          </AppButton>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { PHOTOS, mockImage } from "~/utils/mock/images";

/**
 * The 720px opening frame. It runs under the glass header by the header's own
 * height, so the image starts at the very top of the viewport.
 *
 * Two nested wrappers, on purpose: the inner one owns the `jbScale` settle
 * (1.04 → 1 over --dur-hero, per Brand Identity §07), the outer one carries
 * the scroll parallax. One element cannot hold both an animation and a
 * JS-written transform.
 *
 * TODO(Phase F): swap for real campaign photography.
 */
const HERO_IMAGE = mockImage(PHOTOS.watches[5]!, 1600);

const parallax = ref<HTMLElement | null>(null);
let detach: (() => void) | null = null;

onMounted(() => {
  // The whole effect is decoration; an OS opt-out removes it entirely rather
  // than merely shortening it.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let frame = 0;

  const paint = () => {
    frame = 0;
    const el = parallax.value;
    if (!el) return;
    const y = window.scrollY;
    el.style.transform = `translateY(${y * 0.3}px) scale(${1 + y / 2600})`;
  };

  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(paint);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  paint();

  detach = () => {
    window.removeEventListener("scroll", onScroll);
    if (frame) cancelAnimationFrame(frame);
  };
});

onBeforeUnmount(() => {
  detach?.();
  detach = null;
});
</script>

<style scoped>
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 720px;
  /* Runs under the glass header — 56px is the header's height. */
  margin-top: -56px;
  padding-bottom: 32px;
  overflow: hidden;
}

.hero__parallax,
.hero__frame {
  position: absolute;
  inset: 0;
}

.hero__parallax {
  will-change: transform;
}

.hero__frame {
  animation: jbScale var(--dur-hero) var(--ease-brand) both;
}

.hero__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.9;
}

/* Photograph → page. The top wash is the brand obsidian at 35%; the foot
   resolves to whatever the page ground is, so the hero has no visible seam. */
.hero__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-obsidian) 35%, transparent) 0%,
    transparent 30%,
    var(--surface) 100%
  );
}

/* The hairline clears the header band at the top. */
.hero__inset {
  inset: 68px 12px 12px;
}

.hero__corners {
  position: absolute;
  top: 72px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.hero__corner {
  letter-spacing: 0.08em;
  color: color-mix(in srgb, var(--color-bone) 75%, transparent);
}

.hero__cue {
  position: absolute;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.hero__cue-line {
  width: 1px;
  height: 48px;
  background: color-mix(in srgb, var(--color-bone) 40%, transparent);
}

.hero__cue-text {
  font-family: var(--font-mono);
  font-size: 9px;
  line-height: 1;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-bone) 60%, transparent);
  writing-mode: vertical-rl;
  animation: jbPulse 3s ease infinite;
}

.hero__body {
  position: relative;
}

.hero__stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 560px;
}

.hero__eyebrow,
.hero__title,
.hero__lede,
.hero__actions {
  animation: jbRise var(--dur-hero) var(--ease-brand) both;
}

.hero__eyebrow {
  margin: 0;
  animation-delay: 300ms;
}

.hero__title {
  margin: 0;
  font-size: clamp(44px, 6vw, 72px);
  line-height: 0.98;
  letter-spacing: 0;
  text-wrap: balance;
  animation-delay: 450ms;
}

.hero__lede {
  max-width: 280px;
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--text-secondary);
  animation-delay: 600ms;
}

.hero__actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  animation-delay: 750ms;
}

.hero__btn {
  flex: 1 1 0;
  padding-inline: 10px;
}

@media (min-width: 768px) {
  .hero {
    height: min(720px, 92vh);
    min-height: 620px;
    padding-bottom: 56px;
  }

  .hero__cue {
    right: 32px;
  }

  .hero__btn {
    flex: 0 0 auto;
    padding-inline: 24px;
  }
}

@media (min-width: 1024px) {
  .hero {
    height: min(820px, 94vh);
  }

  .hero__cue {
    right: 48px;
  }
}
</style>
