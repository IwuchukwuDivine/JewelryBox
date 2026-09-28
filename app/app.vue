<template>
  <a href="#main-content" class="skip-link">Skip to content</a>
  <div v-show="mounted">
    <AppToast />
    <NuxtLayout>
      <main id="main-content">
        <NuxtPage />
      </main>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
const mounted = useMounted();
</script>
