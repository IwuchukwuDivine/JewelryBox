<template>
  <div class="auth-shell">
    <AppThemeToggle class="auth-shell__theme" />

    <header class="auth-shell__head">
      <AppLogo to="/" size="26px" />
      <p class="mono-meta auth-shell__line">Private client access</p>
    </header>

    <main class="auth-shell__main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * The layout every `/auth/*` page sits in.
 *
 * One column, nothing else on screen: the wordmark leads home, the card
 * holds the form, and the theme switch floats clear of both so it never
 * enters the tab order between a field and its button.
 */
</script>

<style scoped>
.auth-shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  min-height: 100dvh;
  padding: 48px 20px 64px;
  background: var(--surface);
}

.auth-shell__theme {
  position: fixed;
  top: calc(16px + var(--top));
  right: calc(16px + var(--right));
  z-index: var(--z-sticky);
}

.auth-shell__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.auth-shell__line {
  margin: 0;
}

.auth-shell__main {
  display: flex;
  justify-content: center;
  width: 100%;
}

/*
 * app.vue wraps <NuxtPage> in <main id="main-content">, so the slot's child is
 * that wrapper rather than the card. As a flex item it is shrink-to-fit, which
 * centres only while the page's content happens to be narrow — one wide
 * descendant and it stretches, leaving the card hard against the left edge.
 * Making the wrapper itself a full-width centring container removes the
 * dependency on what the page contains.
 */
.auth-shell__main > :deep(*) {
  display: flex;
  justify-content: center;
  width: 100%;
}

@media (min-width: 768px) {
  .auth-shell {
    gap: 40px;
    padding-top: 72px;
  }
}
</style>
