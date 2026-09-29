<template>
  <img
    v-if="src"
    :src="src"
    :alt="name ? name : 'Profile photo'"
    class="avatar avatar--image"
  >
  <span v-else role="img" :aria-label="name ? name : 'Profile'" class="avatar">
    <span v-if="initials" aria-hidden="true">{{ initials }}</span>
    <lucide-user v-else :size="16" :stroke-width="1.5" aria-hidden="true" />
  </span>
</template>

<script setup lang="ts">
/**
 * Account mark. A photo when there is one, initials when there is not.
 *
 * The only round thing in the system — a face is the exception the 2px
 * radius makes room for.
 */
const props = withDefaults(
  defineProps<{
    src?: string;
    name?: string;
    /** Any CSS length. Sets both axes. */
    size?: string;
  }>(),
  { src: "", name: "", size: "40px" },
);

const initials = computed(() => {
  const words = props.name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => (word[0] ?? "").toUpperCase())
    .join("");
});
</script>

<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: v-bind(size);
  height: v-bind(size);
  border-radius: 50%;
  border: 1px solid var(--border-default);
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-family: var(--font-display);
  font-weight: 400;
  font-size: calc(v-bind(size) * 0.36);
  line-height: 1;
  letter-spacing: 0.02em;
  overflow: hidden;
  user-select: none;
}

.avatar--image {
  object-fit: cover;
}
</style>
