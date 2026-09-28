<template>
  <div v-if="announcement" class="announcement">
    <p class="announcement__text">{{ announcement.message }}</p>
  </div>
</template>

<script setup lang="ts">
const { data, suspense } = useActiveAnnouncementQuery();

// Resolved on the server so the bar is in the first paint. Without this the
// banner pops in after hydration and pushes the whole page down — the exact
// layout shift the launch checklist calls out. The query swallows its own
// errors, so this can only resolve.
await suspense();

const announcement = computed(() => data.value ?? null);
</script>

<style scoped>
.announcement {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 9px 20px;
  background: var(--surface-muted);
  border-bottom: 1px solid var(--border-default);
  text-align: center;
}

.announcement__text {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
</style>
