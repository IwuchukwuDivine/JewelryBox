<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
    <h1 class="text-2xl font-semibold">Nuxt Template</h1>
    <p class="max-w-md text-center text-sm" style="color: var(--text-secondary)">
      Start building — see the README for what each folder is for.
    </p>
    <button
      class="cursor-pointer rounded-xl px-6 py-3 text-sm font-semibold"
      style="background: var(--color-primary); color: var(--text-on-primary)"
      @click="useToast('success', 'Toast system is working!')"
    >
      Test toast
    </button>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: "Home",
  description: "",
});
</script>
