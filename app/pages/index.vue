<template>
  <div class="coming-soon">
    <AppLogo variant="monogram" size="3.25rem" class="coming-soon__mark" />

    <p class="caption coming-soon__eyebrow">Opening soon</p>

    <h1 class="display-heading coming-soon__title">
      A private collection of luxury wristwatches
    </h1>

    <hr class="hairline coming-soon__rule">

    <p class="coming-soon__body">
      The house is still being assembled. Exceptional timepieces, fine jewelry
      and moissanite will be presented here shortly.
    </p>

    <p class="coming-soon__domain">JEWELRYBOX.NG</p>
  </div>
</template>

<script setup lang="ts">
import { SITE_TAGLINE } from "~/utils/constants/brand";

usePageSeo({
  title: "Luxury Wristwatches & Fine Jewelry",
  description:
    "A private collection of luxury wristwatches, fine jewelry and moissanite. Certified pieces, insured delivery across Nigeria. Opening soon.",
  path: "/",
  ogImage: {
    card: "Default",
    props: {
      pill: "Opening soon",
      title: SITE_TAGLINE,
      description:
        "Wristwatches, fine jewelry and moissanite. Certified, insured, delivered across Nigeria.",
    },
  },
  // Organization + WebSite are site-wide facts: declare them once, here.
  jsonLd: siteGraph(),
});
</script>

<style scoped>
.coming-soon {
  display: flex;
  min-height: 100dvh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 1.5rem;
  text-align: center;
}

.coming-soon__mark {
  margin-bottom: 2.5rem;
  color: var(--text-primary);
}

.coming-soon__eyebrow {
  margin: 0 0 2rem;
  color: var(--accent);
}

.coming-soon__title {
  max-width: 32rem;
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.25rem);
  line-height: 1.1;
}

.coming-soon__rule {
  width: 3rem;
  margin: 2.25rem 0;
}

.coming-soon__body {
  max-width: 26rem;
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.coming-soon__domain {
  margin: 4rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.18em;
  color: var(--text-muted);
}
</style>
