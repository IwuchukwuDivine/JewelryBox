<template>
  <div class="shell">
    <LayoutAnnouncementBar />
    <LayoutHeader />

    <slot />

    <LayoutFooter />

    <ClientOnly>
      <LayoutMobileNav />
      <LayoutCartDrawer />
      <ShopSearchOverlay />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.shell > :slotted(*) {
  flex: 1;
}
</style>
