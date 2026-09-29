<template>
  <div class="c-prose">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * Typography for written pages — shipping, privacy, terms.
 *
 * The page writes plain `<h2>`, `<p>`, `<ul>` and this sets the measure and
 * the rhythm once, so three legal routes cannot drift apart. `:deep` rather
 * than `:slotted` because the rules have to reach nested list items too.
 */
</script>

<style scoped>
.c-prose {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.c-prose :deep(section) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.c-prose :deep(h2) {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 400;
  letter-spacing: 0.01em;
  font-size: 22px;
  line-height: 1.2;
  color: var(--text-primary);
}

.c-prose :deep(h3) {
  margin: 12px 0 0;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-primary);
}

.c-prose :deep(p) {
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.c-prose :deep(ul),
.c-prose :deep(ol) {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.c-prose :deep(li) {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.c-prose :deep(li)::marker {
  color: var(--accent);
}

.c-prose :deep(strong) {
  font-weight: 500;
  color: var(--text-primary);
}

.c-prose :deep(a) {
  color: var(--text-primary);
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-color: var(--accent);
  transition: opacity var(--dur-hover) var(--ease-brand);
}

.c-prose :deep(a):hover {
  opacity: 0.7;
}

.c-prose :deep(hr) {
  border: 0;
  height: 1px;
  background: var(--border-default);
}
</style>
