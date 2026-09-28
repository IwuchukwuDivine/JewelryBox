<template>
  <AppContainer as="section" class="quote">
    <figure v-reveal class="luxe-card corner-brackets quote__card">
      <blockquote class="display-heading quote__text">
        &ldquo;Delivered to Abuja in two days, insured, with the certificate.
        Exactly as described.&rdquo;
      </blockquote>

      <figcaption class="quote__caption">
        <span>Tunde A. &middot; Abuja</span>
        <span class="mono-meta">Meridian 40</span>
      </figcaption>
    </figure>
  </AppContainer>
</template>

<script setup lang="ts">
/**
 * One customer line, set as editorial rather than as a review widget — no
 * stars, no avatar, no aggregate rating. The piece they bought is named in
 * mono at the foot, which is the only proof the design offers.
 */
</script>

<style scoped>
.quote {
  padding-top: 64px;
}

.quote__card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin: 0;
  padding: 28px 22px;
}

.quote__text {
  margin: 0;
  font-size: 21px;
  line-height: 1.35;
  text-wrap: pretty;
}

.quote__caption {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}

@media (min-width: 768px) {
  .quote {
    padding-top: 88px;
  }

  .quote__card {
    padding: 44px 40px;
  }

  .quote__text {
    max-width: 30ch;
    font-size: clamp(21px, 2.6vw, 30px);
  }
}
</style>
