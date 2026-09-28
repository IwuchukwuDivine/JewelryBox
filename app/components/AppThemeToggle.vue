<template>
  <button
    type="button"
    class="theme-toggle"
    aria-label="Switch between light and dark"
    @click="toggle"
  >
    <lucide-sun :size="16" :stroke-width="1.5" class="theme-toggle__sun" />
    <lucide-moon :size="16" :stroke-width="1.5" class="theme-toggle__moon" />
  </button>
</template>

<script setup lang="ts">
/**
 * Light / dark switch.
 *
 * The server cannot know the visitor's stored theme, so nothing here may
 * depend on `isDark` at render time — the markup is identical on both
 * sides and the icons are swapped purely in CSS off `html.dark`. Reading
 * the reactive value here instead would hydrate-mismatch on every visit
 * that is not the default theme.
 */
const { toggle } = useTheme();
</script>

<style scoped>
.theme-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-brand);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    color var(--dur-hover) var(--ease-brand),
    border-color var(--dur-hover) var(--ease-brand);
}

.theme-toggle:hover {
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--ring-default);
  outline-offset: 2px;
}

.theme-toggle__sun,
.theme-toggle__moon {
  position: absolute;
  transition:
    opacity var(--dur-hover) var(--ease-brand),
    transform var(--dur-hover) var(--ease-brand);
}

/* Light is the document default: show the moon (the thing you can switch to). */
.theme-toggle__sun {
  opacity: 0;
  transform: rotate(-90deg) scale(0.5);
}
.theme-toggle__moon {
  opacity: 1;
  transform: none;
}

:global(html.dark) .theme-toggle__sun {
  opacity: 1;
  transform: none;
}
:global(html.dark) .theme-toggle__moon {
  opacity: 0;
  transform: rotate(90deg) scale(0.5);
}
</style>
