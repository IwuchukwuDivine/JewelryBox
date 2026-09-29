<template>
  <a href="#main-content" class="skip-link">Skip to content</a>
  <AppToast />
  <NuxtLayout>
    <main id="main-content">
      <NuxtPage />
    </main>
  </NuxtLayout>
  <AppConsentBanner />
</template>

<script setup lang="ts">
// Nothing is gated behind a `mounted` flag here. The previous
// `v-show="mounted"` wrapper server-rendered every page with
// `display: none`, which delays LCP until hydration and is a rendering
// risk for crawlers. Components that genuinely depend on browser-only or
// persisted state belong in <ClientOnly>, not the whole app.
</script>
