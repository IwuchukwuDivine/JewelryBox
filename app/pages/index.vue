<template>
  <main class="home">
    <HomeHero />
    <HomeCategoryTiles />
    <HomeFeaturedRail />
    <HomeMoissaniteBand />
    <HomeCuratedList />
    <HomeTestimonial />
    <HomeNewsletter />
    <HomeRecentlyViewed />
  </main>
</template>

<script setup lang="ts">
import { SITE_TAGLINE } from "~/utils/constants/brand";

/**
 * The home page, in the prototype's order: hero → the lines → the watch edit →
 * moissanite → curated edits → one customer line → the letter → what you have
 * already seen.
 *
 * Every section that carries data resolves it on the server (`await
 * suspense()`), so the first paint is complete and nothing reflows in after
 * hydration.
 */
usePageSeo({
  title: "Luxury Wristwatches & Fine Jewelry",
  description:
    "Luxury wristwatches, fine jewelry and moissanite, chosen for how they feel years later. Certified pieces, insured delivery across Nigeria.",
  path: "/",
  ogImage: {
    card: "Default",
    props: {
      pill: "SS·26 — Edit 01",
      title: "Luxury, Worn Close.",
      description: SITE_TAGLINE,
    },
  },
  // Organization + WebSite are site-wide facts: declare them once, here.
  jsonLd: siteGraph(),
});
</script>

<style scoped>
.home {
  /* The footer opens with its own rule, so the page only needs the last
     section's breathing room. */
  padding-bottom: 8px;
}
</style>
