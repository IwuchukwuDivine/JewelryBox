<template>
  <section class="band">
    <AppContainer class="band__inner">
      <div class="band__head">
        <span class="mono-meta band__meta">03 / Moissanite</span>
        <span class="mono-meta band__meta">SiC &middot; Lab-created</span>
      </div>

      <div v-reveal class="band__figure">
        <NuxtImg
          :src="STONE_IMAGE"
          alt="A moissanite link bracelet under raking light"
          width="800"
          height="800"
          sizes="xs:100vw sm:100vw md:50vw lg:600px xl:600px"
          loading="lazy"
          decoding="async"
          class="band__img"
        />
        <div class="band__frame" />
      </div>

      <div class="band__copy">
        <h2 v-reveal="1" class="display-heading band__title">
          More fire than diamond. Chosen on purpose.
        </h2>

        <dl v-reveal="2" class="hairline-table band__stats">
          <div v-for="stat in STATS" :key="stat.label" class="hairline-table__cell band__cell">
            <dt class="display-heading band__figure-value">{{ stat.value }}</dt>
            <dd class="mono-meta band__label">{{ stat.label }}</dd>
          </div>
        </dl>

        <NuxtLink class="text-link band__cta" to="/moissanite">
          Explore Moissanite &rarr;
        </NuxtLink>
      </div>
    </AppContainer>
  </section>
</template>

<script setup lang="ts">
import { PHOTOS, mockImage } from "~/utils/mock/images";

/**
 * The moissanite band — the one section that is dark in both themes.
 *
 * `#0B0A09` is the documented exception to the no-literals rule: the band is a
 * fixed editorial ground, not a surface, so it does not follow the theme. The
 * type and hairlines on it come from the bone/obsidian brand constants, which
 * are also theme-independent.
 */
const STONE_IMAGE = mockImage(PHOTOS.bracelets[1]!, 900);

const STATS = [
  { value: "2.65", label: "Refractive" },
  { value: "9.25", label: "Mohs" },
  { value: "D–F", label: "Colour" },
] as const;
</script>

<style scoped>
.band {
  margin: 64px 0 0;
  padding: 48px 0;
  /* The one documented literal: this ground is fixed in both themes. */
  background: #0b0a09;
  color: var(--color-bone);
}

.band__inner {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.band__head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.band__meta {
  letter-spacing: 0.14em;
  color: var(--color-bone-muted);
}

.band__figure {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid var(--color-obsidian-line);
}

.band__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.band__frame {
  position: absolute;
  inset: 10px;
  border: 1px solid color-mix(in srgb, var(--color-bone) 18%, transparent);
  pointer-events: none;
}

.band__title {
  margin: 0;
  font-size: 32px;
  line-height: 1.08;
  text-wrap: balance;
  color: var(--color-bone);
}

/* The hairline table's own colours follow the theme; on this fixed ground they
   have to be restated from the obsidian constants. */
.band__stats {
  grid-template-columns: repeat(3, 1fr);
  margin: 0;
  background: var(--color-obsidian-line);
  border-color: var(--color-obsidian-line);
  border-inline: 0;
}

.band__cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 12px;
  background: #0b0a09;
}

.band__figure-value {
  margin: 0;
  font-size: 24px;
  line-height: 1.1;
  color: var(--color-bone);
}

.band__label {
  margin: 0;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--color-bone-muted);
}

.band__cta {
  align-self: flex-start;
  color: var(--color-bone);
}

/* The copy column, so the figure can sit beside it at `md` without the
   heading, the stats and the link being spread down its full height. */
.band__copy {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

@media (min-width: 768px) {
  .band {
    margin-top: 88px;
    padding: 72px 0;
  }

  .band__inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-content: start;
    align-items: start;
    gap: 28px 48px;
  }

  .band__head {
    grid-column: 1 / -1;
  }

  .band__title {
    font-size: clamp(32px, 3.4vw, 44px);
  }
}
</style>
