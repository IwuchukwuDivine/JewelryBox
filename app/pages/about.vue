<template>
  <main class="about">
    <ContentHero
      :image="heroImage"
      eyebrow="The House · Est. Lagos"
      title="Built for people who keep what they buy."
    />

    <AppContainer as="section" class="about__body">
      <ContentNumberedBlock
        v-for="(block, index) in BLOCKS"
        :key="block.number"
        v-reveal="index"
        :number="block.number"
        :title="block.title"
        :body="block.body"
      />

      <figure class="about__figure">
        <NuxtImg
          :src="editorialImage"
          alt="A gold piece from the house, photographed close."
          width="1200"
          height="900"
          sizes="xs:100vw sm:100vw md:704px lg:960px xl:1184px"
          fit="cover"
          loading="lazy"
        />
      </figure>

      <ContentPullQuote>
        &ldquo;Luxury you can experience, not just purchase.&rdquo;
      </ContentPullQuote>

      <div class="about__cta">
        <AppButton to="/">Enter the Collection</AppButton>
      </div>
    </AppContainer>
  </main>
</template>

<script setup lang="ts">
import { SITE_TAGLINE } from "~/utils/constants/brand";

/**
 * The house, in four movements. Copy is verbatim from the design prototype's
 * `aboutBlocks` — it is approved brand voice, not placeholder.
 */
const BLOCKS = [
  {
    number: "01",
    title: "Why we exist",
    body: "Owning something exceptional in Nigeria used to mean flying somewhere else to find it, and hoping it was real. We built JewelryBox so it does not.",
  },
  {
    number: "02",
    title: "What we select",
    body: "Watches with movements worth servicing. Stones graded on the same scale as diamond. Metal that is what it says it is. If we would not keep it, we do not list it.",
  },
  {
    number: "03",
    title: "How it arrives",
    body: "Sealed, insured, signed for. In a case designed to sit on a dresser for twenty years, with a certificate that says exactly what is inside.",
  },
  {
    number: "04",
    title: "Where we are going",
    body: "A house Nigerians recognise abroad. Private viewings in Lagos this year; Abuja next.",
  },
] as const;

/* Editorial frames from the mock library. Real photography replaces these at
   Phase F, at which point `mockImage` goes with them. */
const heroImage = mockImage(PHOTOS.editorial[1], 1600);
const editorialImage = mockImage(PHOTOS.editorial[3], 1200);

usePageSeo({
  title: "About the House",
  description:
    "JewelryBox is a Lagos house for certified wristwatches, fine jewelry and moissanite — selected to be kept, sealed, insured and signed for.",
  path: "/about",
  ogType: "article",
  ogImage: {
    card: "Campaign",
    props: {
      pill: "The House · Est. Lagos",
      title: "Built for people who keep what they buy.",
      description: SITE_TAGLINE,
    },
  },
  jsonLd: breadcrumbSchema([{ name: "About", path: "/about" }]),
});
</script>

<style scoped>
.about {
  padding-bottom: 64px;
}

.about__body {
  display: flex;
  flex-direction: column;
  gap: 36px;
  padding-top: 40px;
}

.about__figure {
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
}

.about__figure :deep(img) {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.about__cta {
  display: flex;
}

@media (min-width: 768px) {
  .about__body {
    gap: 48px;
    padding-top: 56px;
  }
}
</style>
