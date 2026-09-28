<template>
  <div
    class="flex min-h-dvh flex-col items-center justify-center px-6 py-20"
    style="background: var(--surface); color: var(--text-primary)"
  >
    <p
      class="mb-10 text-[0.7rem] font-medium tracking-[0.4em] uppercase"
      style="color: var(--text-muted)"
    >
      Jewelry Box
    </p>

    <h1 class="max-w-lg text-center text-3xl font-semibold tracking-tight sm:text-4xl">
      A private collection of luxury wristwatches
    </h1>

    <div
      class="my-8 h-px w-12"
      style="background: var(--border-default)"
      aria-hidden="true"
    />

    <p
      class="max-w-sm text-center text-sm leading-relaxed"
      style="color: var(--text-secondary)"
    >
      The house is still being assembled. Exceptional timepieces will be presented here shortly.
    </p>
  </div>
</template>

<script setup lang="ts">
useHead({
  htmlAttrs: {
    class: "dark",
  },
});

useSeoMeta({
  title: "Jewelry Box",
  description:
    "A private collection of luxury wristwatches. The house is still being assembled — we open soon.",
});
</script>
